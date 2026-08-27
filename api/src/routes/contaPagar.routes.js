const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const { autorizar } = require("../middlewares/permissions.middleware");
const contaPagarController = require("../controllers/contaPagar.controller");

router.post("/", auth, autorizar("contas_pagar.criar"), contaPagarController.criar);
router.get("/", auth, autorizar("contas_pagar.visualizar"), contaPagarController.listar);
router.get("/resumo", auth, autorizar("contas_pagar.visualizar"), contaPagarController.resumo);
router.post("/:id/pagar", auth, autorizar("contas_pagar.pagar"), contaPagarController.pagar);
router.post("/:id/cancelar", auth, autorizar("contas_pagar.cancelar"), contaPagarController.cancelar);
router.get("/:id", auth, autorizar("contas_pagar.visualizar"), contaPagarController.buscarPorId);
router.put("/:id", auth, autorizar("contas_pagar.editar"), contaPagarController.atualizar);

module.exports = router;
