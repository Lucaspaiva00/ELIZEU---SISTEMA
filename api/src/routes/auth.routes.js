const express = require("express");

const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const authController = require("../controllers/auth.controller");

router.post("/bootstrap", authController.bootstrap);
router.post("/login", authController.login);
router.get("/me", auth, authController.me);

module.exports = router;
