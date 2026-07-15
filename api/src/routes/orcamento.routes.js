const express = require("express");

const router = express.Router();

const auth = require("../middlewares/auth.middleware");

const orcamentoController = require("../controllers/orcamento.controller");

router.post("/", auth, orcamentoController.criar);

router.get("/", auth, orcamentoController.listar);

router.get("/:id", auth, orcamentoController.buscarPorId);

router.put("/:id", auth, orcamentoController.atualizar);

router.delete("/:id", auth, orcamentoController.excluir);

module.exports = router;