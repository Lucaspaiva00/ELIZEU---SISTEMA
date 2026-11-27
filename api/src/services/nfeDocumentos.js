const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { XMLParser } = require("fast-xml-parser");
const { NFEGerarDanfe } = require("@treeunfe/danfe");

const ns = "http://www.portalfiscal.inf.br/nfe";

function montarDocumento(nota) {
    if (!["AUTORIZADA", "CANCELADA"].includes(nota.status) || !nota.protocolo
        || !/^52\d{42}$/.test(nota.chaveAcesso || "")) {
        throw new Error("A NF-e precisa ter autorização registrada para baixar o documento.");
    }
    const xmlNota = nota.xmlEnvio;
    const protocoloXml = nota.xmlRetorno?.match(/<protNFe\b[^>]*>[\s\S]*?<\/protNFe>/)?.[0];
    if (!xmlNota || !protocoloXml || /<!DOCTYPE|<!ENTITY/i.test(xmlNota + protocoloXml)) {
        throw new Error("O XML assinado ou o protocolo oficial da NF-e não está disponível.");
    }
    const xml = `<?xml version="1.0" encoding="UTF-8"?><nfeProc xmlns="${ns}" versao="4.00">${xmlNota}${protocoloXml}</nfeProc>`;
    const parser = new XMLParser({
        ignoreAttributes: false, attributeNamePrefix: "", parseTagValue: false, parseAttributeValue: false
    });
    const data = parser.parse(xml).nfeProc;
    const info = data?.NFe?.infNFe;
    const protocolo = data?.protNFe?.infProt;
    if (info?.Id !== `NFe${nota.chaveAcesso}` || !data?.NFe?.Signature
        || protocolo?.cStat !== "100" || protocolo?.chNFe !== nota.chaveAcesso
        || protocolo?.nProt !== nota.protocolo || protocolo?.tpAmb !== info?.ide?.tpAmb) {
        throw new Error("Os dados do protocolo da SEFAZ não correspondem ao XML assinado.");
    }
    return { xml, data };
}

async function gerarDanfe(nota, data) {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "elian-danfe-"));
    try {
        const arquivo = path.join(dir, "danfe.pdf");
        const gerador = new NFEGerarDanfe({
            data: {
                ...data,
                cancelada: nota.status === "CANCELADA",
                retEvento: nota.eventoCancelamento && {
                    tpEvento: "110111",
                    cStat: nota.eventoCancelamento.codigo,
                    nProt: nota.eventoCancelamento.protocolo,
                    dhRegEvento: nota.eventoCancelamento.registradoEm
                }
            },
            outputPath: arquivo
        });
        const resultado = await gerador.generatePDF(true);
        if (!resultado.success) throw new Error("Não foi possível gerar o DANFE.");
        return await fs.readFile(arquivo);
    } finally {
        await fs.rm(dir, { recursive: true, force: true });
    }
}

module.exports = { montarDocumento, gerarDanfe };
