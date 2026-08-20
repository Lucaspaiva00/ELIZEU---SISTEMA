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
                variacaoProduto: {
                    include: {
                        produto: true
                    }
                },
                variacaoServico: {
                    include: {
                        servico: true
                    }
                }
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
        return prisma.notaFiscal.findFirst({
            where: { vendaId, empresaId }
        });
    }

    async criarPreparada(venda, snapshot) {
        return prisma.$transaction(async (tx) => {
            const existente = await tx.notaFiscal.findUnique({
                where: { vendaId: venda.id }
            });

            if (existente) {
                return existente;
            }

            const fiscal = await tx.configuracaoFiscal.findUnique({
                where: { empresaId: venda.empresaId }
            });

            if (!fiscal) {
                throw new Error("Configuração fiscal da empresa não encontrada.");
            }

            const numero = fiscal.proximoNumeroNfe;
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

            await tx.configuracaoFiscal.update({
                where: { empresaId: venda.empresaId },
                data: {
                    proximoNumeroNfe: {
                        increment: 1
                    }
                }
            });

            return nota;
        });
    }
}

module.exports = new NfeRepository();
