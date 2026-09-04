const nfeService = require("../services/nfe.service");

class NfeController {
    async validar(req, res) {
        try {
            const resultado = await nfeService.validar(Number(req.params.id), req.usuario.empresaId);
            return res.json({ sucesso: true, pronta: resultado.pronta, pendencias: resultado.pendencias, notaFiscal: resultado.venda.notaFiscal || null });
        } catch (error) {
            return res.status(400).json({ sucesso: false, mensagem: error.message });
        }
    }

    async preparar(req, res) {
        try {
            const resultado = await nfeService.preparar(Number(req.params.id), req.usuario.empresaId);
            if (!resultado.pronta) {
                return res.status(422).json({ sucesso: false, mensagem: "Existem pendências para emissão da NF-e.", pendencias: resultado.pendencias, notaFiscal: resultado.notaFiscal });
            }
            return res.json({ sucesso: true, mensagem: resultado.existente ? "NF-e já estava preparada." : "NF-e preparada para transmissão.", notaFiscal: resultado.notaFiscal });
        } catch (error) {
            return res.status(400).json({ sucesso: false, mensagem: error.message });
        }
    }

    async emitir(req, res) {
        try {
            const resultado = await nfeService.emitir(Number(req.params.id), req.usuario.empresaId);
            if (!resultado.pronta) {
                return res.status(422).json({ sucesso: false, mensagem: "Existem pendências para emissão da NF-e.", pendencias: resultado.pendencias, notaFiscal: resultado.notaFiscal });
            }
            return res.json({ sucesso: true, mensagem: resultado.notaFiscal?.status === "AUTORIZADA" ? "NF-e autorizada pela SEFAZ." : "NF-e enviada para a Focus NFe. Consulte o status se ainda estiver processando.", ...resultado });
        } catch (error) {
            return res.status(422).json({ sucesso: false, mensagem: error.message });
        }
    }

    async consultar(req, res) {
        try {
            const resultado = await nfeService.consultar(Number(req.params.id), req.usuario.empresaId);
            return res.json({ sucesso: true, mensagem: "Situação da NF-e atualizada.", ...resultado });
        } catch (error) {
            return res.status(422).json({ sucesso: false, mensagem: error.message });
        }
    }

    async cancelar(req, res) {
        try {
            const resultado = await nfeService.cancelar(Number(req.params.id), req.usuario.empresaId, req.body?.justificativa);
            return res.json({ sucesso: true, mensagem: resultado.notaFiscal?.status === "CANCELADA" ? "NF-e cancelada." : "Solicitação de cancelamento enviada à Focus NFe.", ...resultado });
        } catch (error) {
            return res.status(422).json({ sucesso: false, mensagem: error.message });
        }
    }

    async buscar(req, res) {
        try {
            const resultado = await nfeService.buscarPorVenda(Number(req.params.id), req.usuario.empresaId);
            return res.json({ sucesso: true, notaFiscal: resultado.notaFiscal });
        } catch (error) {
            return res.status(400).json({ sucesso: false, mensagem: error.message });
        }
    }
}

module.exports = new NfeController();
