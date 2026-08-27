const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const { autorizar } = require("../middlewares/permissions.middleware");
const orcamentoController = require("../controllers/orcamento.controller");

router.post("/", auth, autorizar("orcamentos.criar"), orcamentoController.criar);
router.get("/", auth, autorizar("orcamentos.visualizar"), orcamentoController.listar);
router.put("/:id/aprovar", auth, autorizar("orcamentos.aprovar"), orcamentoController.aprovar);
router.put("/:id/enviado", auth, autorizar("orcamentos.enviar"), orcamentoController.marcarEnviado);
router.get("/:id", auth, autorizar("orcamentos.visualizar"), orcamentoController.buscarPorId);
router.put("/:id", auth, autorizar("orcamentos.editar"), orcamentoController.atualizar);
router.delete("/:id", auth, autorizar("orcamentos.excluir"), orcamentoController.excluir);

module.exports = router;
