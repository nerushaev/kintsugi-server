const isLocalRequest = (req) =>
  req.hostname === "localhost" || req.hostname === "127.0.0.1";

const getAuthCookieOptions = (req, maxAge) => {
  const local = isLocalRequest(req);
  const options = {
    httpOnly: true,
    secure: !local,
    sameSite: local ? "lax" : "none",
    path: "/",
  };

  if (!local) options.domain = ".kintsugi.org.ua";
  if (typeof maxAge === "number") options.maxAge = maxAge;

  return options;
};

module.exports = { getAuthCookieOptions };
