const PERSON_NAME_PATTERN = /^[A-Za-zА-Яа-яІіЇїЄєҐґ]+(?:[ '\u2019\u02bc-][A-Za-zА-Яа-яІіЇїЄєҐґ]+)*$/u;

const normalizePersonName = (value) =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";

const normalizeEmail = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const normalizeUkrainianPhone = (value) => {
  if (typeof value !== "string") return "";

  const digits = value.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("0")) return `+38${digits}`;
  if (digits.length === 12 && digits.startsWith("380")) return `+${digits}`;
  return value.trim();
};

const isUkrainianPhone = (value) => /^\+380\d{9}$/.test(value);

module.exports = {
  PERSON_NAME_PATTERN,
  normalizePersonName,
  normalizeEmail,
  normalizeUkrainianPhone,
  isUkrainianPhone,
};
