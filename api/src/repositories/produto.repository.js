const prisma = require("../config/prisma");

class ProdutoRepository {

    async criar(dados) {

        return await prisma.$transaction(async (tx) => {

            const produto = await tx.produto.create({
                data: {
                    empresaId: dados.empresaId,
                    categoriaId: dados.categoriaId,
                    codigo: dados.codigo,
                    nome: dados.nome,
                    descricao: dados.descricao,
                    marca: dados.marca,
                    unidadeMedida: dados.unidadeMedida,
                    controlaEstoque: dados.controlaEstoque,
                    permiteVendaSemEstoque: dados.permiteVendaSemEstoque,
                    ncm: dados.ncm,
                    cfopPadrao: dados.cfopPadrao,
                    origemMercadoria: dados.origemMercadoria,
                    ativo: dados.ativo ?? true
                }
            });

            if (dados.variacoes && dados.variacoes.length > 0) {

                await tx.variacaoProduto.createMany({
                    data: dados.variacoes.map(v => ({
                        produtoId: produto.id,
                        sku: v.sku,
                        codigoBarras: v.codigoBarras,
                        descricao: v.descricao,
                        cor: v.cor,
                        tamanho: v.tamanho,
                        imagemPrincipal: v.imagemPrincipal,
                        gtin: v.gtin,
                        localizacaoEstoque: v.localizacaoEstoque,
                        peso: v.peso,
                        precoCusto: v.precoCusto,
                        precoVenda: v.precoVenda,
                        estoqueAtual: v.estoqueAtual ?? 0,
                        estoqueMinimo: v.estoqueMinimo ?? 0,
                        ativo: true
                    }))
                });

            }

            return await tx.produto.findUnique({
                where: {
                    id: produto.id
                },
                include: {
                    categoria: true,
                    variacoes: true
                }
            });

        });

    }

    async listar(empresaId) {

        return await prisma.produto.findMany({

            where: {
                empresaId
            },

            include: {
                categoria: true,
                variacoes: true
            },

            orderBy: {
                nome: "asc"
            }

        });

    }

    async buscarPorId(id) {

        return await prisma.produto.findUnique({

            where: {
                id
            },

            include: {
                categoria: true,
                variacoes: true
            }

        });

    }

    async buscarPorCodigo(codigo, empresaId) {

        return await prisma.produto.findFirst({

            where: {
                codigo,
                empresaId
            }

        });

    }

    async atualizar(id, dados) {

        return await prisma.$transaction(async (tx) => {

            await tx.produto.update({

                where: {
                    id
                },

                data: {
                    categoriaId: dados.categoriaId,
                    codigo: dados.codigo,
                    nome: dados.nome,
                    descricao: dados.descricao,
                    marca: dados.marca,
                    unidadeMedida: dados.unidadeMedida,
                    controlaEstoque: dados.controlaEstoque,
                    permiteVendaSemEstoque: dados.permiteVendaSemEstoque,
                    ncm: dados.ncm,
                    cfopPadrao: dados.cfopPadrao,
                    origemMercadoria: dados.origemMercadoria,
                    ativo: dados.ativo
                }

            });

            await tx.variacaoProduto.deleteMany({
                where: {
                    produtoId: id
                }
            });

            if (dados.variacoes && dados.variacoes.length > 0) {

                await tx.variacaoProduto.createMany({

                    data: dados.variacoes.map(v => ({

                        produtoId: id,

                        sku: v.sku,

                        codigoBarras: v.codigoBarras,

                        descricao: v.descricao,

                        cor: v.cor,

                        tamanho: v.tamanho,

                        imagemPrincipal: v.imagemPrincipal,

                        gtin: v.gtin,

                        localizacaoEstoque: v.localizacaoEstoque,

                        peso: v.peso,

                        precoCusto: v.precoCusto,

                        precoVenda: v.precoVenda,

                        estoqueAtual: v.estoqueAtual,

                        estoqueMinimo: v.estoqueMinimo,

                        ativo: v.ativo ?? true

                    }))

                });

            }

            return await tx.produto.findUnique({

                where: {
                    id
                },

                include: {
                    categoria: true,
                    variacoes: true
                }

            });

        });

    }

    async excluir(id) {

        return await prisma.produto.delete({
            where: {
                id
            }
        });

    }

}

module.exports = new ProdutoRepository();