const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const { autorizar } = require("../middlewares/permissions.middleware");
const movimentacaoController = require("../controllers/movimentacaoFinanceira.controller");

router.get("/", auth, autorizar("movimentacoes.visualizar"), movimentacaoController.listar);
router.get("/resumo", auth, autorizar("movimentacoes.visualizar"), movimentacaoController.resumo);
router.post("/manual", auth, autorizar("movimentacoes.criar"), movimentacaoController.criarManual);
router.post("/transferir", auth, autorizar("movimentacoes.transferir"), movimentacaoController.transferir);
router.post("/:id/estornar", auth, autorizar("movimentacoes.estornar"), movimentacaoController.estornar);
router.get("/:id", auth, autorizar("movimentacoes.visualizar"), movimentacaoController.buscarPorId);

module.exports = router;
