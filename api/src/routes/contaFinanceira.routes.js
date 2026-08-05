const express = require("express");

const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const contaFinanceiraController = require("../controllers/contaFinanceira.controller");

router.post("/", auth, contaFinanceiraController.criar);
router.get("/", auth, contaFinanceiraController.listar);

router.post("/:id/tornar-padrao", auth, contaFinanceiraController.tornarPadrao);

router.get("/:id", auth, contaFinanceiraController.buscarPorId);
router.put("/:id", auth, contaFinanceiraController.atualizar);
router.delete("/:id", auth, contaFinanceiraController.desativar);

module.exports = router;
