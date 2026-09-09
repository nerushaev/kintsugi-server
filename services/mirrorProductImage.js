const { createHash } = require("node:crypto");
const { normalizeSourceImage, isPublicImageUrl, getPublicProductImage } = require("../helpers/publicProductImage");

const planImageMirror = (product) => {
  const source = normalizeSourceImage(product.photo_origin || product.photo);
  if (!source || getPublicProductImage(product)) return null;
  const url = new URL(source);
  if (url.hostname !== "kintsugi.joinposter.com" || url.port || !url.pathname.startsWith("/upload/")) return null;
  // Stable key: retries reuse the asset; a new source gets a new URL.
  return { source, publicId: `kintsugi/products/${createHash("sha256").update(source).digest("hex")}` };
};

const mirrorProductImage = async (product, { apply = false, upload, verify, save }) => {
  const plan = planImageMirror(product);
  if (!plan) return { status: "skipped" };
  if (!apply) return { status: "planned", ...plan };
  const result = await upload(plan.source, {
    public_id: plan.publicId,
    resource_type: "image",
    type: "upload",
    overwrite: false,
    unique_filename: false,
    timeout: 60000,
  });
  if (!isPublicImageUrl(result.secure_url)) throw new Error("Upload did not return a public HTTPS image");
  await verify(result.secure_url);
  // save must use a conditional update to avoid overwriting concurrent changes.
  const saved = await save(product, { photo_public: result.secure_url, photo_public_source: plan.source });
  return { status: saved ? "saved" : "changed_during_upload", url: result.secure_url };
};

module.exports = { planImageMirror, mirrorProductImage };
