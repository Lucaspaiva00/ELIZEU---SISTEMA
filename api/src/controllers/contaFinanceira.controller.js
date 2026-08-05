const contaFinanceiraService = require("../services/contaFinanceira.service");

class ContaFinanceiraController {

    async criar(req, res) {
        try {
            const contaFinanceira = await contaFinanceiraService.criar({
                ...req.body,
                empresaId: req.usuario.empresaId
            });

            return res.status(201).json({
                sucesso: true,
                contaFinanceira
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
            const contasFinanceiras = await contaFinanceiraService.listar(
                req.usuario.empresaId,
                req.query
            );

            return res.json({
                sucesso: true,
                contasFinanceiras
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
            const contaFinanceira = await contaFinanceiraService.buscarPorId(
                Number(req.params.id),
                req.usuario.empresaId
            );

            return res.json({
                sucesso: true,
                contaFinanceira
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
            const contaFinanceira = await contaFinanceiraService.atualizar(
                Number(req.params.id),
                {
                    ...req.body,
                    empresaId: req.usuario.empresaId
                }
            );

            return res.json({
                sucesso: true,
                contaFinanceira
            });
        } catch (error) {
            return res.status(400).json({
                sucesso: false,
                mensagem: error.message
            });
        }
    }

    async tornarPadrao(req, res) {
        try {
            const contaFinanceira = await contaFinanceiraService.tornarPadrao(
                Number(req.params.id),
                req.usuario.empresaId
            );

            return res.json({
                sucesso: true,
                mensagem: "Conta financeira definida como padrão.",
                contaFinanceira
            });
        } catch (error) {
            return res.status(400).json({
                sucesso: false,
                mensagem: error.message
            });
        }
    }

    async desativar(req, res) {
        try {
            const contaFinanceira = await contaFinanceiraService.desativar(
                Number(req.params.id),
                req.usuario.empresaId
            );

            return res.json({
                sucesso: true,
                mensagem: "Conta financeira desativada.",
                contaFinanceira
            });
        } catch (error) {
            return res.status(400).json({
                sucesso: false,
                mensagem: error.message
            });
        }
    }
}

module.exports = new ContaFinanceiraController();
