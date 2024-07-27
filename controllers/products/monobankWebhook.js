const { MONOBANK_TEST_TOKEN, KINTSUGI_GMAIL } = process.env;
const crypto = require("crypto");
const Order = require("../../models/order");
const { transport } = require("../../middleware");

const monobankWebhook = async (req, res) => {
  const monoKey = req.headers["x-sign"];
  //   console.log(req.body);
  const pubKey =
    "LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUZrd0V3WUhLb1pJemowQ0FRWUlLb1pJemowREFRY0RRZ0FFc05mWXpNR1hIM2VXVHkzWnFuVzVrM3luVG5CYgpnc3pXWnhkOStObEtveDUzbUZEVTJONmU0RlBaWmsvQmhqamgwdTljZjVFL3JQaU1EQnJpajJFR1h3PT0KLS0tLS1FTkQgUFVCTElDIEtFWS0tLS0tCg==";
  const { body } = req;
  const { invoiceId, status } = body;
  //  console.log(body);
  const bodyAsString = JSON.stringify(body);
  let signatureBuf = Buffer.from(monoKey, "base64");

  let publicKeyBuf = Buffer.from(pubKey, "base64");

  let verify = crypto.createVerify("SHA256");

  verify.write(bodyAsString);
  verify.end();

  let result = verify.verify(publicKeyBuf, signatureBuf);

  if (result === true) {
    const result = await Order.findOneAndUpdate(
      { paymentId: invoiceId },
      {
        $set: {
          paymentStatus: status,
        },
      }
    );

    console.log(result);

    if (status === "success") {
      const userOrderMessage = {
        from: KINTSUGI_GMAIL,
        to: result.email,
        subject: `Успішна оплата!`,
        html: `<h2>Ваше замовлення ${result.orderId} успішно сплачене!</h2>
    `,
      };
      console.log("here");
      await transport.sendMail(userOrderMessage);
    }
  }

  res.status(200).send();
};

module.exports = monobankWebhook;
