const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const { autorizar } = require("../middlewares/permissions.middleware");
const controller = require("../controllers/sacmais.controller");

// URL pública que deve ser cadastrada no webhook do SacMais.
router.post("/webhook/:empresaId", controller.webhook);

// Importações e configuração ficam restritas a usuários autorizados a importar clientes.
router.post(
    "/contatos/:contactNumber/importar",
    auth,
    autorizar("clientes.importar"),
    controller.importarContato
);

router.post(
    "/contatos/importar-historico",
    auth,
    autorizar("clientes.importar"),
    controller.importarHistorico
);

router.get(
    "/configuracao",
    auth,
    autorizar("clientes.importar"),
    controller.configuracao
);

module.exports = router;
