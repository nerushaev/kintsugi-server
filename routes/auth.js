const express = require('express');

const authCtrl = require('../controllers/auth');

const { ctrlWrapper, validation, authenticate } = require('../middleware');

const { schemas } = require('../models/user');

const router = express.Router();

router.post('/register', validation(schemas.registerSchema), ctrlWrapper(authCtrl.register));

router.post('/login', validation(schemas.loginSchema), ctrlWrapper(authCtrl.login));

router.get('/current', authenticate, ctrlWrapper(authCtrl.getCurrent));

router.put('/logout', authenticate, ctrlWrapper(authCtrl.logout));

module.exports = router;


