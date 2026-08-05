const express = require("express");

const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const contaPagarController = require("../controllers/contaPagar.controller");

router.post("/", auth, contaPagarController.criar);
router.get("/", auth, contaPagarController.listar);
router.get("/resumo", auth, contaPagarController.resumo);

router.post("/:id/pagar", auth, contaPagarController.pagar);
router.post("/:id/cancelar", auth, contaPagarController.cancelar);

router.get("/:id", auth, contaPagarController.buscarPorId);
router.put("/:id", auth, contaPagarController.atualizar);

module.exports = router;
