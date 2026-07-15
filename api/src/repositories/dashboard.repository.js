const prisma = require("../config/prisma");

class DashboardRepository {

    async buscarResumo(empresaId) {

        const [

            clientes,

            produtos,

            categorias,

            orcamentos,

            variacoes,

            totalOrcamentos,

            ultimosOrcamentos,

            estoqueBaixoProdutos

        ] = await Promise.all([

            prisma.cliente.count({
                where: { empresaId }
            }),

            prisma.produto.count({
                where: { empresaId }
            }),

            prisma.categoriaProduto.count({
                where: { empresaId }
            }),

            prisma.orcamento.count({
                where: { empresaId }
            }),

            prisma.variacaoProduto.findMany({
                where: {
                    produto: {
                        empresaId
                    }
                },
                select: {
                    estoqueAtual: true,
                    estoqueMinimo: true
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
                    produto: {
                        empresaId
                    }
                },
                include: {
                    produto: true
                },
                orderBy: {
                    estoqueAtual: "asc"
                },
                take: 5
            })

        ]);

        const estoqueBaixo = variacoes.filter(v =>
            Number(v.estoqueAtual) <= Number(v.estoqueMinimo)
        ).length;

        return {

            clientes,

            produtos,

            categorias,

            orcamentos,

            estoqueBaixo,

            valorTotal:
                Number(totalOrcamentos._sum.total || 0),

            ultimosOrcamentos,

            estoqueBaixoProdutos

        };

    }

}

module.exports = new DashboardRepository();