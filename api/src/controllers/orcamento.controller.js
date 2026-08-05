const orcamentoService = require("../services/orcamento.service");

class OrcamentoController {

    async criar(req, res) {
        try {
            const orcamento = await orcamentoService.criar({
                ...req.body,
                empresaId: req.usuario.empresaId,
                criadoPorId: req.usuario.id
            });

            return res.status(201).json({
                sucesso: true,
                orcamento
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
            const orcamentos = await orcamentoService.listar(
                req.usuario.empresaId
            );

            return res.json({
                sucesso: true,
                orcamentos
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
            const orcamento = await orcamentoService.buscarPorId(
                Number(req.params.id),
                req.usuario.empresaId
            );

            return res.json({
                sucesso: true,
                orcamento
            });
        } catch (error) {
            return res.status(404).json({
                sucesso: false,
                mensagem: error.message
            });
        }
    }

    async atualizar(req, res) {
        try {
            const orcamento = await orcamentoService.atualizar(
                Number(req.params.id),
                {
                    ...req.body,
                    empresaId: req.usuario.empresaId
                }
            );

            return res.json({
                sucesso: true,
                orcamento
            });
        } catch (error) {
            return res.status(400).json({
                sucesso: false,
                mensagem: error.message
            });
        }
    }

    async aprovar(req, res) {
        try {
            const resultado = await orcamentoService.aprovar(
                Number(req.params.id),
                {
                    ...req.body,
                    empresaId: req.usuario.empresaId,
                    usuarioId: req.usuario.id
                }
            );

            return res.json({
                sucesso: true,
                mensagem: "Orçamento aprovado e venda gerada com sucesso.",
                ...resultado
            });
        } catch (error) {
            return res.status(400).json({
                sucesso: false,
                mensagem: error.message
            });
        }
    }

    async excluir(req, res) {
        try {
            await orcamentoService.excluir(
                Number(req.params.id),
                req.usuario.empresaId
            );

            return res.json({
                sucesso: true,
                mensagem: "Orçamento removido com sucesso."
            });
        } catch (error) {
            return res.status(400).json({
                sucesso: false,
                mensagem: error.message
            });
        }
    }
}

module.exports = new OrcamentoController();
