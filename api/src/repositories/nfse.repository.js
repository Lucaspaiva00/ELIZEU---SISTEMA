const prisma = require("../config/prisma");

function includeVenda() {
    return {
        empresa: { include: { configuracaoFiscal: true, certificadoDigital: true } },
        cliente: true,
        itens: {
            include: {
                variacaoServico: { include: { servico: true } },
                variacaoProduto: { include: { produto: true } }
            },
            orderBy: { id: "asc" }
        },
        notaFiscalServico: true
    };
}

class NfseRepository {
    buscarVenda(vendaId, empresaId) {
        return prisma.venda.findFirst({ where: { id: vendaId, empresaId }, include: includeVenda() });
    }

    async criarPreparada(venda, dadosEmissao) {
        return prisma.$transaction(async tx => {
            const versao = await tx.venda.updateMany({
                where: { id: venda.id, empresaId: venda.empresaId, atualizadoEm: venda.atualizadoEm },
                data: { atualizadoEm: new Date() }
            });
            if (versao.count !== 1) throw new Error("A venda mudou. Confira os dados fiscais e tente novamente.");

            const fiscal = await tx.configuracaoFiscal.findUnique({ where: { empresaId: venda.empresaId } });
            const numeroDps = fiscal.proximoNumeroDps;
            const nota = await tx.notaFiscalServico.create({
                data: {
                    empresaId: venda.empresaId,
                    vendaId: venda.id,
                    status: "PRONTA_TRANSMISSAO",
                    ambiente: fiscal.ambiente,
                    serieDps: fiscal.serieDps,
                    numeroDps,
                    dadosEmissao
                }
            });
            await tx.configuracaoFiscal.update({
                where: { empresaId: venda.empresaId },
                data: { proximoNumeroDps: { increment: 1 } }
            });
            return nota;
        });
    }

    buscarPorVenda(vendaId, empresaId) {
        return prisma.notaFiscalServico.findFirst({ where: { vendaId, empresaId } });
    }

    atualizar(id, dados) {
        return prisma.notaFiscalServico.update({ where: { id }, data: dados });
    }
}

module.exports = new NfseRepository();
