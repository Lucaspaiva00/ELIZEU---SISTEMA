const sacmaisService = require("../services/sacmais.service");

class SacMaisController {
    async importarClientes(req, res) {
        try {
            const resultado = await sacmaisService.importarClientes(req.usuario.empresaId);
            return res.json({ sucesso: true, ...resultado });
        } catch (error) {
            console.error("[SacMais]", error);
            return res.status(502).json({ sucesso: false, mensagem: error.message });
        }
    }

    async webhook(req, res) {
        try {
            const secret = process.env.SACMAIS_WEBHOOK_SECRET;
            if (secret && req.headers["x-sacmais-secret"] !== secret) {
                return res.status(401).json({ sucesso: false, mensagem: "Webhook não autorizado." });
            }

            const empresaId = Number(req.params.empresaId);
            if (!empresaId) {
                return res.status(400).json({ sucesso: false, mensagem: "empresaId inválido." });
            }

            const cliente = await sacmaisService.receberWebhook(empresaId, req.body);
            return res.status(200).json({ sucesso: true, clienteId: cliente.id });
        } catch (error) {
            console.error("[SacMais webhook]", error);
            return res.status(400).json({ sucesso: false, mensagem: error.message });
        }
    }
}

module.exports = new SacMaisController();
