const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const controller = require("../controllers/sacmais.controller");

// URL pública que deve ser cadastrada no webhook do SacMais.
router.post("/webhook/:empresaId", controller.webhook);

// PDF temporário gerado pelo ERP para que a API do SacMais consiga buscar
// o documento e anexá-lo na mensagem do WhatsApp.
router.get("/arquivos/:token", controller.arquivoTemporario);

// Envia mensagem + PDF do orçamento diretamente pela API do SacMais.
router.post(
    "/orcamentos/:orcamentoId/enviar-whatsapp",
    auth,
    controller.enviarOrcamento
);

// Consulta/importa UM contato pelo contactNumber usando o endpoint oficial
// GET /contacts/{contactNumber} do SacMais.
router.post("/contatos/:contactNumber/importar", auth, controller.importarContato);

// Importa os contatos históricos usando GET /tickets (paginação) para descobrir
// os números e GET /contacts/{contactNumber} para carregar o cadastro completo.
router.post("/contatos/importar-historico", auth, controller.importarHistorico);

// Retorna a URL correta do webhook para a empresa logada.
router.get("/configuracao", auth, controller.configuracao);

module.exports = router;
