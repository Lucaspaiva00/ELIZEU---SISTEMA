const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const { autorizar } = require("../middlewares/permissions.middleware");
const controller = require("../controllers/compra.controller");

router.get("/apoio", auth, autorizar("compras.visualizar"), controller.apoio);
router.get("/fornecedor/:fornecedorId/resumo", auth, autorizar("compras.visualizar"), controller.resumoFornecedor);
router.get("/", auth, autorizar("compras.visualizar"), controller.listar);
router.post("/", auth, autorizar("compras.criar"), controller.criar);
router.post("/:id/cancelar", auth, autorizar("compras.cancelar"), controller.cancelar);
router.get("/:id", auth, autorizar("compras.visualizar"), controller.buscarPorId);

module.exports = router;
