const Product = require("../../models/product");


const toggleProductToFavorite = async (req, res) => {
    const {product_id, favorite} = req.body;
    console.log(req.body)

    await Product.findOneAndUpdate({product_id}, {favorite: favorite});
    res.status(200).json({
        product_id,
        favorite
    });
}

module.exports = toggleProductToFavorite;