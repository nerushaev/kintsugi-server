const SITE_URL = "https://kintsugi.org.ua";
const POSTER_IMAGE_URL = "https://kintsugi.joinposter.com";
const FALLBACK_IMAGE_MARKER = "image_not_found_wruanw";
const STORE_COLLECTION_LABEL = "Kintsugi Select";
const SIZE_VARIANT_CATEGORIES = new Set(["Косплей", "Lolita fashion"]);

const CATEGORY_SLUGS = {
  Косплей: "cosplay",
  Перуки: "wigs",
  Аксесуари: "accessories",
  Мерч: "merch",
  "Lolita fashion": "lolita-fashion",
  "Катани, мечі, зброя": "katanas-swords-weapons",
  "K-pop": "k-pop",
  Фігурки: "figures",
  "Акрилові стенди": "acrylic-stands",
  "Рюкзаки, сумки": "backpacks-bags",
  Лінзи: "lenses",
};

const stripInvalidXmlCharacters = (value) =>
  String(value || "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uD800-\uDFFF]/g, "");

const decodeNumericEntity = (rawCode, radix) => {
  const codePoint = Number.parseInt(rawCode, radix);
  if (
    !Number.isFinite(codePoint) ||
    codePoint < 0 ||
    codePoint > 0x10ffff ||
    (codePoint >= 0xd800 && codePoint <= 0xdfff)
  ) {
    return "";
  }
  return String.fromCodePoint(codePoint);
};

const decodeHtmlEntities = (value) =>
  value
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => decodeNumericEntity(code, 16))
    .replace(/&#(\d+);/g, (_match, code) => decodeNumericEntity(code, 10))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'");

const normalizeText = (value) =>
  stripInvalidXmlCharacters(decodeHtmlEntities(String(value || "")))
    .replace(/\s+/g, " ")
    .trim();

const toPlainText = (value) =>
  normalizeText(
    String(value || "")
      .replace(/<\s*br\s*\/?>/gi, " ")
      .replace(/<\/\s*(p|div|li|h[1-6])\s*>/gi, " ")
      .replace(/<[^>]*>/g, " ")
  );

const escapeXml = (value) =>
  stripInvalidXmlCharacters(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const asPositiveMoney = (value) => {
  const kopecks = Number(value);
  return Number.isFinite(kopecks) && kopecks > 0
    ? `${(kopecks / 100).toFixed(2)} UAH`
    : null;
};

const hasValidGtinChecksum = (value) => {
  if (!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(value)) return false;
  const digits = [...value].map(Number);
  const checkDigit = digits.pop();
  const sum = digits
    .reverse()
    .reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === checkDigit;
};

const normalizeGtin = (value) => {
  const normalized = String(value || "").replace(/\s+/g, "");
  return hasValidGtinChecksum(normalized) ? normalized : undefined;
};

const normalizeImageUrl = (value) => {
  const raw = String(value || "").trim();
  if (!raw || raw.includes(FALLBACK_IMAGE_MARKER)) return null;
  const absolute = raw.startsWith("/")
    ? `${POSTER_IMAGE_URL}${raw}`
    : raw.replace(/^http:\/\//i, "https://");
  try {
    const parsed = new URL(absolute);
    return parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
};

const getMainImage = (product) => {
  const systemImage = product.photo_origin || product.photo;
  const normalizedSystemImage = normalizeImageUrl(systemImage);
  if (normalizedSystemImage) return normalizedSystemImage;
  return (Array.isArray(product.photo_extra) ? product.photo_extra : [])
    .map(normalizeImageUrl)
    .find(Boolean) || null;
};

const getProductLink = (product) => {
  const categorySlug = CATEGORY_SLUGS[product.category_name];
  const productId = String(product.product_id || "").trim();
  return categorySlug && productId
    ? `${SITE_URL}/${categorySlug}/${encodeURIComponent(productId)}`
    : null;
};

const compactOptionalFields = (product, gtin) => {
  const brand = normalizeText(product.brand);
  const mpn = normalizeText(product.mpn);
  const color = normalizeText(product.color);
  const googleProductCategory = normalizeText(product.google_product_category);
  const productType = normalizeText(product.product_type || product.category_name);
  return {
    ...(brand && { brand }),
    ...(mpn && { mpn }),
    ...(gtin && { gtin }),
    ...(color && { color }),
    ...(googleProductCategory && { googleProductCategory }),
    ...(productType && { productType }),
    ...(!brand && !mpn && !gtin && { identifierExists: false }),
  };
};

const mapProductToMerchantItems = (product) => {
  const id = String(product.product_id || "").trim();
  const title = normalizeText(product.product_name);
  const link = getProductLink(product);
  const imageLink = getMainImage(product);
  const basePrice = asPositiveMoney(product.price);
  if (!id || !title || !link || !imageLink || !basePrice) return [];

  const description = (
    toPlainText(product.description) || `${title}. Категорія: ${normalizeText(product.category_name)}.`
  ).slice(0, 5000);
  const base = {
    description,
    link,
    imageLink,
    condition: "new",
    customLabel0: STORE_COLLECTION_LABEL,
  };
  const modifications = Array.isArray(product.modifications)
    ? product.modifications
    : [];

  if (SIZE_VARIANT_CATEGORIES.has(product.category_name) && modifications.length) {
    return modifications.flatMap((modification) => {
      const variantId = String(modification.ingredient_id || "").trim();
      const size = normalizeText(modification.modificator_name);
      const price = asPositiveMoney(modification.modificator_price || product.price);
      if (!variantId || !size || !price) return [];
      const gtin = normalizeGtin(modification.barcode);
      return [{
        ...base,
        id: `${id}-${variantId}`,
        itemGroupId: id,
        title: `${title} – ${size}`,
        size,
        availability: Number(modification.size_left) > 0 ? "in_stock" : "out_of_stock",
        price,
        ...compactOptionalFields(product, gtin),
      }];
    });
  }

  const gtin = normalizeGtin(product.barcode);
  return [{
    ...base,
    id,
    title,
    availability: Number(product.amount) > 0 ? "in_stock" : "out_of_stock",
    price: basePrice,
    ...compactOptionalFields(product, gtin),
  }];
};

const tag = (name, value) =>
  value === undefined || value === null || value === ""
    ? ""
    : `<g:${name}>${escapeXml(String(value))}</g:${name}>`;

const serializeMerchantItem = (item) => {
  const fields = [
    tag("id", item.id),
    tag("title", item.title),
    tag("description", item.description),
    tag("link", item.link),
    tag("image_link", item.imageLink),
    tag("availability", item.availability),
    tag("price", item.price),
    tag("condition", item.condition),
    tag("brand", item.brand),
    tag("gtin", item.gtin),
    tag("mpn", item.mpn),
    tag("identifier_exists", item.identifierExists === false ? "no" : undefined),
    tag("google_product_category", item.googleProductCategory),
    tag("product_type", item.productType),
    tag("custom_label_0", item.customLabel0),
    tag("color", item.color),
    tag("item_group_id", item.itemGroupId),
    tag("size", item.size),
  ].filter(Boolean);

  return `    <item>\n${fields.map((field) => `      ${field}`).join("\n")}\n    </item>`;
};

const serializeGoogleMerchantFeed = (items) => `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Kintsugi</title>
    <link>${SITE_URL}</link>
    <description>Актуальні товари інтернет-магазину Kintsugi</description>
${items.map(serializeMerchantItem).join("\n")}
  </channel>
</rss>`;

module.exports = {
  escapeXml,
  mapProductToMerchantItems,
  normalizeGtin,
  serializeGoogleMerchantFeed,
  toPlainText,
};
