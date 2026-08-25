const sacmaisService = require("../services/sacmais.service");
const sacmaisEnvioService = require("../services/sacmais.envio.service");
const orcamentoService = require("../services/orcamento.service");

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

    async enviarOrcamento(req, res) {
        try {
            const orcamentoId = Number(req.params.orcamentoId);

            if (!Number.isInteger(orcamentoId) || orcamentoId <= 0) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "Orçamento inválido."
                });
            }

            const orcamento = await orcamentoService.buscarPorId(
                orcamentoId,
                req.usuario.empresaId
            );

            const cliente = orcamento.cliente || {};
            const telefone = cliente.celular || cliente.telefone;
            const numero = sacmaisEnvioService.normalizarNumeroWhatsApp(telefone);

            if (!numero || numero.length < 12) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "O cliente não possui um WhatsApp válido cadastrado."
                });
            }

            const base64Recebido = String(req.body?.pdfBase64 || "").trim();
            const base64 = base64Recebido.replace(/^data:application\/pdf;base64,/i, "");

            if (!base64) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "O PDF do orçamento não foi enviado pelo navegador."
                });
            }

            let pdfBuffer;

            try {
                pdfBuffer = Buffer.from(base64, "base64");
            } catch {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "PDF do orçamento inválido."
                });
            }

            if (
                !pdfBuffer.length ||
                pdfBuffer.length < 100 ||
                pdfBuffer.subarray(0, 4).toString("ascii") !== "%PDF"
            ) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "O PDF do orçamento está vazio ou inválido."
                });
            }

            if (pdfBuffer.length > 6 * 1024 * 1024) {
                return res.status(413).json({
                    sucesso: false,
                    mensagem: "O PDF ultrapassou 6 MB. Reduza o tamanho do orçamento e tente novamente."
                });
            }

            const nomeArquivo = String(
                req.body?.nomeArquivo ||
                `ORCAMENTO-${String(orcamento.numero).padStart(5, "0")}-POTENCIA-PADROES.pdf`
            )
                .trim()
                .replace(/[\\/:*?"<>|]+/g, "-");

            const mensagem = String(req.body?.mensagem || "").trim();

            if (!mensagem) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "Informe a mensagem que será enviada junto com o orçamento."
                });
            }

            const tokenArquivo = sacmaisEnvioService.registrarArquivoTemporario(
                pdfBuffer,
                nomeArquivo,
                "application/pdf"
            );

            const protocolo = req.headers["x-forwarded-proto"] || req.protocol;
            const host = req.get("host");
            const basePublica = (process.env.PUBLIC_API_URL || `${protocolo}://${host}`).replace(/\/$/, "");
            const urlArquivo = `${basePublica}/api/integracoes/sacmais/arquivos/${tokenArquivo}`;

            const envio = await sacmaisEnvioService.enviarDocumento({
                telefone: numero,
                contatoId: cliente.sacmaisId || null,
                urlArquivo,
                nomeArquivo,
                mensagem
            });

            const atualizado = await orcamentoService.marcarEnviado(
                orcamentoId,
                req.usuario.empresaId
            );

            return res.json({
                sucesso: true,
                mensagem: "Orçamento e PDF enviados pelo WhatsApp via SacMais.",
                envio: {
                    numero: envio.numero,
                    pathUsado: envio.pathUsado
                },
                orcamento: atualizado
            });
        } catch (error) {
            console.error("[SacMais envio orçamento]", error);

            return res.status(
                error.codigo === "SACMAIS_NAO_AUTORIZADO" ? 401 : 502
            ).json({
                sucesso: false,
                mensagem: error.message
            });
        }
    }

    async arquivoTemporario(req, res) {
        const arquivo = sacmaisEnvioService.obterArquivoTemporario(req.params.token);

        if (!arquivo) {
            return res.status(404).send("Arquivo expirado ou não encontrado.");
        }

        res.setHeader("Content-Type", arquivo.contentType || "application/octet-stream");
        res.setHeader(
            "Content-Disposition",
            `inline; filename="${arquivo.nomeArquivo.replace(/"/g, "")}"`
        );
        res.setHeader("Cache-Control", "private, max-age=300");
        return res.status(200).send(arquivo.buffer);
    }

    async configuracao(req, res) {
        const protocolo = req.headers["x-forwarded-proto"] || req.protocol;
        const host = req.get("host");
        const basePublica = process.env.PUBLIC_API_URL || `${protocolo}://${host}`;

        return res.json({
            sucesso: true,
            tokenApiConfigurado: Boolean(process.env.SACMAIS_API_TOKEN),
            webhookProtegido: Boolean(process.env.SACMAIS_WEBHOOK_SECRET),
            envioWhatsAppApiDisponivel: Boolean(process.env.SACMAIS_API_TOKEN),
            caminhoEnvioConfigurado: process.env.SACMAIS_SEND_MESSAGE_PATH || null,
            webhookUrl: `${basePublica.replace(/\/$/, "")}/api/integracoes/sacmais/webhook/${req.usuario.empresaId}`
        });
    }
}

module.exports = new SacMaisController();
