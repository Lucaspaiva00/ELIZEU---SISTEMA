const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const controller = require("../controllers/sacmais.controller");

router.post("/clientes/importar", auth, controller.importarClientes);

// Endpoint para receber novos cadastros do SacMais.
// Configure a URL no formato /api/integracoes/sacmais/webhook/:empresaId
router.post("/webhook/:empresaId", controller.webhook);

module.exports = router;
