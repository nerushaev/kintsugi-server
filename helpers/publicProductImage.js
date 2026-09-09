const normalizeSourceImage = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  try {
    const url = new URL(raw.startsWith("/") ? `https://kintsugi.joinposter.com${raw}` : raw);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
    url.protocol = "https:";
    return url.href;
  } catch { return null; }
};

const isPublicImageUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "res.cloudinary.com" &&
      !url.username && !url.password && !url.port && url.pathname.includes("/image/upload/");
  } catch { return false; }
};

// A changed Poster source invalidates its old copy without touching stock sync.
const getPublicProductImage = (product) =>
  isPublicImageUrl(product.photo_public) &&
  normalizeSourceImage(product.photo_public_source) === normalizeSourceImage(product.photo_origin || product.photo) &&
  normalizeSourceImage(product.photo_public_source)
    ? product.photo_public : null;

module.exports = { normalizeSourceImage, isPublicImageUrl, getPublicProductImage };
