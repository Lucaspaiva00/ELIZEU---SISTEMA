const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const { autorizar, autorizarQualquer } = require("../middlewares/permissions.middleware");
const produtoController = require("../controllers/produto.controller");

const consultarProdutos = autorizarQualquer(
    "produtos.visualizar",
    "orcamentos.visualizar",
    "fiscal.visualizar"
);

router.post("/", auth, autorizar("produtos.criar"), produtoController.criar);
router.get("/", auth, consultarProdutos, produtoController.listar);
router.post("/:id/duplicar", auth, autorizar("produtos.duplicar"), produtoController.duplicar);
router.get("/:id/estoque-principal/movimentacoes", auth, autorizar("produtos.visualizar"), produtoController.listarMovimentacoesEstoquePrincipal);
router.post("/:id/estoque-principal/entrada", auth, autorizar("produtos.movimentar_estoque"), produtoController.adicionarEntradaEstoquePrincipal);
router.post("/:id/estoque-principal/ajuste", auth, autorizar("produtos.movimentar_estoque"), produtoController.ajustarEstoquePrincipal);
router.get("/:id", auth, consultarProdutos, produtoController.buscarPorId);
router.put("/:id", auth, autorizar("produtos.editar"), produtoController.atualizar);
router.delete("/:id", auth, autorizar("produtos.excluir"), produtoController.excluir);

module.exports = router;
