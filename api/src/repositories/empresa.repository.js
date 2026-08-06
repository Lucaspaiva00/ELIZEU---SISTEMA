const prisma = require("../config/prisma");

class EmpresaRepository {

    includeFiscal() {
        return {
            configuracaoFiscal: true,
            certificadoDigital: {
                select: {
                    id: true,
                    nomeArquivo: true,
                    validade: true,
                    ativo: true,
                    enviadoEm: true,
                    atualizadoEm: true
                }
            }
        };
    }

    async criar(dados) {
        return await prisma.empresa.create({
            data: dados
        });
    }

    async listar() {
        return await prisma.empresa.findMany({
            include: this.includeFiscal(),
            orderBy: {
                razaoSocial: "asc"
            }
        });
    }

    async buscarPorId(id) {
        return await prisma.empresa.findUnique({
            where: {
                id
            },
            include: this.includeFiscal()
        });
    }

    async buscarPorCnpj(cnpj) {
        return await prisma.empresa.findUnique({
            where: {
                cnpj
            }
        });
    }

    async atualizar(id, dados) {
        return await prisma.empresa.update({
            where: {
                id
            },
            data: dados
        });
    }

    async salvarConfiguracaoFiscal(empresaId, dados) {
        return prisma.configuracaoFiscal.upsert({
            where: { empresaId },
            update: dados,
            create: { empresaId, ...dados }
        });
    }

    async salvarCertificado(empresaId, dados) {
        return prisma.certificadoDigital.upsert({
            where: { empresaId },
            update: dados,
            create: { empresaId, ...dados },
            select: {
                id: true,
                nomeArquivo: true,
                validade: true,
                ativo: true,
                enviadoEm: true,
                atualizadoEm: true
            }
        });
    }

    async removerCertificado(empresaId) {
        return prisma.certificadoDigital.deleteMany({ where: { empresaId } });
    }

    async excluir(id) {
        return await prisma.empresa.delete({
            where: {
                id
            }
        });
    }

    async contar() {
        return await prisma.empresa.count();
    }

    async primeira() {
        return await prisma.empresa.findFirst();
    }

}

module.exports = new EmpresaRepository();
