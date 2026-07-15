const prisma = require("../config/prisma");

class DashboardRepository {

    async buscarResumo(empresaId) {

        const [
            produtos,
            clientes,
            categorias,
            orcamentos,
            valorOrcamentos,
            estoqueBaixo,
            ultimosOrcamentos,
            produtosEstoqueBaixo
        ] = await Promise.all([

            prisma.produto.count({
                where: {
                    empresaId
                }
            }),

            prisma.cliente.count({
                where: {
                    empresaId
                }
            }),

            prisma.categoriaProduto.count({
                where: {
                    empresaId
                }
            }),

            prisma.orcamento.count({
                where: {
                    empresaId
                }
            }),

            prisma.orcamento.aggregate({
                where: {
                    empresaId
                },
                _sum: {
                    total: true
                }
            }),

            prisma.variacaoProduto.count({
                where: {
                    estoqueAtual: {
                        lte: 5
                    }
                }
            }),

            prisma.orcamento.findMany({

                where: {
                    empresaId
                },

                include: {
                    cliente: true
                },

                orderBy: {
                    criadoEm: "desc"
                },

                take: 5

            }),

            prisma.variacaoProduto.findMany({

                where: {
                    estoqueAtual: {
                        lte: 5
                    }
                },

                include: {
                    produto: true
                },

                take: 5

            })

        ]);

        return {

            produtos,

            clientes,

            categorias,

            orcamentos,

            valorOrcamentos: valorOrcamentos._sum.total ?? 0,

            estoqueBaixo,

            ultimosOrcamentos,

            produtosEstoqueBaixo

        };

    }

}

module.exports = new DashboardRepository();