const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const { autorizar, autorizarQualquer } = require("../middlewares/permissions.middleware");
const contaFinanceiraController = require("../controllers/contaFinanceira.controller");

const consultarContas = autorizarQualquer(
    "contas_financeiras.visualizar",
    "contas_receber.visualizar",
    "contas_pagar.visualizar",
    "movimentacoes.visualizar"
);

router.post("/", auth, autorizar("contas_financeiras.gerenciar"), contaFinanceiraController.criar);
router.get("/", auth, consultarContas, contaFinanceiraController.listar);
router.post("/:id/tornar-padrao", auth, autorizar("contas_financeiras.gerenciar"), contaFinanceiraController.tornarPadrao);
router.get("/:id", auth, consultarContas, contaFinanceiraController.buscarPorId);
router.put("/:id", auth, autorizar("contas_financeiras.gerenciar"), contaFinanceiraController.atualizar);
router.delete("/:id", auth, autorizar("contas_financeiras.gerenciar"), contaFinanceiraController.desativar);

module.exports = router;
