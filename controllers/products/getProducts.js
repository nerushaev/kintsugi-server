const Product = require("../../models/product");
const {
  WEBSITE_PRODUCT_FILTER,
  ACTIVE_INVENTORY_FILTER,
  isWebsiteCategory,
} = require("../../helpers/productVisibility");

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const MISSING_PHOTO_FILTER = {
  $and: [
    { $or: [{ photo: { $exists: false } }, { photo: null }, { photo: "" }] },
    {
      $or: [
        { photo_origin: { $exists: false } },
        { photo_origin: null },
        { photo_origin: "" },
      ],
    },
    {
      $or: [
        { photo_extra: { $exists: false } },
        { photo_extra: null },
        { photo_extra: { $size: 0 } },
      ],
    },
  ],
};

const MISSING_DESCRIPTION_FILTER = {
  $or: [
    { description: { $exists: false } },
    { description: null },
    { description: { $not: /\S/ } },
  ],
};

const appendFilter = (match, filter) => {
  match.$and = [...(match.$and || []), filter];
};

const parsePositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getContentPriorityIds = async () => {
  const products = await Product.find(
    ACTIVE_INVENTORY_FILTER,
    "product_id photo photo_origin photo_extra description"
  ).lean();
  const criticalIds = new Set();
  products.forEach((product) => {
    const hasImage = Boolean(
      product.photo ||
        product.photo_origin ||
        (Array.isArray(product.photo_extra) && product.photo_extra.length)
    );
    const hasDescription =
      typeof product.description === "string" &&
      product.description.trim().length > 0;
    if (!hasImage || !hasDescription) criticalIds.add(product.product_id);
  });

  return [...criticalIds];
};

const buildSearchStage = (search) => ({
  $search: {
    index: "search",
    text: {
      query: search,
      path: "product_name",
      fuzzy: {
        maxEdits: 2,
        prefixLength: 1,
      },
    },
  },
});

const getProducts = async (req, res) => {
  const page = parsePositiveInteger(req.query.page, 1);
  const limit = Math.min(
    parsePositiveInteger(req.query.limit, DEFAULT_LIMIT),
    MAX_LIMIT
  );
  const skip = (page - 1) * limit;
  const search = String(req.query.search || "").trim();
  const price = req.query.price;
  const contentStatus = req.query.contentStatus || req.query.contentIssue;
  const sortByContentIssues = req.query.sortByContentIssues === "true";
  const characteristicsReview = req.query.characteristicsReview;
  const { category } = req.params;

  const match = req.adminScope
    ? { ...ACTIVE_INVENTORY_FILTER }
    : {
        ...WEBSITE_PRODUCT_FILTER,
        amount: { $gt: 0 },
        price: { $gt: 3000 },
        comingSoon: { $exists: false },
      };

  if (category) {
    match.category_name = isWebsiteCategory(category)
      ? category
      : { $in: [] };
  }

  if (req.adminScope && characteristicsReview === "auto") {
    match.characteristicsReviewStatus = "auto";
  }

  if (req.adminScope) {
    if (contentStatus === "attention") {
      appendFilter(match, {
        $and: [
          { websiteHidden: { $ne: true } },
          { $or: [MISSING_PHOTO_FILTER, MISSING_DESCRIPTION_FILTER] },
        ],
      });
    } else if (contentStatus === "missingPhoto") {
      appendFilter(match, {
        $and: [
          { websiteHidden: { $ne: true } },
          MISSING_PHOTO_FILTER,
        ],
      });
    } else if (contentStatus === "missingDescription") {
      appendFilter(match, {
        $and: [
          { websiteHidden: { $ne: true } },
          MISSING_DESCRIPTION_FILTER,
        ],
      });
    } else if (contentStatus === "ready") {
      appendFilter(match, {
        $and: [
          { websiteHidden: { $ne: true } },
          { $nor: [MISSING_PHOTO_FILTER, MISSING_DESCRIPTION_FILTER] },
        ],
      });
    } else if (contentStatus === "hidden") {
      appendFilter(match, { websiteHidden: true });
    }
  }

  const priceSort = price === "low" ? 1 : price === "high" ? -1 : null;
  const criticalIds = sortByContentIssues ? await getContentPriorityIds() : [];

  const pipeline = [];
  if (search) pipeline.push(buildSearchStage(search));
  pipeline.push({ $match: match });

  if (criticalIds.length) {
    pipeline.push({
      $set: {
        _contentIssuePriority: {
          $switch: {
            branches: [
              { case: { $in: ["$product_id", criticalIds] }, then: 0 },
            ],
            default: 1,
          },
        },
      },
    });
  }

  const sort = {};
  if (criticalIds.length) sort._contentIssuePriority = 1;
  if (priceSort) sort.price = priceSort;
  if (!priceSort) {
    sort.createdAt = -1;
    sort._id = -1;
  }

  pipeline.push(
    { $sort: sort },
    {
      $facet: {
        items: [
          { $skip: skip },
          { $limit: limit },
          { $unset: "_contentIssuePriority" },
        ],
        pagination: [{ $count: "totalItems" }],
      },
    }
  );

  const [result] = await Product.aggregate(pipeline);
  const totalItems = result.pagination[0]?.totalItems || 0;

  res.json({
    products: result.items,
    totalItems,
    totalPages: Math.max(Math.ceil(totalItems / limit), 1),
    currentPage: page,
    pageSize: limit,
  });
};

module.exports = getProducts;
