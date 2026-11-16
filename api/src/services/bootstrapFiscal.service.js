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

    if (!empresaId || !cnpj || !arquivoBase64 || !senha || !nomeArquivo) return;

    const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } });
    if (!empresa) throw new Error("Empresa do bootstrap fiscal não encontrada.");

    const conflito = await prisma.empresa.findFirst({
        where: { cnpj, id: { not: empresaId } },
        select: { id: true }
    });
    if (conflito) throw new Error("O CNPJ do certificado já pertence a outra empresa do ERP.");

    const dataEmpresa = { cnpj };
    if (razaoSocial) dataEmpresa.razaoSocial = razaoSocial;
    await prisma.empresa.update({ where: { id: empresaId }, data: dataEmpresa });

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

    console.log("[Fiscal bootstrap] CNPJ alinhado ao certificado e A1 armazenado criptografado.");
}

module.exports = { executarBootstrapFiscal };
