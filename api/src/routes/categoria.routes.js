const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const { autorizar, autorizarQualquer } = require("../middlewares/permissions.middleware");
const categoriaController = require("../controllers/categoria.controller");

const consultarCategorias = autorizarQualquer(
    "categorias.visualizar",
    "produtos.visualizar",
    "produtos.criar",
    "produtos.editar"
);

router.post("/", auth, autorizar("categorias.gerenciar"), categoriaController.criar);
router.get("/", auth, consultarCategorias, categoriaController.listar);
router.get("/:id", auth, consultarCategorias, categoriaController.buscarPorId);
router.put("/:id", auth, autorizar("categorias.gerenciar"), categoriaController.atualizar);
router.delete("/:id", auth, autorizar("categorias.gerenciar"), categoriaController.excluir);

module.exports = router;
