const contaReceberService = require("../services/contaReceber.service");

class ContaReceberController {

    async criar(req, res) {
        try {
            const contaReceber = await contaReceberService.criar({
                ...req.body,
                empresaId: req.usuario.empresaId
            });

            return res.status(201).json({
                sucesso: true,
                contaReceber
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
            const resultado = await contaReceberService.listar(
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
            const resumo = await contaReceberService.resumo(
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
            const contaReceber = await contaReceberService.buscarPorId(
                Number(req.params.id),
                req.usuario.empresaId
            );

            return res.json({
                sucesso: true,
                contaReceber
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
            const contaReceber = await contaReceberService.atualizar(
                Number(req.params.id),
                {
                    ...req.body,
                    empresaId: req.usuario.empresaId
                }
            );

            return res.json({
                sucesso: true,
                contaReceber
            });
        } catch (error) {
            return res.status(400).json({
                sucesso: false,
                mensagem: error.message
            });
        }
    }

    async receber(req, res) {
        try {
            const resultado = await contaReceberService.receber(
                Number(req.params.id),
                {
                    ...req.body,
                    empresaId: req.usuario.empresaId,
                    usuarioId: req.usuario.id
                }
            );

            return res.json({
                sucesso: true,
                mensagem: resultado.contaReceber.status === "PAGO"
                    ? "Conta recebida integralmente."
                    : "Recebimento parcial registrado.",
                ...resultado
            });
        } catch (error) {
            return res.status(400).json({
                sucesso: false,
                mensagem: error.message
            });
        }
    }

    async cancelar(req, res) {
        try {
            const contaReceber = await contaReceberService.cancelar(
                Number(req.params.id),
                {
                    ...req.body,
                    empresaId: req.usuario.empresaId
                }
            );

            return res.json({
                sucesso: true,
                mensagem: "Conta a receber cancelada.",
                contaReceber
            });
        } catch (error) {
            return res.status(400).json({
                sucesso: false,
                mensagem: error.message
            });
        }
    }
}

module.exports = new ContaReceberController();
