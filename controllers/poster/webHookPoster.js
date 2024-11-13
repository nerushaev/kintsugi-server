const { default: axios } = require("axios");
const Poster = require("../../models/poster");
const MD5 = require("crypto-js/md5");
const Product = require("../../models/product");
const { POSTER_URL_API, POSTER_ACCESS_TOKEN } = process.env;

const webHookPoster = async (req, res) => {
  console.log("here");
  const postData = req.body;

  const { verify, data } = req.body;

  const verifyArr = [
    postData.account,
    postData.object,
    postData.object_id,
    postData.action,
  ];

  if (postData.data) {
    verifyArr.push(postData.data);
  }

  verifyArr.push(postData.time);
  verifyArr.push("6b116aca0f4549d51dbdd6848f8ca5f2");
  const verifyString = verifyArr.join(";");

  const verifyHash = MD5(verifyString).toString();
  console.log(verify);
  console.log(verifyHash);
  if (verifyHash !== verify) {
    console.log("verify error");
    res.status(400);
    return;
  }

  console.log(postData);

  if (postData.object === "product") {
    if (postData.action === "added") {
      const { data } = await axios.get(
        `${POSTER_URL_API}/menu.getProduct?token=${POSTER_ACCESS_TOKEN}&product_id=${postData.object_id}`
      );

      const {
        product_name,
        category_name,
        product_id,
        menu_category_id,
        photo,
        photo_origin,
        price,
        barcode,
        hidden,
        modifications,
      } = data.response;

      if (modifications) {
        const modificatorsAmount = await axios.get(
          `${POSTER_URL_API}/storage.getStorageLeftovers?token=${POSTER_ACCESS_TOKEN}&type=3&zero_leftovers=true`
        );
        const { response } = modificatorsAmount.data;
        // Перебираем массив модификаций товара и находим к каждому модификатору
        // соответствующий ему обьект на складе
        const resultAmountWithModificators = modifications.map(
          (modificator) => {
            const modificatorAmount = response.filter((item) => {
              if (item.ingredient_id === modificator.ingredient_id) {
                return item;
              }
            });
            const resultModification = {
              ingredient_id: modificator.ingredient_id,
              modificator_name: modificator.modificator_name,
              size_left: Math.floor(
                Number(modificatorAmount[0].ingredient_left)
              ),
              modificator_price: Number(modificator.spots[0].price),
            };
            return resultModification;
          }
        );

        let totalAmount = 0;
        resultAmountWithModificators.map((item) => {
          return (totalAmount += item.size_left);
        });

        const productItem = {
          product_name,
          category_name,
          product_id,
          menu_category_id,
          photo,
          photo_origin,
          price: resultAmountWithModificators[0].modificator_price,
          barcode,
          hidden,
          modifications: resultAmountWithModificators,
          amount: totalAmount,
        };

        await Product.create(
          {
            ...productItem,
          }
        );
        res.status(200);
      } else {
        console.log("no mod");

        const modPrice = modifications
          ? Number(modifications[0].modificator_selfprice)
          : 0;
        const spotsPrice = modifications
          ? Number(modifications[0].spots[0].price)
          : 0;

        let newPrice;

        if (price) {
          newPrice = Number(price[1]);
        } else if (modPrice !== 0) {
          newPrice = modPrice;
        } else {
          newPrice = spotsPrice;
        }

        await Product.create(
          {
            product_name,
            category_name,
            product_id,
            menu_category_id,
            photo,
            photo_origin,
            price: newPrice,
            barcode,
            hidden,
            modifications,
          }
        );

        res.status(200);
      }
    } else if (postData.action === "removed") {
      console.log("removed");
      await Product.deleteOne({ product_id: postData.object_id });
    } else if (postData.action === "changed") {
      console.log("changed");
      const { data } = await axios.get(
        `${POSTER_URL_API}/menu.getProduct?token=${POSTER_ACCESS_TOKEN}&product_id=${postData.object_id}`
      );
      const {
        product_name,
        category_name,
        product_id,
        menu_category_id,
        photo,
        photo_origin,
        price,
        barcode,
        hidden,
        modifications,
      } = data.response;

      if (modifications) {
        const modificatorsAmount = await axios.get(
          `${POSTER_URL_API}/storage.getStorageLeftovers?token=${POSTER_ACCESS_TOKEN}&type=3&zero_leftovers=true`
        );

        const { response } = modificatorsAmount.data;

        const resultAmountWithModificators = modifications.map(
          (modificator) => {
            const modificatorAmount = response.filter((item) => {
              if (item.ingredient_id === modificator.ingredient_id) {
                return item;
              }
            });
            const resultModification = {
              ingredient_id: modificator.ingredient_id,
              modificator_name: modificator.modificator_name,
              size_left: Math.floor(
                Number(modificatorAmount[0].ingredient_left)
              ),
              modificator_price: Number(modificator.spots[0].price),
            };
            return resultModification;
          }
        );
        let totalAmount = 0;
        resultAmountWithModificators.map((item) => {
          return (totalAmount += item.size_left);
        });

        const productItem = {
          product_name,
          category_name,
          product_id,
          menu_category_id,
          photo,
          photo_origin,
          price: resultAmountWithModificators[0].modificator_price,
          barcode,
          hidden,
          modifications: resultAmountWithModificators,
          amount: totalAmount,
        };

        await Product.findOneAndUpdate(
          { product_id: product_id },
          {
            ...productItem,
          },
          { timestamps: true }
        );
        res.status(200);
      } else {
        const productsAmount = await axios.get(
          `${POSTER_URL_API}/storage.getStorageLeftovers?token=${POSTER_ACCESS_TOKEN}&type=2&zero_leftovers=true`
        );
        const { response } = productsAmount.data;

        const productsResultAmount = response.filter((amountProd) => {
          if (amountProd.ingredient_name === product_name) {
            return amountProd;
          }
        });

        const spotsPrice = modifications
          ? Number(modifications[0].spots[0].price)
          : 0;

        let newPrice;

        if (price) {
          newPrice = Number(price[1]);
        } else {
          newPrice = spotsPrice;
        }

        const productItem = {
          product_name,
          category_name,
          product_id,
          menu_category_id,
          photo,
          photo_origin,
          price: newPrice,
          barcode,
          hidden,
          amount: Math.floor(Number(productsResultAmount[0].ingredient_left)),
        };

        await Product.findOneAndUpdate(
          { product_id: product_id },
          {
            ...productItem,
          }, { timestamps: true }
        );
        res.status(200);
      }
    }
  }

  if (postData.object === "stock") {
    if (postData.action === "changed") {
      const { data } = postData;
      const parsData = JSON.parse(data);
      const { product_id, value_absolute, element_id } = parsData;
      const { object_id } = postData;
      console.log(typeof object_id);

      if (product_id) {
        const { data } = await axios.get(
          `${POSTER_URL_API}/menu.getProduct?token=${POSTER_ACCESS_TOKEN}&product_id=${product_id}`
        );

        const {
          product_name,
          category_name,
          // product_id,
          menu_category_id,
          photo,
          photo_origin,
          price,
          barcode,
          hidden,
          modifications,
        } = data.response;

        if (modifications) {
          const modificatorsAmount = await axios.get(
            `${POSTER_URL_API}/storage.getStorageLeftovers?token=${POSTER_ACCESS_TOKEN}&type=3&zero_leftovers=true`
          );

          const { response } = modificatorsAmount.data;

          const resultAmountWithModificators = modifications.map(
            (modificator) => {
              const modificatorAmount = response.filter((item) => {
                if (item.ingredient_id === modificator.ingredient_id) {
                  return item;
                }
              });
              const resultModification = {
                ingredient_id: modificator.ingredient_id,
                modificator_name: modificator.modificator_name,
                size_left: Math.floor(
                  Number(modificatorAmount[0].ingredient_left)
                ),
                modificator_price: Number(modificator.spots[0].price),
              };
              return resultModification;
            }
          );
          let totalAmount = 0;
          resultAmountWithModificators.map((item) => {
            return (totalAmount += item.size_left);
          });

          const productItem = {
            product_name,
            category_name,
            product_id,
            menu_category_id,
            photo,
            photo_origin,
            price: resultAmountWithModificators[0].modificator_price,
            barcode,
            hidden,
            modifications: resultAmountWithModificators,
            amount: totalAmount,
          };

          await Product.findOneAndUpdate(
            { product_id: product_id },
            {
              ...productItem,
            }, { timestamps: true }
          );
          res.status(200);
        } else {
          const productsAmount = await axios.get(
            `${POSTER_URL_API}/storage.getStorageLeftovers?token=${POSTER_ACCESS_TOKEN}&type=2&zero_leftovers=true`
          );
          const { response } = productsAmount.data;

          const productsResultAmount = response.filter((amountProd) => {
            if (amountProd.ingredient_name === product_name) {
              return amountProd;
            }
          });

          const spotsPrice = modifications
            ? Number(modifications[0].spots[0].price)
            : 0;

          let newPrice;

          if (price) {
            newPrice = Number(price[1]);
          } else {
            newPrice = spotsPrice;
          }

          const productItem = {
            product_name,
            category_name,
            product_id,
            menu_category_id,
            photo,
            photo_origin,
            price: newPrice,
            barcode,
            hidden,
            amount: Math.floor(Number(productsResultAmount[0].ingredient_left)),
          };

          await Product.findOneAndUpdate(
            { product_id: product_id },
            {
              ...productItem,
            }, { timestamps: true }
          );
          res.status(200);
        }
      } else {
        await Product.findOneAndUpdate(
          { product_id: element_id },
          {
            $set: {
              amount: value_absolute,
            },
          }, { timestamps: true }
        );
      }
      res.status(200);
    }
  }

  res.status(200).send("Success");
};

module.exports = webHookPoster;
