const prisma = require("../config/prisma");

function dadosVariacao(v) {
    return {
        sku: v.sku,
        codigoBarras: v.codigoBarras,
        descricao: v.descricao,
        saida: v.saida,
        tamanho: v.tamanho,
        imagemPrincipal: v.imagemPrincipal,
        gtin: v.gtin,
        localizacaoEstoque: v.localizacaoEstoque,
        peso: v.peso,
        precoCusto: v.precoCusto,
        precoVenda: v.precoVenda,
        estoqueAtual: v.estoqueAtual ?? 0,
        estoqueMinimo: v.estoqueMinimo ?? 0,
        ativo: v.ativo ?? true
    };
}

async function gerarCodigoAutomaticoTx(tx, empresaId) {
    const produtos = await tx.produto.findMany({
        where: { empresaId },
        select: { codigo: true }
    });

    let maior = 0;

    for (const produto of produtos) {
        const match = /^P(\d+)$/i.exec(String(produto.codigo || "").trim());
        if (match) maior = Math.max(maior, Number(match[1]) || 0);
    }

    let sequencia = maior + 1;

    while (true) {
        const codigo = `P${String(sequencia).padStart(6, "0")}`;
        const existe = await tx.produto.findFirst({
            where: { empresaId, codigo },
            select: { id: true }
        });

        if (!existe) return codigo;
        sequencia += 1;
    }
}

async function gerarSkuDuplicadoTx(tx, skuOriginal, codigoNovo, indice) {
    const original = String(skuOriginal || "").trim();
    const base = original
        ? `${original}-COPIA`
        : `${codigoNovo}-V${String(indice + 1).padStart(2, "0")}`;

    let tentativa = base;
    let sequencia = 2;

    while (await tx.variacaoProduto.findUnique({
        where: { sku: tentativa },
        select: { id: true }
    })) {
        tentativa = `${base}-${sequencia}`;
        sequencia += 1;
    }

    return tentativa;
}

class ProdutoRepository {
    async criar(dados) {
        return prisma.$transaction(async (tx) => {
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
                    composicao: dados.composicao || [],
                    custoComposicao: dados.custoComposicao || 0,
                    margemLucroPadrao: dados.margemLucroPadrao || 0,
                    ativo: dados.ativo ?? true
                }
            });

            if (Array.isArray(dados.variacoes) && dados.variacoes.length > 0) {
                await tx.variacaoProduto.createMany({
                    data: dados.variacoes.map((v) => ({
                        produtoId: produto.id,
                        ...dadosVariacao(v)
                    }))
                });
            }

