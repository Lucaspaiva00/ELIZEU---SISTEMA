const nfeService = require("../services/nfe.service");

const { montarDocumento, gerarDanfe } = require("../services/nfeDocumentos");

async function baixarDocumento(req, res, pdf) {
    try {
        const { notaFiscal } = await nfeService.buscarPorVenda(Number(req.params.id), req.usuario.empresaId);
        if (notaFiscal?.modelo !== 55) {
            return res.status(404).json({ sucesso: false, mensagem: "NF-e de mercadorias não encontrada." });
        }
        const { xml, data } = montarDocumento(notaFiscal);
        const arquivo = pdf ? await gerarDanfe(notaFiscal, data) : xml;
        const nome = pdf ? `DANFE-${notaFiscal.chaveAcesso}.pdf` : `${notaFiscal.chaveAcesso}-procNFe.xml`;
        return res.set("Cache-Control", "private, no-store").attachment(nome)
            .type(pdf ? "application/pdf" : "application/xml").send(arquivo);
    } catch (error) {
        return res.status(422).json({ sucesso: false, mensagem: error.message });
    }
}

class NfeController {
    baixarXml(req, res) {
        return baixarDocumento(req, res, false);
    }

    baixarDanfe(req, res) {
        return baixarDocumento(req, res, true);
    }

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
            return res.json({ sucesso: true, mensagem: resultado.notaFiscal?.status === "AUTORIZADA" ? "NF-e autorizada pela SEFAZ." : "Consulte o status da NF-e.", ...resultado });
        } catch (error) {
            return res.status(422).json({ sucesso: false, mensagem: error.message });
        }
    }

    async consultar(req, res) {
        try {
            const resultado = await nfeService.consultar(Number(req.params.id), req.usuario.empresaId);
            return res.json({ sucesso: true, mensagem: "Última situação registrada da NF-e.", ...resultado });
        } catch (error) {
            return res.status(422).json({ sucesso: false, mensagem: error.message });
        }
    }

    async cancelar(req, res) {
        try {
            if (req.body?.confirmado !== true) throw new Error("Confirme o cancelamento fiscal da NF-e.");
            const resultado = await nfeService.cancelar(Number(req.params.id), req.usuario.empresaId, req.body?.justificativa);
            return res.json({ sucesso: true, mensagem: resultado.notaFiscal?.status === "CANCELADA" ? "NF-e cancelada." : "Cancelamento da NF-e solicitado.", ...resultado });
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
