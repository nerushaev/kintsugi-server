const path = require("path");
const axios = require("axios");
const mongoose = require("mongoose");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const Product = require("../models/product");

const { DB_HOST, POSTER_URL_API, POSTER_ACCESS_TOKEN } = process.env;

const applyChanges = process.argv.includes("--apply");
const expectedChangesArgument = process.argv.find((argument) =>
  argument.startsWith("--expected-changes=")
);
const expectedChanges = expectedChangesArgument
  ? Number(expectedChangesArgument.split("=")[1])
  : null;

const normalizeBarcode = (value) => String(value || "").trim();

const loadPosterProducts = async () => {
  const baseUrl = String(POSTER_URL_API || "").replace(/\/$/, "");
  const { data } = await axios.get(`${baseUrl}/menu.getProducts`, {
    params: { token: POSTER_ACCESS_TOKEN },
    timeout: 30000,
  });

  if (data?.error || !Array.isArray(data?.response)) {
    throw new Error(
      `Poster menu.getProducts failed: ${data?.error?.message || "invalid response"}`
    );
  }

  return data.response;
};

const main = async () => {
  mongoose.set("strictQuery", true);

  if (!DB_HOST || !POSTER_URL_API || !POSTER_ACCESS_TOKEN) {
    throw new Error("DB_HOST and Poster API environment variables are required");
  }

  const posterProducts = await loadPosterProducts();
  const posterById = new Map(
    posterProducts.map((product) => [String(product.product_id), product])
  );

  await mongoose.connect(DB_HOST);
  const localProducts = await Product.find(
    { product_id: { $exists: true, $ne: "" } },
    "product_id product_name barcode modifications"
  ).lean();

  const operations = [];
  const changes = [];
  const changedProductIds = new Set();
  const missingInPoster = [];
  let withoutPosterBarcode = 0;
  let posterModifications = 0;
  let changedModificationBarcodes = 0;
  let unchangedModificationBarcodes = 0;
  let withoutModificationBarcode = 0;
  let missingLocalModifications = 0;
  let unchangedProducts = 0;

  for (const product of localProducts) {
    const posterProduct = posterById.get(String(product.product_id));
    if (!posterProduct) {
      missingInPoster.push({
        product_id: product.product_id,
        product_name: product.product_name,
      });
      continue;
    }

    const productBarcode = normalizeBarcode(posterProduct.barcode);
    if (!productBarcode) {
      withoutPosterBarcode += 1;
    } else {
      const previousBarcode = normalizeBarcode(product.barcode);
      if (previousBarcode === productBarcode) {
        unchangedProducts += 1;
      } else {
        changedProductIds.add(String(product.product_id));
        changes.push({
          type: "product",
          product_id: product.product_id,
          product_name: product.product_name,
          previousBarcode: previousBarcode || null,
          posterBarcode: productBarcode,
        });
        operations.push({
          updateOne: {
            filter: { _id: product._id },
            update: { $set: { barcode: productBarcode } },
          },
        });
      }
    }

    const localModifications = Array.isArray(product.modifications)
      ? product.modifications
      : [];
    const localByIngredientId = new Map(
      localModifications.map((modification) => [
        String(modification.ingredient_id),
        modification,
      ])
    );
    const posterModificationsList = Array.isArray(posterProduct.modifications)
      ? posterProduct.modifications
      : [];

    for (const posterModification of posterModificationsList) {
      posterModifications += 1;
      const ingredientId = String(posterModification.ingredient_id || "");
      const modificationBarcode = normalizeBarcode(
        posterModification.modificator_barcode
      );
      if (!modificationBarcode) {
        withoutModificationBarcode += 1;
        continue;
      }

      const localModification = localByIngredientId.get(ingredientId);
      if (!localModification) {
        missingLocalModifications += 1;
        continue;
      }

      const previousBarcode = normalizeBarcode(localModification.barcode);
      if (previousBarcode === modificationBarcode) {
        unchangedModificationBarcodes += 1;
        continue;
      }

      const numericIngredientId = Number(ingredientId);
      const ingredientIds = Number.isFinite(numericIngredientId)
        ? [ingredientId, numericIngredientId]
        : [ingredientId];
      changedProductIds.add(String(product.product_id));
      changedModificationBarcodes += 1;
      changes.push({
        type: "modification",
        product_id: product.product_id,
        product_name: product.product_name,
        ingredient_id: ingredientId,
        modificator_name: posterModification.modificator_name,
        previousBarcode: previousBarcode || null,
        posterBarcode: modificationBarcode,
      });
      operations.push({
        updateOne: {
          filter: {
            _id: product._id,
            "modifications.ingredient_id": { $in: ingredientIds },
          },
          update: {
            $set: { "modifications.$.barcode": modificationBarcode },
          },
        },
      });
    }
  }

  if (applyChanges && (!Number.isInteger(expectedChanges) || expectedChanges < 0)) {
    throw new Error(
      "Apply requires --expected-changes=<dry-run changedBarcodes>"
    );
  }
  if (applyChanges && expectedChanges !== operations.length) {
    throw new Error(
      `Refusing apply: expected ${expectedChanges} changes, fresh Poster data produced ${operations.length}`
    );
  }

  let modifiedProducts = 0;
  if (applyChanges && operations.length > 0) {
    const result = await Product.bulkWrite(operations, { ordered: false });
    modifiedProducts = result.modifiedCount;
  }

  console.log(
    JSON.stringify(
      {
        mode: applyChanges ? "apply" : "dry-run",
        posterProducts: posterProducts.length,
        localProducts: localProducts.length,
        changedProducts: changedProductIds.size,
        changedBarcodes: changes.length,
        changedModificationBarcodes,
        modifiedProducts,
        unchangedProducts,
        withoutPosterBarcode,
        posterModifications,
        unchangedModificationBarcodes,
        withoutModificationBarcode,
        missingLocalModifications,
        missingInPoster: missingInPoster.length,
        missingInPosterSample: missingInPoster.slice(0, 20),
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