            return tx.produto.findUnique({
                where: { id: produto.id },
                include: { categoria: true, variacoes: true }
            });
        });
    }

    async listar(empresaId) {
        return prisma.produto.findMany({
            where: { empresaId, ativo: true },
            include: {
                categoria: true,
                variacoes: { where: { ativo: true } }
            },
            orderBy: { nome: "asc" }
        });
    }

    async buscarPorId(id) {
        return prisma.produto.findUnique({
            where: { id },
            include: { categoria: true, variacoes: true }
        });
    }

    async buscarPorCodigo(codigo, empresaId) {
        if (!codigo) return null;

        return prisma.produto.findFirst({
            where: { codigo, empresaId }
        });
    }

    async gerarCodigoAutomatico(empresaId) {
        const produtos = await prisma.produto.findMany({
            where: { empresaId },
            select: { codigo: true }
        });

        let maior = 0;

        for (const produto of produtos) {
            const match = /^P(\d+)$/i.exec(String(produto.codigo || "").trim());
            if (match) maior = Math.max(maior, Number(match[1]) || 0);
        }

        let sequencia = maior + 1;

        while (true) {
            const codigo = `P${String(sequencia).padStart(6, "0")}`;
            const existe = await this.buscarPorCodigo(codigo, empresaId);
            if (!existe) return codigo;
            sequencia += 1;
        }
    }

    async duplicar(id, empresaId) {
        return prisma.$transaction(async (tx) => {
            const original = await tx.produto.findFirst({
                where: {
                    id,
                    empresaId,
                    ativo: true
                },
                include: {
                    variacoes: {
                        where: { ativo: true },
                        orderBy: { id: "asc" }
                    }
                }
            });

            if (!original) {
                throw new Error("Produto não encontrado.");
            }

            const codigoNovo = await gerarCodigoAutomaticoTx(tx, empresaId);

            const copia = await tx.produto.create({
                data: {
                    empresaId: original.empresaId,
                    categoriaId: original.categoriaId,
                    codigo: codigoNovo,
                    nome: `${original.nome} - Cópia`,
                    descricao: original.descricao,
                    marca: original.marca,
                    unidadeMedida: original.unidadeMedida,
                    controlaEstoque: original.controlaEstoque,
                    permiteVendaSemEstoque: original.permiteVendaSemEstoque,
                    ncm: original.ncm,
                    cfopPadrao: original.cfopPadrao,
                    origemMercadoria: original.origemMercadoria,
                    composicao: original.composicao || [],
                    custoComposicao: original.custoComposicao,
                    margemLucroPadrao: original.margemLucroPadrao,
                    ativo: true
                }
            });

            for (let indice = 0; indice < original.variacoes.length; indice += 1) {
                const variacao = original.variacoes[indice];
                const skuNovo = await gerarSkuDuplicadoTx(
                    tx,
                    variacao.sku,
                    codigoNovo,
                    indice
                );

                await tx.variacaoProduto.create({
                    data: {
                        produtoId: copia.id,
                        sku: skuNovo,
                        // Código de barras e GTIN identificam fisicamente o item.
                        // Não duplicamos esses identificadores para evitar dois produtos
                        // respondendo ao mesmo código em leitura/consulta de estoque.
                        codigoBarras: null,
                        gtin: null,
                        descricao: variacao.descricao,
                        saida: variacao.saida,
                        tamanho: variacao.tamanho,
                        imagemPrincipal: variacao.imagemPrincipal,
                        localizacaoEstoque: variacao.localizacaoEstoque,
                        peso: variacao.peso,
                        precoCusto: variacao.precoCusto,
                        precoVenda: variacao.precoVenda,
                        // A cópia é um novo cadastro; não cria estoque fictício.
                        estoqueAtual: 0,
                        estoqueMinimo: variacao.estoqueMinimo,
                        ativo: true
                    }
                });
            }

            return tx.produto.findUnique({
                where: { id: copia.id },
                include: { categoria: true, variacoes: true }
            });
        });
    }

    async atualizar(id, dados) {
        return prisma.$transaction(async (tx) => {
            await tx.produto.update({
                where: { id },
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
                    composicao: dados.composicao || [],
                    custoComposicao: dados.custoComposicao || 0,
                    margemLucroPadrao: dados.margemLucroPadrao || 0,
                    ativo: dados.ativo
                }
            });

            const atuais = await tx.variacaoProduto.findMany({
                where: { produtoId: id },
                select: {
                    id: true,
                    _count: {
                        select: {
                            itensOrcamento: true,
                            itensVenda: true,
                            itensTabelaPreco: true,
                            movimentacoesEstoque: true
                        }
                    }
                }
            });

            const atuaisPorId = new Map(atuais.map((v) => [v.id, v]));
            const idsRecebidos = new Set();

            for (const variacao of dados.variacoes || []) {
                const variacaoId = Number(variacao.id);

                if (Number.isInteger(variacaoId) && variacaoId > 0) {
                    if (!atuaisPorId.has(variacaoId)) {
                        throw new Error("Uma das variações informadas não pertence a este produto.");
                    }

                    idsRecebidos.add(variacaoId);

                    await tx.variacaoProduto.update({
                        where: { id: variacaoId },
                        data: dadosVariacao(variacao)
                    });
                    continue;
                }

                await tx.variacaoProduto.create({
                    data: {
                        produtoId: id,
                        ...dadosVariacao(variacao)
                    }
                });
            }

            for (const variacaoAtual of atuais) {
                if (idsRecebidos.has(variacaoAtual.id)) continue;

                const referenciada = Object.values(variacaoAtual._count).some((total) => total > 0);

                if (referenciada) {
                    // Mantém a variação apenas para preservar histórico de orçamento/venda.
                    await tx.variacaoProduto.update({
                        where: { id: variacaoAtual.id },
                        data: { ativo: false }
                    });
                } else {
                    await tx.variacaoProduto.delete({
                        where: { id: variacaoAtual.id }
                    });
                }
            }

            return tx.produto.findUnique({
                where: { id },
                include: { categoria: true, variacoes: true }
            });
        });
    }

    async excluir(id) {
        const produto = await this.buscarPorId(id);
        if (!produto) throw new Error("Produto não encontrado.");

        const variacaoIds = produto.variacoes.map((v) => v.id);

        if (variacaoIds.length) {
            const [orcamentos, vendas, tabelas, movimentos] = await Promise.all([
                prisma.itemOrcamento.count({ where: { variacaoProdutoId: { in: variacaoIds } } }),
                prisma.itemVenda.count({ where: { variacaoProdutoId: { in: variacaoIds } } }),
                prisma.itemTabelaPreco.count({ where: { variacaoProdutoId: { in: variacaoIds } } }),
                prisma.movimentacaoEstoque.count({ where: { variacaoProdutoId: { in: variacaoIds } } })
            ]);

            if (orcamentos || vendas || tabelas || movimentos) {
                return prisma.produto.update({
                    where: { id },
                    data: {
                        ativo: false,
                        variacoes: {
                            updateMany: {
                                where: {},
                                data: { ativo: false }
                            }
                        }
                    }
                });
            }
        }

        return prisma.produto.delete({ where: { id } });
    }
}

module.exports = new ProdutoRepository();
