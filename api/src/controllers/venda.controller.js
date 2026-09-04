const vendaService = require("../services/venda.service");
const empresaService = require("../services/empresa.service");
const nfeService = require("../services/nfe.service");

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
            const vendaId = Number(req.params.id);
            const venda = await vendaService.faturar(vendaId, {
                empresaId: req.usuario.empresaId,
                usuarioId: req.usuario.id
            });

            let notaFiscal = null;
            let avisoFiscal = null;
            const empresa = await empresaService.buscarPorId(req.usuario.empresaId);

            if (empresa?.configuracaoFiscal?.emitirNfeAoFaturar) {
                try {
                    const emissao = await nfeService.emitir(vendaId, req.usuario.empresaId);
                    notaFiscal = emissao.notaFiscal || null;
                    if (!emissao.pronta) {
                        avisoFiscal = (emissao.pendencias || []).map((item) => item.mensagem).join(" | ");
                    }
                } catch (erroFiscal) {
                    avisoFiscal = erroFiscal.message;
                }
            }

            return res.json({
                sucesso: true,
                mensagem: avisoFiscal
                    ? `Venda faturada com sucesso. A NF-e automática ficou pendente: ${avisoFiscal}`
                    : notaFiscal
                        ? `Venda faturada e NF-e ${notaFiscal.status === "AUTORIZADA" ? "autorizada" : "enviada para processamento"}.`
                        : "Venda faturada com sucesso.",
                venda,
                notaFiscal,
                avisoFiscal
            });
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
