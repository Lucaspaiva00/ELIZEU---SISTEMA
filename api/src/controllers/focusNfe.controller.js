const focusNfeService = require("../services/focusNfe.service");

class FocusNfeController {
    async configuracao(req, res) {
        try {
            const configuracao = await focusNfeService.obterConfiguracao(req.usuario.empresaId);
            return res.json({ sucesso: true, configuracao });
        } catch (erro) {
            return res.status(400).json({ sucesso: false, mensagem: erro.message });
        }
    }

    async salvar(req, res) {
        try {
            const configuracao = await focusNfeService.salvarConfiguracao(
                req.usuario.empresaId,
                req.body || {}
            );
            return res.json({
                sucesso: true,
                mensagem: "Integração Focus NFe salva com segurança.",
                configuracao
            });
        } catch (erro) {
            return res.status(400).json({ sucesso: false, mensagem: erro.message });
        }
    }

    async testar(req, res) {
        try {
            const resultado = await focusNfeService.testar(
                req.usuario.empresaId,
                String(req.body?.ambiente || "HOMOLOGACAO").toUpperCase()
            );
            return res.json(resultado);
        } catch (erro) {
            return res.status(422).json({ sucesso: false, mensagem: erro.message });
        }
    }
}

module.exports = new FocusNfeController();
