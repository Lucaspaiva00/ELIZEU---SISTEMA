const express = require("express");

const router = express.Router();

const auth = require("../middlewares/auth.middleware");

const empresaController = require("../controllers/empresa.controller");

router.get("/minha", auth, empresaController.minha);
router.put("/minha", auth, empresaController.atualizarMinha);
router.put("/minha/fiscal", auth, empresaController.salvarConfiguracaoFiscal);
router.post("/minha/certificado", auth, empresaController.salvarCertificado);
router.delete("/minha/certificado", auth, empresaController.removerCertificado);

router.post("/", auth, empresaController.criar);

router.get("/", auth, empresaController.listar);

router.get("/:id", auth, empresaController.buscarPorId);

router.put("/:id", auth, empresaController.atualizar);

router.delete("/:id", auth, empresaController.excluir);

module.exports = router;
