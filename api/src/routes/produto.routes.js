const express = require("express");

const router = express.Router();

const auth = require("../middlewares/auth.middleware");

const produtoController = require("../controllers/produto.controller");

router.post("/", auth, produtoController.criar);

router.get("/", auth, produtoController.listar);

router.get("/:id", auth, produtoController.buscarPorId);

router.put("/:id", auth, produtoController.atualizar);

router.delete("/:id", auth, produtoController.excluir);

module.exports = router;