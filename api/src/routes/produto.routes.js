const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const { autorizar, autorizarQualquer } = require("../middlewares/permissions.middleware");
const prisma = require("../config/prisma");
const produtoController = require("../controllers/produto.controller");

const consultarProdutos = autorizarQualquer(
    "produtos.visualizar",
    "orcamentos.visualizar",
    "fiscal.visualizar"
);

router.post("/", auth, autorizar("produtos.criar"), produtoController.criar);
router.get("/", auth, consultarProdutos, produtoController.listar);
router.get('/classificacoes-rtc', auth, consultarProdutos, (req, res) => {
    const rtc = require('../utils/classificacaoRtc');
    res.json({ sucesso: true, fonte: rtc.catalogo.fonte, consultadoEm: rtc.catalogo.consultadoEm, classificacoes: rtc.listar() });
});
router.get("/estoque/fornecedores", auth, autorizar("produtos.movimentar_estoque"), produtoController.listarFornecedores);
router.post("/:id/duplicar", auth, autorizar("produtos.duplicar"), produtoController.duplicar);
router.get("/:id/estoque-principal/movimentacoes", auth, autorizar("produtos.visualizar"), produtoController.listarMovimentacoesEstoquePrincipal);
router.post("/:id/estoque-principal/entrada", auth, autorizar("produtos.movimentar_estoque"), produtoController.adicionarEntradaEstoquePrincipal);
router.post("/:id/estoque-principal/ajuste", auth, autorizar("produtos.movimentar_estoque"), produtoController.ajustarEstoquePrincipal);
router.get("/:id", auth, consultarProdutos, produtoController.buscarPorId);
router.put("/:id/classificacao-fiscal", auth, autorizar("produtos.editar"), async (req, res, next) => {
    const id = Number(req.params.id);
    const { ncm, origemMercadoria } = req.body || {};
    if (!Number.isSafeInteger(id) || id <= 0 || typeof ncm !== "string" || !/^\d{8}$/.test(ncm)
        || typeof origemMercadoria !== "string" || !/^[0-8]$/.test(origemMercadoria)) {
        return res.status(400).json({ sucesso: false, mensagem: "Informe um NCM de oito dígitos e uma origem válida." });
    }
    try {
        const { count } = await prisma.produto.updateMany({
            where: { id, empresaId: req.usuario.empresaId },
            data: { ncm, origemMercadoria }
        });
        if (!count) return res.status(404).json({ sucesso: false, mensagem: "Produto não encontrado." });
        return res.json({ sucesso: true, mensagem: "Classificação fiscal salva." });
    } catch (erro) {
        return next(erro);
    }
});
router.put("/:id", auth, autorizar("produtos.editar"), produtoController.atualizar);
router.delete("/:id", auth, autorizar("produtos.excluir"), produtoController.excluir);

module.exports = router;
