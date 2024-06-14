const { User } = require("../../models/user");
const bcrypt = require("bcrypt");
// const RequestError = require("../../helpers/requestError");
const randomId = require("random-id");
const { transport } = require("../../middleware");
const { generateTokens } = require("../../helpers");
const { default: axios } = require("axios");
const { KINTSUGI_GMAIL, BASE_BACKEND_URL, RECAPTCHA_SECRET_KEY } = process.env;


const register = async (req, res) => {
  // const { email, password, phone, gReCaptchaToken } = req.body;
  const { email, password, phone } = req.body;

  // let valid = false;

  // await axios.get(`https://www.google.com/recaptcha/api/siteverify?secret=${RECAPTCHA_SECRET_KEY}&response=${gReCaptchaToken}`).then(res =>  {
  //   const {success, action, score} = res.data;
  //   console.log(score);
  //   if(success && score >= 0.6 && action === "registerForm") {
  //     return valid = true;
  //   } else {
  //     res.status(423).json({
  //       message: "Your are robot!"
  //     })
  //   }
  // })


  const duplicateEmail = await User.findOne({ email });
  const duplicatePhone = await User.findOne({ phone });

  if (duplicateEmail) {
    res.status(409).json({
      status: 409,
      message: "Користувач із такою поштою вже існує!",
    });
  }

  if (duplicatePhone) {
    res.status(409).json({
      status: 409,
      message: "Користувач із таким номером вже існує!",
    });
  }

  const hashPassword = await bcrypt.hash(password, 10);
  const verificationToken = randomId(36, "aA0");
  const avatarURL =
    "https://res.cloudinary.com/dzjmswzgp/image/upload/v1691783112/Group_26_r3qewe.jpg";

  const newUser = await User.create({
    ...req.body,
    password: hashPassword,
    verificationToken,
    avatarURL,
    role: "user",
  });

  const { token, refreshToken } = await generateTokens(newUser._id);

  await User.findByIdAndUpdate(newUser._id, {token, refreshToken });

  const verifyEmail = {
    from: KINTSUGI_GMAIL,
    to: email,
    subject: "Верифікація пошти Kintsugi Cosplay",
    html: `<p>Давай верифікуємо твою пошту. Натисни тут <a target="_blank" href="${BASE_BACKEND_URL}/api/auth/verify/${verificationToken}">link</a> .</p>`,
  };

  await transport.sendMail(verifyEmail);
  
  res
  .cookie("refreshToken", refreshToken, {
    sameSite: "None",
    httpOnly: true,
    secure: true,
    domain: "kintsugi.org.ua",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  })

  res.status(201).json({
    status: 201,
    token,
    refreshToken,
    verificationToken,
    user: newUser,
  });
};

module.exports = register;
