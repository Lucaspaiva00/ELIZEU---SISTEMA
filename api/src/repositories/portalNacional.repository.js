const https = require("https");
const prisma = require("../config/prisma");
const { descriptografarCertificado } = require("../utils/certificadoCrypto");

function baseUrl(ambiente) {
    return ambiente === "PRODUCAO"
        ? "https://sefin.nfse.gov.br/SefinNacional"
        : "https://sefin.producaorestrita.nfse.gov.br/SefinNacional";
}

function requisicaoJson({ url, pfx, passphrase, metodo = "GET" }) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, {
            method: metodo,
            pfx,
            passphrase,
            minVersion: "TLSv1.2",
            headers: { Accept: "application/json" }
        }, (res) => {
            const chunks = [];
            res.on("data", (chunk) => chunks.push(chunk));
            res.on("end", () => {
                const body = Buffer.concat(chunks).toString("utf8");
                let dados = body;
                try { dados = body ? JSON.parse(body) : null; } catch (_) {}
                resolve({ status: res.statusCode, dados });
            });
        });

        req.on("error", reject);
        req.setTimeout(20000, () => req.destroy(new Error("Tempo limite ao conectar ao Portal Nacional.")));
        req.end();
    });
}

class PortalNacionalRepository {
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
            empresa: {
                razaoSocial: empresa.razaoSocial,
                nomeFantasia: empresa.nomeFantasia,
                cnpj: empresa.cnpj
            },
            ambiente: fiscal?.ambiente || "HOMOLOGACAO",
            codigoMunicipio: fiscal?.codigoMunicipio || null,
            certificado: empresa.certificadoDigital || null,
            pendencias,
            prontoParaTestar: pendencias.every((p) => p !== "certificado A1" && p !== "código IBGE do município")
        };
    }

    async testar(empresaId) {
        const empresa = await prisma.empresa.findUnique({
            where: { id: empresaId },
            include: { configuracaoFiscal: true, certificadoDigital: true }
        });

        if (!empresa?.certificadoDigital?.ativo) throw new Error("Certificado A1 não configurado.");
        if (!empresa?.configuracaoFiscal?.codigoMunicipio) {
            throw new Error("Informe o código IBGE do município na configuração fiscal antes do teste.");
        }

        const certificado = descriptografarCertificado(empresa.certificadoDigital);
        const pfx = Buffer.from(certificado.arquivoBase64, "base64");
        const ambiente = empresa.configuracaoFiscal.ambiente || "HOMOLOGACAO";
        const url = `${baseUrl(ambiente)}/parametros_municipais/${empresa.configuracaoFiscal.codigoMunicipio}/convenio`;

        const resposta = await requisicaoJson({
            url,
            pfx,
            passphrase: certificado.senha
        });

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
