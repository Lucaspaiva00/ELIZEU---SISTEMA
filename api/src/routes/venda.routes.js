const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const { autorizar } = require("../middlewares/permissions.middleware");
const controller = require("../controllers/venda.controller");
const nfeController = require("../controllers/nfe.controller");

router.get("/", auth, autorizar("vendas.visualizar"), controller.listar);
router.put("/:id/faturar", auth, autorizar("vendas.faturar"), controller.faturar);
router.put("/:id/cancelar", auth, autorizar("vendas.cancelar"), controller.cancelar);
router.get("/:id/nfe", auth, autorizar("fiscal.visualizar"), nfeController.buscar);
router.get("/:id/nfe/validar", auth, autorizar("fiscal.visualizar"), nfeController.validar);
router.post("/:id/nfe/preparar", auth, autorizar("fiscal.emitir"), nfeController.preparar);
router.post("/:id/nfe/emitir", auth, autorizar("fiscal.emitir"), nfeController.emitir);
router.post("/:id/nfe/consultar", auth, autorizar("fiscal.visualizar"), nfeController.consultar);
router.post("/:id/nfe/cancelar", auth, autorizar("fiscal.emitir"), nfeController.cancelar);
router.get("/:id", auth, autorizar("vendas.visualizar"), controller.buscarPorId);

module.exports = router;
