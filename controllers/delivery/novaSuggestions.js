const axios = require("axios");

const CACHE_TTL = 5 * 60 * 1000;
const cache = new Map();

// Directory lookups are public Nova Poshta methods; private operations use NOVA_API_KEY elsewhere.

const clean = (value, maxLength = 120) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

const requestNova = async (calledMethod, methodProperties) => {
  const { NOVA_BASE_URL } = process.env;

  const cacheKey = `${calledMethod}:${JSON.stringify(methodProperties)}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const { data } = await axios.post(
    NOVA_BASE_URL || "https://api.novaposhta.ua/v2.0/json/",
    {
      modelName: "Address",
      calledMethod,
      methodProperties,
    },
    { timeout: 8000 }
  );

  if (!data?.success) {
    const error = new Error(data?.errors?.[0] || "Nova Poshta API request failed");
    error.status = 502;
    throw error;
  }

  cache.set(cacheKey, { value: data.data || [], expiresAt: Date.now() + CACHE_TTL });
  return data.data || [];
};

const cities = async (req, res) => {
  const query = clean(req.query.q);
  if (query.length < 2) return res.json({ items: [] });

  const data = await requestNova("getCities", {
    FindByString: query,
    Limit: "20",
    Page: "1",
  });

  res.json({
    items: data.map((item) => ({
      label: [item.SettlementTypeDescription, item.Description]
        .filter(Boolean)
        .join(" "),
      city: item.Description,
      region: item.AreaDescription || "",
      cityRef: item.Ref || "",
      settlementRef: item.Ref || "",
    })).filter((item) => item.label && item.cityRef),
  });
};

const warehouses = async (req, res) => {
  const cityRef = clean(req.query.cityRef, 80);
  const query = clean(req.query.q);
  const kind = req.query.kind === "postbox" ? "postbox" : "branch";
  if (!cityRef) return res.json({ items: [] });

  const data = await requestNova("getWarehouses", {
    CityRef: cityRef,
    FindByString: query,
    Limit: "50",
    Page: "1",
  });

  res.json({
    items: data
      .filter((item) => {
        const category = String(item.CategoryOfWarehouse || "").toLowerCase();
        const description = String(item.Description || "").toLowerCase();
        const isPostbox = category.includes("postomat") || description.includes("поштомат");
        return kind === "postbox" ? isPostbox : !isPostbox;
      })
      .slice(0, 30)
      .map((item) => ({
        label: item.Description,
        shortAddress: item.ShortAddress || "",
        number: String(item.Number || ""),
        ref: item.Ref || "",
        index: item.WarehouseIndex || item.SiteKey || String(item.Number || ""),
      })),
  });
};

const streets = async (req, res) => {
  const settlementRef = clean(req.query.settlementRef, 80);
  const query = clean(req.query.q);
  if (!settlementRef || query.length < 2) return res.json({ items: [] });

  const data = await requestNova("getStreet", {
    FindByString: query,
    CityRef: settlementRef,
    Limit: "20",
    Page: "1",
  });

  res.json({
    items: data.map((item) => ({
      label: [item.StreetsType, item.Description].filter(Boolean).join(" "),
      ref: item.Ref || "",
    })).filter((item) => item.label),
  });
};

module.exports = { cities, warehouses, streets };
