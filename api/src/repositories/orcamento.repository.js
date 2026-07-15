const prisma = require("../config/prisma");

class OrcamentoRepository {

    async criar(dados) {

        return await prisma.$transaction(async (tx) => {

            const ultimo = await tx.orcamento.findFirst({
                where: {
                    empresaId: dados.empresaId
                },
                orderBy: {
                    numero: "desc"
                }
            });

            const numero = ultimo ? ultimo.numero + 1 : 1;

            const orcamento = await tx.orcamento.create({
                data: {
                    empresaId: dados.empresaId,
                    clienteId: dados.clienteId,
                    numero,
                    subtotal: dados.subtotal,
                    desconto: dados.desconto,
                    frete: dados.frete,
                    outrasDespesas: dados.outrasDespesas,
                    total: dados.total,
                    observacoes: dados.observacoes
                }
            });

            if (dados.itens && dados.itens.length > 0) {

                await tx.itemOrcamento.createMany({

                    data: dados.itens.map(item => ({

                        orcamentoId: orcamento.id,

                        variacaoProdutoId: item.variacaoProdutoId,

                        quantidade: item.quantidade,

                        valorUnitario: item.valorUnitario,

                        desconto: item.desconto ?? 0,

                        total: item.total

                    }))

                });

            }

            return await tx.orcamento.findUnique({

                where: {
                    id: orcamento.id
                },

                include: {

                    cliente: true,

                    itens: {
                        include: {
                            variacaoProduto: {
                                include: {
                                    produto: true
                                }
                            }
                        }
                    }

                }

            });

        });

    }

    async listar(empresaId) {

        return await prisma.orcamento.findMany({

            where: {
                empresaId
            },

            include: {

                cliente: true,

                itens: {
                    include: {
                        variacaoProduto: {
                            include: {
                                produto: true
                            }
                        }
                    }
                }

            },

            orderBy: {
                numero: "desc"
            }

        });

    }

    async buscarPorId(id) {

        return await prisma.orcamento.findUnique({

            where: {
                id
            },

            include: {

                cliente: true,

                itens: {
                    include: {
                        variacaoProduto: {
                            include: {
                                produto: true
                            }
                        }
                    }
                }

            }

        });

    }

    async atualizar(id, dados) {

        return await prisma.$transaction(async (tx) => {

            await tx.orcamento.update({

                where: {
                    id
                },

                data: {

                    clienteId: dados.clienteId,

                    subtotal: dados.subtotal,

                    desconto: dados.desconto,

                    frete: dados.frete,

                    outrasDespesas: dados.outrasDespesas,

                    total: dados.total,

                    observacoes: dados.observacoes

                }

            });

            await tx.itemOrcamento.deleteMany({

                where: {
                    orcamentoId: id
                }

            });

            if (dados.itens && dados.itens.length > 0) {

                await tx.itemOrcamento.createMany({

                    data: dados.itens.map(item => ({

                        orcamentoId: id,

                        variacaoProdutoId: item.variacaoProdutoId,

                        quantidade: item.quantidade,

                        valorUnitario: item.valorUnitario,

                        desconto: item.desconto ?? 0,

                        total: item.total

                    }))

                });

            }

            return await tx.orcamento.findUnique({

                where: {
                    id
                },

                include: {

                    cliente: true,

                    itens: {
                        include: {
                            variacaoProduto: {
                                include: {
                                    produto: true
                                }
                            }
                        }
                    }

                }

            });

        });

    }

    async excluir(id) {

        return await prisma.orcamento.delete({

            where: {
                id
            }

        });

    }

}

module.exports = new OrcamentoRepository();