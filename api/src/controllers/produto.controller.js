const produtoService = require("../services/produto.service");

class ProdutoController {

    async criar(req, res) {

        try {

            const produto = await produtoService.criar({
                ...req.body,
                empresaId: req.usuario.empresaId
            });

            return res.status(201).json({
                sucesso: true,
                produto
            });

        } catch (error) {

            return res.status(400).json({
                sucesso: false,
                mensagem: error.message
            });

        }

    }

    async listar(req, res) {

        try {

            const produtos = await produtoService.listar(
                req.usuario.empresaId
            );

            return res.json({
                sucesso: true,
                produtos
            });

        } catch (error) {

            return res.status(400).json({
                sucesso: false,
                mensagem: error.message
            });

        }

    }

    async buscarPorId(req, res) {

        try {

            const produto = await produtoService.buscarPorId(
                Number(req.params.id)
            );

            return res.json({
                sucesso: true,
                produto
            });

        } catch (error) {

            return res.status(404).json({
                sucesso: false,
                mensagem: error.message
            });

        }

    }

    async duplicar(req, res) {
        try {
            const produto = await produtoService.duplicar(
                Number(req.params.id),
                req.usuario.empresaId
            );

            return res.status(201).json({
                sucesso: true,
                mensagem: "Produto duplicado com sucesso.",
                produto
            });
        } catch (error) {
            return res.status(400).json({
                sucesso: false,
                mensagem: error.message
            });
        }
    }

    async atualizar(req, res) {

        try {

            const produto = await produtoService.atualizar(
                Number(req.params.id),
                {
                    ...req.body,
                    empresaId: req.usuario.empresaId
                }
            );

            return res.json({
                sucesso: true,
                produto
            });

        } catch (error) {

            return res.status(400).json({
                sucesso: false,
                mensagem: error.message
            });

        }

    }

    async listarMovimentacoesEstoquePrincipal(req, res) {
        try {
            const movimentacoes = await produtoService.listarMovimentacoesEstoquePrincipal(
                Number(req.params.id),
                req.usuario.empresaId,
                req.query.limite
            );

            return res.json({ sucesso: true, movimentacoes });
        } catch (error) {
            return res.status(400).json({ sucesso: false, mensagem: error.message });
        }
    }

    async adicionarEntradaEstoquePrincipal(req, res) {
        try {
            const resultado = await produtoService.adicionarEntradaEstoquePrincipal(
                Number(req.params.id),
                {
                    ...req.body,
                    empresaId: req.usuario.empresaId,
                    responsavelId: req.usuario.id
                }
            );

            return res.json({
                sucesso: true,
                mensagem: "Entrada registrada no estoque principal.",
                ...resultado
            });
        } catch (error) {
            return res.status(400).json({ sucesso: false, mensagem: error.message });
        }
    }

    async ajustarEstoquePrincipal(req, res) {
        try {
            const resultado = await produtoService.ajustarEstoquePrincipal(
                Number(req.params.id),
                {
                    ...req.body,
                    empresaId: req.usuario.empresaId,
                    responsavelId: req.usuario.id
                }
            );

            return res.json({
                sucesso: true,
                mensagem: "Estoque principal ajustado com sucesso.",
                ...resultado
            });
        } catch (error) {
            return res.status(400).json({ sucesso: false, mensagem: error.message });
        }
    }

    async excluir(req, res) {

        try {

            await produtoService.excluir(
                Number(req.params.id)
            );

            return res.json({
                sucesso: true,
                mensagem: "Produto removido com sucesso."
            });

        } catch (error) {

            return res.status(400).json({
                sucesso: false,
                mensagem: error.message
            });

        }

    }

}

module.exports = new ProdutoController();
