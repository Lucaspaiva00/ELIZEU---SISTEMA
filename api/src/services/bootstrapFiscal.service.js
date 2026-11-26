const prisma = require("../config/prisma");
const { criptografarCertificado } = require("../utils/certificadoCrypto");

async function executarBootstrapFiscal() {
    const empresaId = Number(process.env.FISCAL_BOOTSTRAP_EMPRESA_ID || 0);
    const cnpj = String(process.env.FISCAL_BOOTSTRAP_CNPJ || "").replace(/\D/g, "");
    const razaoSocial = String(process.env.FISCAL_BOOTSTRAP_RAZAO_SOCIAL || "").trim();
    const arquivoBase64 = String(process.env.FISCAL_BOOTSTRAP_CERT_BASE64 || "").trim();
    const senha = String(process.env.FISCAL_BOOTSTRAP_CERT_PASSWORD || "");
    const nomeArquivo = String(process.env.FISCAL_BOOTSTRAP_CERT_NAME || "").trim();
    const validadeTexto = String(process.env.FISCAL_BOOTSTRAP_CERT_VALID_UNTIL || "").trim();
    const cidade = String(process.env.FISCAL_BOOTSTRAP_CIDADE || "").trim();
    const estado = String(process.env.FISCAL_BOOTSTRAP_ESTADO || "").trim().toUpperCase();
    const codigoMunicipio = String(process.env.FISCAL_BOOTSTRAP_CODIGO_MUNICIPIO || "").trim();
    const ie = String(process.env.FISCAL_BOOTSTRAP_IE || "").trim();
    const im = String(process.env.FISCAL_BOOTSTRAP_IM || "").trim();
    const cnae = String(process.env.FISCAL_BOOTSTRAP_CNAE || "").trim();
    const cep = String(process.env.FISCAL_BOOTSTRAP_CEP || "").replace(/\D/g, "");
    const endereco = String(process.env.FISCAL_BOOTSTRAP_ENDERECO || "").trim();
    const numero = String(process.env.FISCAL_BOOTSTRAP_NUMERO || "").trim();
    const bairro = String(process.env.FISCAL_BOOTSTRAP_BAIRRO || "").trim();
    const pisCst = String(process.env.FISCAL_BOOTSTRAP_PIS_CST || "").trim();
    const cofinsCst = String(process.env.FISCAL_BOOTSTRAP_COFINS_CST || "").trim();
    const proximoNumeroNfe = Number(process.env.FISCAL_BOOTSTRAP_PROXIMO_NUMERO_NFE || 0);

    if (!empresaId || !cnpj) return;

    const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } });
    if (!empresa) throw new Error("Empresa do bootstrap fiscal não encontrada.");

    const conflito = await prisma.empresa.findFirst({
        where: { cnpj, id: { not: empresaId } },
        select: { id: true }
    });
    if (conflito) throw new Error("O CNPJ do certificado já pertence a outra empresa do ERP.");

    const dataEmpresa = { cnpj };
    if (razaoSocial) dataEmpresa.razaoSocial = razaoSocial;
    if (cidade) dataEmpresa.cidade = cidade;
    if (estado) dataEmpresa.estado = estado;
    if (ie) dataEmpresa.inscricaoEstadual = ie;
    if (cep) dataEmpresa.cep = cep;
    if (endereco) dataEmpresa.endereco = endereco;
    if (numero) dataEmpresa.numero = numero;
    if (bairro) dataEmpresa.bairro = bairro;
    await prisma.empresa.update({ where: { id: empresaId }, data: dataEmpresa });

    if (codigoMunicipio) {
        await prisma.configuracaoFiscal.upsert({
            where: { empresaId },
            // O bootstrap só preenche a configuração na primeira instalação.
            // A operação fiscal e a numeração passam a ser mantidas no ERP.
            update: {},
            create: {
                empresaId,
                codigoMunicipio,
                ambiente: "HOMOLOGACAO",
                regimeTributario: "SIMPLES_NACIONAL",
                crt: 1,
                serieNfe: 1,
                proximoNumeroNfe: proximoNumeroNfe > 0 ? proximoNumeroNfe : 1,
                cfopPadrao: "5101",
                naturezaOperacao: "Venda de Producao do Estabelecimento",
                icmsSituacaoTributariaPadrao: "102",
                pisSituacaoTributariaPadrao: pisCst || null,
                cofinsSituacaoTributariaPadrao: cofinsCst || null,
                inscricaoMunicipal: im || null,
                cnaePrincipal: cnae || null,
                modalidadeFrete: 9,
                consumidorFinal: true,
                ativo: false
            }
        });
    }

    if (arquivoBase64 && senha && nomeArquivo) {
        const buffer = Buffer.from(arquivoBase64, "base64");
        if (!buffer.length || buffer[0] !== 0x30) {
            throw new Error("Certificado do bootstrap fiscal inválido.");
        }

        const criptografado = criptografarCertificado({ arquivoBase64, senha });
        const validade = validadeTexto ? new Date(validadeTexto) : null;

        await prisma.certificadoDigital.upsert({
            where: { empresaId },
            update: {
                nomeArquivo,
                ...criptografado,
                validade,
                ativo: true
            },
            create: {
                empresaId,
                nomeArquivo,
                ...criptografado,
                validade,
                ativo: true
            }
        });
    }

    console.log("[Fiscal bootstrap] Cadastro fiscal básico atualizado.");
}

module.exports = { executarBootstrapFiscal };
