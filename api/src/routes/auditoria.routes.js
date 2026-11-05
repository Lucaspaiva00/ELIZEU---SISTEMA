const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const { autorizar } = require("../middlewares/permissions.middleware");
const controller = require("../controllers/auditoria.controller");

router.get("/", auth, autorizar("usuarios.gerenciar"), controller.listar);

module.exports = router;
