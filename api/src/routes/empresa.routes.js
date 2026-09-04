const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const { autorizar } = require("../middlewares/permissions.middleware");
const empresaController = require("../controllers/empresa.controller");
const focusNfeController = require("../controllers/focusNfe.controller");

router.get("/minha", auth, autorizar("empresa.visualizar"), empresaController.minha);
router.put("/minha", auth, autorizar("empresa.editar"), empresaController.atualizarMinha);
router.put("/minha/fiscal", auth, autorizar("empresa.fiscal"), empresaController.salvarConfiguracaoFiscal);
router.post("/minha/certificado", auth, autorizar("empresa.certificado"), empresaController.salvarCertificado);
router.delete("/minha/certificado", auth, autorizar("empresa.certificado"), empresaController.removerCertificado);
router.get("/minha/focus", auth, autorizar("empresa.fiscal"), focusNfeController.configuracao);
router.put("/minha/focus", auth, autorizar("empresa.fiscal"), focusNfeController.salvar);
router.post("/minha/focus/testar", auth, autorizar("empresa.fiscal"), focusNfeController.testar);

router.post("/", auth, autorizar("empresa.gerenciar"), empresaController.criar);
router.get("/", auth, autorizar("empresa.gerenciar"), empresaController.listar);
router.get("/:id", auth, autorizar("empresa.gerenciar"), empresaController.buscarPorId);
router.put("/:id", auth, autorizar("empresa.gerenciar"), empresaController.atualizar);
router.delete("/:id", auth, autorizar("empresa.gerenciar"), empresaController.excluir);

module.exports = router;
