const express = require("express");

const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const movimentacaoController = require("../controllers/movimentacaoFinanceira.controller");

router.get("/", auth, movimentacaoController.listar);
router.get("/resumo", auth, movimentacaoController.resumo);
router.post("/manual", auth, movimentacaoController.criarManual);
router.post("/transferir", auth, movimentacaoController.transferir);
router.post("/:id/estornar", auth, movimentacaoController.estornar);
router.get("/:id", auth, movimentacaoController.buscarPorId);

module.exports = router;
