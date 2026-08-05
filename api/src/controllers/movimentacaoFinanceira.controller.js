const movimentacaoService = require("../services/movimentacaoFinanceira.service");

class MovimentacaoFinanceiraController {

    async listar(req, res) {
        try {
            const resultado = await movimentacaoService.listar(
                req.usuario.empresaId,
                req.query
            );

            return res.json({
                sucesso: true,
                ...resultado
            });
        } catch (error) {
            return res.status(400).json({
                sucesso: false,
                mensagem: error.message
            });
        }
    }

    async resumo(req, res) {
        try {
            const resumo = await movimentacaoService.resumo(
                req.usuario.empresaId,
                req.query
            );

            return res.json({
                sucesso: true,
                resumo
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
            const movimentacao = await movimentacaoService.buscarPorId(
                Number(req.params.id),
                req.usuario.empresaId
            );

            return res.json({
                sucesso: true,
                movimentacao
            });
        } catch (error) {
            return res.status(404).json({
                sucesso: false,
                mensagem: error.message
            });
        }
    }

    async criarManual(req, res) {
        try {
            const movimentacao = await movimentacaoService.criarManual({
                ...req.body,
                empresaId: req.usuario.empresaId,
                usuarioId: req.usuario.id
            });

            return res.status(201).json({
                sucesso: true,
                mensagem: "Movimentação manual registrada.",
                movimentacao
            });
        } catch (error) {
            return res.status(400).json({
                sucesso: false,
                mensagem: error.message
            });
        }
    }

    async transferir(req, res) {
        try {
            const resultado = await movimentacaoService.transferir({
                ...req.body,
                empresaId: req.usuario.empresaId,
                usuarioId: req.usuario.id
            });

            return res.status(201).json({
                sucesso: true,
                mensagem: "Transferência registrada com sucesso.",
                ...resultado
            });
        } catch (error) {
            return res.status(400).json({
                sucesso: false,
                mensagem: error.message
            });
        }
    }

    async estornar(req, res) {
        try {
            const resultado = await movimentacaoService.estornar(
                Number(req.params.id),
                {
                    ...req.body,
                    empresaId: req.usuario.empresaId,
                    usuarioId: req.usuario.id
                }
            );

            return res.json({
                sucesso: true,
                mensagem: "Movimentação estornada com sucesso.",
                ...resultado
            });
        } catch (error) {
            return res.status(400).json({
                sucesso: false,
                mensagem: error.message
            });
        }
    }
}

module.exports = new MovimentacaoFinanceiraController();
