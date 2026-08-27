const express = require("express");
const auth = require("../middlewares/auth.middleware");
const { autorizar, autorizarQualquer } = require("../middlewares/permissions.middleware");
const controller = require("../controllers/centroCusto.controller");
const router = express.Router();

const consultar = autorizarQualquer(
    "financeiro.configurar",
    "contas_receber.visualizar",
    "contas_pagar.visualizar",
    "movimentacoes.visualizar"
);

router.get("/", auth, consultar, controller.listar);
router.post("/", auth, autorizar("financeiro.configurar"), controller.criar);
router.get("/:id", auth, consultar, controller.buscarPorId);
router.put("/:id", auth, autorizar("financeiro.configurar"), controller.atualizar);
router.delete("/:id", auth, autorizar("financeiro.configurar"), controller.desativar);

module.exports = router;
