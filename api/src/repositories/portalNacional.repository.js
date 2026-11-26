const https = require("https");
const prisma = require("../config/prisma");
const { descriptografarCertificado } = require("../utils/certificadoCrypto");

function baseUrl(ambiente) {
    return ambiente === "PRODUCAO"
        ? "https://adn.nfse.gov.br"
        : "https://adn.producaorestrita.nfse.gov.br";
}

function baseSefinUrl(ambiente) {
    return ambiente === "PRODUCAO"
        ? "https://sefin.nfse.gov.br/SefinNacional"
        : "https://sefin.producaorestrita.nfse.gov.br/API/SefinNacional";
}

function requisicaoJson({ url, pfx, passphrase, metodo = "GET", corpo = null }) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, {
            method: metodo,
            pfx,
            passphrase,
            minVersion: "TLSv1.2",
            headers: {
                Accept: "application/json",
                ...(corpo ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(corpo) } : {})
            }
        }, (res) => {
            const chunks = [];
            res.on("data", (chunk) => chunks.push(chunk));
            res.on("end", () => {
                const body = Buffer.concat(chunks).toString("utf8");
                let dados = body;
                try { dados = body ? JSON.parse(body) : null; } catch (_) {}
                resolve({ status: res.statusCode, dados, body });
            });
        });

        req.on("error", reject);
        req.setTimeout(20000, () => req.destroy(new Error("Tempo limite ao conectar ao Portal Nacional.")));
        if (corpo) req.write(corpo);
        req.end();
    });
}

class PortalNacionalRepository {
    async dadosEmpresa(empresaId) {
        const empresa = await prisma.empresa.findUnique({
            where: { id: empresaId },
            include: { configuracaoFiscal: true, certificadoDigital: true }
        });
        if (!empresa) throw new Error("Empresa não encontrada.");
        if (!empresa.certificadoDigital?.ativo) throw new Error("Certificado A1 não configurado.");
        if (!empresa.configuracaoFiscal?.codigoMunicipio) throw new Error("Código IBGE do município não configurado.");
        const certificado = descriptografarCertificado(empresa.certificadoDigital);
        return { empresa, fiscal: empresa.configuracaoFiscal, certificado, pfx: Buffer.from(certificado.arquivoBase64, "base64") };
    }

    async status(empresaId) {
        const empresa = await prisma.empresa.findUnique({
            where: { id: empresaId },
            include: {
                configuracaoFiscal: true,
                certificadoDigital: {
                    select: { id:true, nomeArquivo:true, validade:true, ativo:true, atualizadoEm:true }
                }
            }
        });
        if (!empresa) throw new Error("Empresa não encontrada.");

        const fiscal = empresa.configuracaoFiscal;
        const pendencias = [];
        if (!empresa.certificadoDigital?.ativo) pendencias.push("certificado A1");
        if (!fiscal?.codigoMunicipio) pendencias.push("código IBGE do município");
        if (!fiscal?.regimeTributario) pendencias.push("regime tributário");
        if (!fiscal?.cnaePrincipal) pendencias.push("CNAE principal");

        return {
            empresa: { razaoSocial: empresa.razaoSocial, nomeFantasia: empresa.nomeFantasia, cnpj: empresa.cnpj },
            ambiente: fiscal?.ambiente || "HOMOLOGACAO",
            codigoMunicipio: fiscal?.codigoMunicipio || null,
            certificado: empresa.certificadoDigital || null,
            pendencias,
            prontoParaTestar: pendencias.every((p) => p !== "certificado A1" && p !== "código IBGE do município")
        };
    }

    async consultarServico(empresaId, codigoServico) {
        const { fiscal, certificado, pfx } = await this.dadosEmpresa(empresaId);
        const codigo = String(codigoServico || "").replace(/\D/g, "");
        if (!codigo) throw new Error("Informe o código nacional do serviço.");

        const url = `${baseUrl(fiscal.ambiente || "HOMOLOGACAO")}/parametrizacao/${fiscal.codigoMunicipio}/${codigo}`;
        const resposta = await requisicaoJson({ url, pfx, passphrase: certificado.senha });
        return { ambiente: fiscal.ambiente || "HOMOLOGACAO", url, statusHttp: resposta.status, resposta: resposta.dados };
    }

    async enviarDps(empresaId, xmlDps, ambiente) {
        if (!["PRODUCAO", "HOMOLOGACAO"].includes(ambiente)) {
            throw new Error("Ambiente fiscal da DPS inválido.");
        }
        const { certificado, pfx } = await this.dadosEmpresa(empresaId);
        const zlib = require("zlib");
        const dpsCompactada = zlib.gzipSync(Buffer.from(xmlDps, "utf8")).toString("base64");
        const corpo = JSON.stringify({ dpsXmlGZipB64: dpsCompactada });
        const url = `${baseSefinUrl(ambiente)}/nfse`;
        const resposta = await requisicaoJson({ url, pfx, passphrase: certificado.senha, metodo: "POST", corpo });
        return { ambiente, url, statusHttp: resposta.status, resposta: resposta.dados, corpoResposta: resposta.body };
    }

    async testarSefin(empresaId) {
        const { fiscal, certificado, pfx } = await this.dadosEmpresa(empresaId);
        const ambiente = fiscal.ambiente || "HOMOLOGACAO";
        const url = `${baseSefinUrl(ambiente)}/nfse`;
        const zlib = require("zlib");
        const xmlTeste = `<?xml version="1.0" encoding="UTF-8"?><DPS xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.01"><infDPS Id="TESTE">${""}</infDPS></DPS>`;
        const dpsXmlGZipB64 = zlib.gzipSync(Buffer.from(xmlTeste, "utf8")).toString("base64");
        const corpo = JSON.stringify({ dpsXmlGZipB64 });
        const resposta = await requisicaoJson({ url, pfx, passphrase: certificado.senha, metodo: "POST", corpo });
        return { ambiente, url, statusHttp: resposta.status, resposta: resposta.dados, corpoResposta: resposta.body };
    }

    async testar(empresaId) {
        const { fiscal, certificado, pfx } = await this.dadosEmpresa(empresaId);
        const ambiente = fiscal.ambiente || "HOMOLOGACAO";
        const url = `${baseUrl(ambiente)}/parametrizacao/${fiscal.codigoMunicipio}/convenio`;
        const resposta = await requisicaoJson({ url, pfx, passphrase: certificado.senha });

        return {
            ambiente,
            url,
            statusHttp: resposta.status,
            conectado: resposta.status >= 200 && resposta.status < 500,
            resposta: resposta.dados
        };
    }
}

module.exports = new PortalNacionalRepository();
