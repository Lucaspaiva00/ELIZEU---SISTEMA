const sacmaisService = require("../services/sacmais.service");

class SacMaisController {
    async webhook(req, res) {
        try {
            if (!sacmaisService.validarWebhook(req)) {
                return res.status(401).json({
                    sucesso: false,
                    mensagem: "Webhook SacMais não autorizado."
                });
            }

            const empresaId = Number(req.params.empresaId);
            if (!Number.isInteger(empresaId) || empresaId <= 0) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "empresaId inválido."
                });
            }

            const resultado = await sacmaisService.receberWebhook(empresaId, req.body);

            return res.status(200).json({
                sucesso: true,
                ...resultado,
                clienteId: resultado?.cliente?.id || null
            });
        } catch (error) {
            console.error("[SacMais webhook]", error);
            return res.status(400).json({
                sucesso: false,
                mensagem: error.message
            });
        }
    }

    async importarContato(req, res) {
        try {
            const resultado = await sacmaisService.importarContatoPorNumero(
                req.usuario.empresaId,
                req.params.contactNumber
            );

            return res.json({
                sucesso: true,
                ...resultado,
                clienteId: resultado.cliente.id
            });
        } catch (error) {
            console.error("[SacMais contato]", error);
            return res.status(502).json({
                sucesso: false,
                mensagem: error.message
            });
        }
    }


    async importarHistorico(req, res) {
        try {
            const resultado = await sacmaisService.importarHistoricoPagina(
                req.usuario.empresaId,
                req.body?.pagina,
                req.body?.limite
            );

            return res.json({
                sucesso: true,
                ...resultado
            });
        } catch (error) {
            console.error("[SacMais histórico]", error);
            return res.status(502).json({
                sucesso: false,
                mensagem: error.message
            });
        }
    }

    async configuracao(req, res) {
        const protocolo = req.headers["x-forwarded-proto"] || req.protocol;
        const host = req.get("host");
        const basePublica = process.env.PUBLIC_API_URL || `${protocolo}://${host}`;

        return res.json({
            sucesso: true,
            tokenApiConfigurado: Boolean(process.env.SACMAIS_API_TOKEN),
            webhookProtegido: Boolean(process.env.SACMAIS_WEBHOOK_SECRET),
            webhookUrl: `${basePublica.replace(/\/$/, "")}/api/integracoes/sacmais/webhook/${req.usuario.empresaId}`
        });
    }
}

module.exports = new SacMaisController();
