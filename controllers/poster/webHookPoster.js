const { default: axios } = require("axios");
const Poster = require("../../models/poster");
const MD5 = require('crypto-js/md5');
const Product = require("../../models/product");
const {POSTER_URL_API, POSTER_ACCESS_TOKEN} = process.env;

const webHookPoster = async (req, res) => {
    const postData  = req.body;
    console.log(req.body.object);
    
    const {verify, data} = req.body;
    
    const verifyArr = [
    postData.account,
    postData.object,
    postData.object_id,
    postData.action,
];

if(postData.data) {
    verifyArr.push(postData.data);
}

    verifyArr.push(postData.time);
    verifyArr.push("6b116aca0f4549d51dbdd6848f8ca5f2");
    const verifyString = verifyArr.join(';');

    console.log(verifyString);

    const verifyHash = MD5(verifyString).toString();
    
    if(verifyHash !== verify) {
        return;
    }

    if (postData.action === "added") {
      const {data} = await axios.get(`${POSTER_URL_API}/menu.getProduct?token=${POSTER_ACCESS_TOKEN}&product_id=${postData.object_id}`);
      const {
        product_name,
        category_name,
        product_id,
        menu_category_id,
        photo,
        photo_origin,
        price,
        barcode,
        hidden
      } = data.response;
      await Product.create({
        product_name,
        category_name,
        product_id,
        menu_category_id,
        photo,
        photo_origin,
        price: Number(price[1]),
        barcode,
        hidden
      });
    };
    
      if (postData.action === "removed") {
         await Product.deleteOne({product_id: postData.object_id});
      }
      
       if (postData.action === "changed") {
        const {data} = await axios.get(`${POSTER_URL_API}/menu.getProduct?token=${POSTER_ACCESS_TOKEN}&product_id=${postData.object_id}`);
        const {
        product_name,
        category_name,
        product_id,
        menu_category_id,
        photo,
        photo_origin,
        price,
        barcode,
        hidden
      } = data.response;
      await Product.findOneAndUpdate({products_id: postData.object_id}, {
        product_name,
        category_name,
        product_id,
        menu_category_id,
        photo,
        photo_origin,
        price: Number(price[1]),
        barcode,
        hidden
      }, {$new: true});
      }
    
    
  res.status(200).send("Success")
}

module.exports = webHookPoster;