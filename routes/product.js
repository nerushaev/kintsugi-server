const express = require('express');
const router = express.Router();
const { ctrlWrapper, validation, upload } = require('../middleware');
const { productSchema } = require('../schemas');

const validateMiddleware = validation(productSchema);


const productCtrl = require('../controllers/products');

router.get('/', productCtrl.getProducts);

router.get('/all', ctrlWrapper(productCtrl.getAllProducts));

router.get('/comingSoon', ctrlWrapper(productCtrl.getComingSoonProducts));

router.get('/:_id', ctrlWrapper(productCtrl.getProductById));

router.delete('/:productId', ctrlWrapper(productCtrl.removeProductById));

router.post('/', upload.array("image"), validateMiddleware, ctrlWrapper(productCtrl.addProduct));

router.put('/:productId', validateMiddleware, ctrlWrapper(productCtrl.updateProductById));

module.exports = router;