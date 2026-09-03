const path = require("path");
const axios = require("axios");
const mongoose = require("mongoose");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const Product = require("../models/product");
const {
  WEBSITE_EXCLUDED_CATEGORIES,
} = require("../helpers/productVisibility");

const {
  DB_HOST,
  POSTER_URL_API,
  POSTER_ACCESS_TOKEN,
} = process.env;

const applyChanges = process.argv.includes("--apply");
const expectedChangesArgument = process.argv.find((argument) =>
  argument.startsWith("--expected-changes=")
);
const expectedChanges = expectedChangesArgument
  ? Number(expectedChangesArgument.split("=")[1])
  : null;

const normalizeName = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("uk-UA");

const normalizeAmount = (value) =>
  Math.max(0, Math.floor(Number(value) || 0));

const loadPosterLeftovers = async () => {
  const baseUrl = String(POSTER_URL_API || "").replace(/\/$/, "");
  const { data } = await axios.get(`${baseUrl}/storage.getStorageLeftovers`, {
    params: {
      token: POSTER_ACCESS_TOKEN,
      zero_leftovers: true,
    },
    timeout: 30000,
  });

  if (data?.error || !Array.isArray(data?.response)) {
    throw new Error(
      `Poster storage.getStorageLeftovers failed: ${data?.error?.message || "invalid response"}`
    );
  }

  return data.response;
};

const main = async () => {
  mongoose.set("strictQuery", true);

  if (!DB_HOST || !POSTER_URL_API || !POSTER_ACCESS_TOKEN) {
    throw new Error("DB_HOST and Poster API environment variables are required");
  }

  const leftovers = await loadPosterLeftovers();
  const productLeftovers = leftovers.filter(
    (item) => String(item.ingredients_type) === "2"
  );
  await mongoose.connect(DB_HOST);

  const products = await Product.find(
    {
      posterArchived: { $ne: true },
      websiteHidden: { $ne: true },
      category_name: { $nin: WEBSITE_EXCLUDED_CATEGORIES },
      comingSoon: { $exists: false },
      price: { $gt: 3000 },
    },
    "product_id product_name price amount modifications"
  ).lean();

  const leftoversById = new Map(
    productLeftovers.map((item) => [String(item.ingredient_id), item])
  );
  const leftoversByName = new Map();

  productLeftovers.forEach((item) => {
    const name = normalizeName(item.ingredient_name);
    if (!name) return;
    const matches = leftoversByName.get(name) || [];
    matches.push(item);
    leftoversByName.set(name, matches);
  });

  const operations = [];
  const unmatched = [];
  const changes = [];
  let matchedProducts = 0;
  let simpleProducts = 0;
  let productsWithModifications = 0;
  let matchedModificationElements = 0;
  let changedProducts = 0;
  let increasedProducts = 0;
  let decreasedProducts = 0;
  let zeroedProducts = 0;

  products.forEach((product) => {
    const modifications = Array.isArray(product.modifications)
      ? product.modifications
      : [];

    if (modifications.length > 0) {
      const missingModificationIds = modifications
        .filter((item) => !leftoversById.has(String(item.ingredient_id)))
        .map((item) => String(item.ingredient_id));

      if (missingModificationIds.length > 0) {
        unmatched.push({
          product_id: product.product_id,
          product_name: product.product_name,
          missingModificationIds,
        });
        return;
      }

      const updatedModifications = modifications.map((item) => {
        const leftover = leftoversById.get(String(item.ingredient_id));
        return {
          ...item,
          size_left: normalizeAmount(leftover.ingredient_left),
        };
      });
      const amount = updatedModifications.reduce(
        (sum, item) => sum + normalizeAmount(item.size_left),
        0
      );

      productsWithModifications += 1;
      matchedModificationElements += modifications.length;
      matchedProducts += 1;
      const previousAmount = normalizeAmount(product.amount);
      const changed =
        amount !== normalizeAmount(product.amount) ||
        updatedModifications.some(
          (item, index) =>
            normalizeAmount(item.size_left) !==
            normalizeAmount(modifications[index]?.size_left)
        );

      if (changed) {
        changedProducts += 1;
        if (amount > previousAmount) increasedProducts += 1;
        if (amount < previousAmount) decreasedProducts += 1;
        if (previousAmount > 0 && amount === 0) zeroedProducts += 1;
        changes.push({
          product_id: product.product_id,
          product_name: product.product_name,
          previousAmount,
          posterAmount: amount,
        });
        operations.push({
          updateOne: {
            filter: { _id: product._id },
            update: { $set: { amount, modifications: updatedModifications } },
          },
        });
      }
      return;
    }

    const nameMatches = leftoversByName.get(normalizeName(product.product_name)) || [];
    const leftover =
      nameMatches.length === 1
        ? nameMatches[0]
        : leftoversById.get(String(product.product_id));

    if (!leftover) {
      unmatched.push({ product_id: product.product_id, product_name: product.product_name });
      return;
    }

    const amount = normalizeAmount(leftover.ingredient_left);
    simpleProducts += 1;
    matchedProducts += 1;
    const previousAmount = normalizeAmount(product.amount);
    if (amount !== previousAmount) {
      changedProducts += 1;
      if (amount > previousAmount) increasedProducts += 1;
      if (amount < previousAmount) decreasedProducts += 1;
      if (previousAmount > 0 && amount === 0) zeroedProducts += 1;
      changes.push({
        product_id: product.product_id,
        product_name: product.product_name,
        previousAmount,
        posterAmount: amount,
      });
      operations.push({
        updateOne: {
          filter: { _id: product._id },
          update: { $set: { amount } },
        },
      });
    }
  });

  let modifiedCount = 0;
  if (applyChanges && (!Number.isInteger(expectedChanges) || expectedChanges < 0)) {
    throw new Error(
      "Apply requires --expected-changes=<dry-run changedProducts>"
    );
  }
  if (applyChanges && expectedChanges !== operations.length) {
    throw new Error(
      `Refusing apply: expected ${expectedChanges} changes, fresh Poster data produced ${operations.length}`
    );
  }
  if (applyChanges && operations.length > 0) {
    const result = await Product.bulkWrite(operations, { ordered: false });
    modifiedCount = result.modifiedCount;
  }

  console.log(
    JSON.stringify(
      {
        mode: applyChanges ? "apply" : "dry-run",
        posterLeftovers: leftovers.length,
        posterProductLeftovers: productLeftovers.length,
        ignoredNonProductLeftovers: leftovers.length - productLeftovers.length,
        localProducts: products.length,
        matchedProducts,
        simpleProducts,
        productsWithModifications,
        matchedModificationElements,
        changedProducts,
        increasedProducts,
        decreasedProducts,
        zeroedProducts,
        modifiedProducts: modifiedCount,
        unmatchedProducts: unmatched.length,
        unmatchedSample: unmatched.slice(0, 20),
        zeroedChanges: changes.filter(
          (change) => change.previousAmount > 0 && change.posterAmount === 0
        ),
        increasedChanges: changes.filter(
          (change) => change.posterAmount > change.previousAmount
        ),
        changesSample: changes.slice(0, 30),
      },
      null,
      2
    )
  );
};

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
