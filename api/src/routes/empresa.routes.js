const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const { autorizar } = require("../middlewares/permissions.middleware");
const empresaController = require("../controllers/empresa.controller");
const sefazGoService = require("../services/sefazGo.service");
const portalNacionalController = require("../controllers/portalNacional.controller");

router.get("/minha", auth, autorizar("empresa.visualizar"), empresaController.minha);
router.put("/minha", auth, autorizar("empresa.editar"), empresaController.atualizarMinha);
router.put("/minha/fiscal", auth, autorizar("empresa.fiscal"), empresaController.salvarConfiguracaoFiscal);
router.post("/minha/certificado", auth, autorizar("empresa.certificado"), empresaController.salvarCertificado);
router.delete("/minha/certificado", auth, autorizar("empresa.certificado"), empresaController.removerCertificado);
router.get("/minha/portal-nacional", auth, autorizar("empresa.fiscal"), portalNacionalController.status);
router.post("/minha/portal-nacional/testar", auth, autorizar("empresa.fiscal"), portalNacionalController.testar);

router.get("/minha/nfe/sefaz/status", auth, autorizar("empresa.fiscal"), async (req, res) => {
    const ambiente = req.query.ambiente || "HOMOLOGACAO";
    if (!["HOMOLOGACAO", "PRODUCAO"].includes(ambiente)) {
        return res.status(400).json({ sucesso: false, mensagem: "Ambiente da NF-e inválido." });
    }
    try {
        const status = await sefazGoService.testarStatus(req.usuario.empresaId, ambiente);
        const tpAmb = ambiente === "PRODUCAO" ? "1" : "2";
        const operante = status.httpStatus === 200 && status.cStat === "107" && status.tpAmb === tpAmb;
        return res.json({ sucesso: true, ambiente, operante, ...status });
    } catch (erro) {
        const mensagem = erro.message === "Certificado A1 não configurado."
            ? erro.message : "Não foi possível consultar a SEFAZ Goiás com o certificado A1 da empresa.";
        return res.status(502).json({ sucesso: false, mensagem });
    }
});

router.post("/", auth, autorizar("empresa.gerenciar"), empresaController.criar);
router.get("/", auth, autorizar("empresa.gerenciar"), empresaController.listar);
router.get("/:id", auth, autorizar("empresa.gerenciar"), empresaController.buscarPorId);
router.put("/:id", auth, autorizar("empresa.gerenciar"), empresaController.atualizar);
router.delete("/:id", auth, autorizar("empresa.gerenciar"), empresaController.excluir);

module.exports = router;
