const contaPagarService = require("../services/contaPagar.service");

class ContaPagarController {

    async criar(req, res) {
        try {
            const contasPagar = await contaPagarService.criar({
                ...req.body,
                empresaId: req.usuario.empresaId
            });

            return res.status(201).json({
                sucesso: true,
                mensagem: contasPagar.length > 1
                    ? `${contasPagar.length} contas a pagar geradas.`
                    : "Conta a pagar criada.",
                contasPagar
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
            const resultado = await contaPagarService.listar(
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
            const resumo = await contaPagarService.resumo(
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
            const contaPagar = await contaPagarService.buscarPorId(
                Number(req.params.id),
                req.usuario.empresaId
            );

            return res.json({
                sucesso: true,
                contaPagar
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
            const contaPagar = await contaPagarService.atualizar(
                Number(req.params.id),
                {
                    ...req.body,
                    empresaId: req.usuario.empresaId
                }
            );

            return res.json({
                sucesso: true,
                contaPagar
            });
        } catch (error) {
            return res.status(400).json({
                sucesso: false,
                mensagem: error.message
            });
        }
    }

    async pagar(req, res) {
        try {
            const resultado = await contaPagarService.pagar(
                Number(req.params.id),
                {
                    ...req.body,
                    empresaId: req.usuario.empresaId,
                    usuarioId: req.usuario.id
                }
            );

            return res.json({
                sucesso: true,
                mensagem: resultado.contaPagar.status === "PAGO"
                    ? "Conta paga integralmente."
                    : "Pagamento parcial registrado.",
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
            const contaPagar = await contaPagarService.cancelar(
                Number(req.params.id),
                {
                    ...req.body,
                    empresaId: req.usuario.empresaId
                }
            );

            return res.json({
                sucesso: true,
                mensagem: "Conta a pagar cancelada.",
                contaPagar
            });
        } catch (error) {
            return res.status(400).json({
                sucesso: false,
                mensagem: error.message
            });
        }
    }
}

module.exports = new ContaPagarController();
