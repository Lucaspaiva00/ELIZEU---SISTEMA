const prisma = require("../config/prisma");

function includeVendaFiscal() {
    return {
        empresa: {
            include: {
                configuracaoFiscal: true,
                certificadoDigital: {
                    select: {
                        id: true,
                        nomeArquivo: true,
                        validade: true,
                        ativo: true
                    }
                }
            }
        },
        cliente: true,
        itens: {
            include: {
                variacaoProduto: { include: { produto: true } },
                variacaoServico: { include: { servico: true } }
            }
        },
        notaFiscal: true
    };
}

class NfeRepository {
    buscarVenda(vendaId, empresaId) {
        return prisma.venda.findFirst({
            where: { id: vendaId, empresaId },
            include: includeVendaFiscal()
        });
    }

    buscarPorVenda(vendaId, empresaId) {
        return prisma.notaFiscal.findFirst({ where: { vendaId, empresaId } });
    }

    async criarPreparada(venda, snapshot) {
        return prisma.$transaction(async (tx) => {
            const existente = await tx.notaFiscal.findUnique({ where: { vendaId: venda.id } });
            if (existente) return existente;

            const versao = await tx.venda.updateMany({
                where: { id: venda.id, empresaId: venda.empresaId, atualizadoEm: venda.atualizadoEm },
                data: { atualizadoEm: new Date() }
            });
            if (versao.count !== 1) throw new Error("A venda mudou. Confira os dados fiscais e tente novamente.");

            const fiscal = await tx.configuracaoFiscal.update({
                where: { empresaId: venda.empresaId, ambiente: "PRODUCAO", ativo: true },
                data: { proximoNumeroNfe: { increment: 1 } }
            });

            const numero = fiscal.proximoNumeroNfe - 1;
            const serie = fiscal.serieNfe;

            const nota = await tx.notaFiscal.create({
                data: {
                    empresaId: venda.empresaId,
                    vendaId: venda.id,
                    status: "PRONTA_TRANSMISSAO",
                    ambiente: fiscal.ambiente,
                    modelo: 55,
                    serie,
                    numero,
                    naturezaOperacao: fiscal.naturezaOperacao,
                    dadosEmissao: snapshot
                }
            });

            return nota;
        });
    }

    async iniciarTransmissao(notaId, dados) {
        const { count } = await prisma.notaFiscal.updateMany({
            where: { id: notaId, ambiente: "PRODUCAO", status: "PRONTA_TRANSMISSAO" },
            data: { ...dados, status: "TRANSMITINDO", transmitidaEm: new Date() }
        });
        if (count !== 1) throw new Error("Já existe uma tentativa registrada para esta NF-e.");
    }

    async iniciarRetransmissao(nota) {
        const { count } = await prisma.notaFiscal.updateMany({
            where: {
                id: nota.id, empresaId: nota.empresaId, chaveAcesso: nota.chaveAcesso,
                ambiente: "PRODUCAO", status: "TRANSMITINDO", atualizadoEm: nota.atualizadoEm,
                empresa: { configuracaoFiscal: { is: { ativo: true, ambiente: "PRODUCAO" } } }
            },
            data: {
                transmitidaEm: new Date(),
                motivoStatus: "Retransmitindo à SEFAZ o XML originalmente assinado."
            }
        });
        if (count !== 1) throw new Error("A nota ou a configuração mudou. Consulte a situação antes de tentar novamente.");
    }

    registrarCancelamento(nota, dados) {
        return prisma.notaFiscal.updateMany({
            where: { id: nota.id, empresaId: nota.empresaId, status: "AUTORIZADA", chaveAcesso: nota.chaveAcesso },
            data: dados
        });
    }

    atualizar(notaId, dados) {
        return prisma.notaFiscal.update({ where: { id: notaId }, data: dados });
    }
}

module.exports = new NfeRepository();
