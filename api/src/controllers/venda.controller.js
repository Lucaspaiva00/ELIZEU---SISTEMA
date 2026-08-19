const vendaService = require("../services/venda.service");

class VendaController {
    async listar(req, res) {
        try {
            const vendas = await vendaService.listar(req.usuario.empresaId);
            return res.json({ sucesso: true, vendas });
        } catch (error) {
            return res.status(400).json({ sucesso: false, mensagem: error.message });
        }
    }

    async buscarPorId(req, res) {
        try {
            const venda = await vendaService.buscarPorId(Number(req.params.id), req.usuario.empresaId);
            return res.json({ sucesso: true, venda });
        } catch (error) {
            return res.status(404).json({ sucesso: false, mensagem: error.message });
        }
    }

    async faturar(req, res) {
        try {
            const venda = await vendaService.faturar(Number(req.params.id), {
                empresaId: req.usuario.empresaId,
                usuarioId: req.usuario.id
            });
            return res.json({ sucesso: true, mensagem: "Venda faturada com sucesso.", venda });
        } catch (error) {
            return res.status(400).json({ sucesso: false, mensagem: error.message });
        }
    }

    async cancelar(req, res) {
        try {
            const venda = await vendaService.cancelar(
                Number(req.params.id),
                req.usuario.empresaId,
                req.body?.motivo
            );
            return res.json({ sucesso: true, mensagem: "Venda cancelada com sucesso.", venda });
        } catch (error) {
            return res.status(400).json({ sucesso: false, mensagem: error.message });
        }
    }
}

module.exports = new VendaController();
