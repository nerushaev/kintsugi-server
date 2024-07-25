const {MONOBANK_TEST_TOKEN} = process.env;
const crypto = require("crypto");

const monobankWebhook = async (req, res) => {

  console.log(req.body);

  // let message = `{
  //   "invoiceId": "p2_9ZgpZVsl3",
  //   "status": "created",
  //   "failureReason": "string",
  //   "amount": 4200,
  //   "ccy": 980,
  //   "finalAmount": 4200,
  //   "createdDate": "2019-08-24T14:15:22Z",
  //   "modifiedDate": "2019-08-24T14:15:22Z",
  //   "reference": "84d0070ee4e44667b31371d8f8813947",
  //   "cancelList": [
  //     {
  //       "status": "processing",
  //       "amount": 4200,
  //       "ccy": 980,
  //       "createdDate": "2019-08-24T14:15:22Z",
  //       "modifiedDate": "2019-08-24T14:15:22Z",
  //       "approvalCode": "662476",
  //       "rrn": "060189181768",
  //       "extRef": "635ace02599849e981b2cd7a65f417fe"
  //     }
  //   ]
  // }`

  // let signatureBuf = Buffer.from(xSignBase64, 'base64');
  // let publicKeyBuf = Buffer.from(pubKeyBase64, 'base64');

  // let verify = crypto.createVerify('SHA256');

  // verify.write(message);
  // verify.end();

  // let result = verify.verify(publicKeyBuf, signatureBuf);

  // console.log(result === true ? "OK" : "NOT OK");

};

module.exports = monobankWebhook;