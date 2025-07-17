const ProductMeta = require("../../models/productsMeta");

const getMeta = async(req,res) => {
    const {product_id} = req.params;

    const meta = await ProductMeta.find({product_id});

    res.status(200).json({
        meta
    })
}

module.exports = getMeta;