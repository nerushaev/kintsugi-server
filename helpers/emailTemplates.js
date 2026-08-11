const { KINTSUGI_GMAIL } = process.env;

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const mailFrom = `"Kintsugi" <${KINTSUGI_GMAIL}>`;
const adminOrderEmails = [
  process.env.ADMIN_ORDER_EMAIL,
  "kolyanerushaev@gmail.com",
  "sionsan001@gmail.com",
].filter((email, index, emails) => email && emails.indexOf(email) === index);

const formatMoney = (value) =>
  new Intl.NumberFormat("uk-UA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const emailButton = (label, url) => `
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 8px">
    <tr><td style="border-radius:12px;background:#3564b8">
      <a href="${escapeHtml(url)}" target="_blank" style="display:inline-block;padding:13px 22px;color:#fff;text-decoration:none;font-weight:700;font-size:14px">${escapeHtml(label)}</a>
    </td></tr>
  </table>`;

const emailDetails = (rows) => `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0;border:1px solid #e5eaf3;border-radius:14px;background:#f8faff">
    ${rows.filter(([, value]) => value !== undefined && value !== null && value !== "").map(([label, value]) => `
      <tr>
        <td style="padding:10px 14px;color:#72809a;font-size:13px;border-bottom:1px solid #edf1f7">${escapeHtml(label)}</td>
        <td align="right" style="padding:10px 14px;color:#17243d;font-size:13px;font-weight:700;border-bottom:1px solid #edf1f7">${escapeHtml(value)}</td>
      </tr>`).join("")}
  </table>`;

const emailItems = (items) => `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:18px 0;border-top:1px solid #e5eaf3">
    ${items.map(({ title, meta, price }) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #e5eaf3">
          <div style="color:#17243d;font-size:14px;font-weight:700">${escapeHtml(title)}</div>
          <div style="margin-top:4px;color:#72809a;font-size:12px">${escapeHtml(meta)}</div>
        </td>
        <td align="right" style="padding:12px 0 12px 12px;border-bottom:1px solid #e5eaf3;color:#17243d;font-size:14px;font-weight:700;white-space:nowrap">${escapeHtml(price)}</td>
      </tr>`).join("")}
  </table>`;

const emailLayout = ({ eyebrow = "KINTSUGI", title, intro = "", content = "", note = "" }) => `<!doctype html>
<html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f2f6fc;font-family:Arial,'Helvetica Neue',sans-serif;color:#17243d">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f2f6fc"><tr><td align="center" style="padding:28px 12px">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;background:#fff;border:1px solid #dfe6f1;border-radius:20px;overflow:hidden">
      <tr><td style="height:7px;background:linear-gradient(90deg,#3564b8,#7b61d1,#ee7ca8)"></td></tr>
      <tr><td style="padding:30px 32px 12px">
        <div style="font-size:20px;font-weight:800;letter-spacing:-.5px">kint<span style="color:#ee6e9f">♡</span>sugi</div>
        <div style="margin-top:24px;color:#5572a4;font-size:11px;font-weight:700;letter-spacing:1.8px">${escapeHtml(eyebrow)}</div>
        <h1 style="margin:8px 0 10px;font-size:25px;line-height:1.25;color:#17243d">${escapeHtml(title)}</h1>
        ${intro ? `<p style="margin:0;color:#59677e;font-size:15px;line-height:1.65">${escapeHtml(intro)}</p>` : ""}
      </td></tr>
      <tr><td style="padding:8px 32px 30px;color:#39475e;font-size:14px;line-height:1.6">${content}</td></tr>
      <tr><td style="padding:20px 32px;background:#f8faff;border-top:1px solid #e5eaf3;color:#7b879b;font-size:12px;line-height:1.55">
        ${note ? `${escapeHtml(note)}<br>` : ""}З турботою, команда Kintsugi
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

module.exports = {
  adminOrderEmails,
  emailButton,
  emailDetails,
  emailItems,
  emailLayout,
  escapeHtml,
  formatMoney,
  mailFrom,
};
