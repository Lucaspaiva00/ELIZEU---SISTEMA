const { Prisma } = require("@prisma/client");
const prisma = require("../config/prisma");

function adicionarDias(data, dias) {
    const resultado = new Date(data);
    resultado.setDate(resultado.getDate() + dias);
    return resultado;
}

function adicionarMeses(data, meses) {
    const resultado = new Date(data);
    const diaOriginal = resultado.getDate();

    resultado.setDate(1);
    resultado.setMonth(resultado.getMonth() + meses);

    const ultimoDiaDoMes = new Date(
        resultado.getFullYear(),
        resultado.getMonth() + 1,
        0
    ).getDate();

    resultado.setDate(Math.min(diaOriginal, ultimoDiaDoMes));

    return resultado;
}

function calcularVencimento(primeiroVencimento, indice, periodicidade, intervaloPersonalizadoDias) {
    switch (periodicidade) {
        case "SEMANAL":
            return adicionarDias(primeiroVencimento, indice * 7);
        case "QUINZENAL":
            return adicionarDias(primeiroVencimento, indice * 15);
        case "BIMESTRAL":
            return adicionarMeses(primeiroVencimento, indice * 2);
        case "TRIMESTRAL":
            return adicionarMeses(primeiroVencimento, indice * 3);
        case "SEMESTRAL":
            return adicionarMeses(primeiroVencimento, indice * 6);
        case "ANUAL":
            return adicionarMeses(primeiroVencimento, indice * 12);
        case "PERSONALIZADA":
            return adicionarDias(primeiroVencimento, indice * intervaloPersonalizadoDias);
        case "MENSAL":
        default:
            return adicionarMeses(primeiroVencimento, indice);
    }
}

function dividirValorEmParcelas(valorTotal, quantidadeParcelas) {
    const totalEmCentavos = Math.round(Number(valorTotal) * 100);
    const valorBase = Math.floor(totalEmCentavos / quantidadeParcelas);
    const diferenca = totalEmCentavos - valorBase * quantidadeParcelas;

    return Array.from({ length: quantidadeParcelas }, (_, indice) => {
        const valorEmCentavos = valorBase + (indice < diferenca ? 1 : 0);
        return new Prisma.Decimal(valorEmCentavos).dividedBy(100);
    });
}

function includeOrcamentoCompleto() {
    return {
        cliente: true,
        tabelaPreco: true,
        criadoPor: {
            select: {
                id: true,
                nome: true
            }
        },
        aprovadoPor: {
            select: {
                id: true,
                nome: true
            }
        },
        venda: {
            include: {
                contasReceber: {
                    orderBy: {
                        parcelaNumero: "asc"
                    }
                }
            }
        },
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
        }
    };
}

class OrcamentoRepository {

    async criar(dados) {
        return prisma.$transaction(async (tx) => {
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
                    criadoPorId: dados.criadoPorId,
                    tabelaPrecoId: dados.tabelaPrecoId || null,
                    numero,
                    status: dados.status || "RASCUNHO",
                    dataValidade: dados.dataValidade
                        ? new Date(dados.dataValidade)
                        : null,
                    subtotal: dados.subtotal,
                    desconto: dados.desconto,
                    frete: dados.frete,
                    outrasDespesas: dados.outrasDespesas,
                    total: dados.total,
                    observacoes: dados.observacoes
                }
            });

            await tx.itemOrcamento.createMany({
                data: dados.itens.map((item) => ({
                    orcamentoId: orcamento.id,
                    tipo: item.tipo,
                    variacaoProdutoId: item.tipo === "PRODUTO" ? item.variacaoProdutoId : null,
                    variacaoServicoId: item.tipo === "SERVICO" ? item.variacaoServicoId : null,
                    quantidade: item.quantidade,
                    valorUnitario: item.valorUnitario,
                    desconto: item.desconto ?? 0,
                    total: item.total
                }))
            });

            return tx.orcamento.findUnique({
                where: {
                    id: orcamento.id
                },
                include: includeOrcamentoCompleto()
            });
        });
    }

    async listar(empresaId) {
        return prisma.orcamento.findMany({
            where: {
                empresaId
            },
            include: includeOrcamentoCompleto(),
            orderBy: {
                numero: "desc"
            }
        });
    }

    async buscarPorId(id, empresaId) {
        return prisma.orcamento.findFirst({
            where: {
                id,
                empresaId
            },
            include: includeOrcamentoCompleto()
        });
    }

    async atualizar(id, dados) {
        return prisma.$transaction(async (tx) => {
            await tx.orcamento.update({
                where: {
                    id
                },
                data: {
                    clienteId: dados.clienteId,
                    tabelaPrecoId: dados.tabelaPrecoId || null,
                    dataValidade: dados.dataValidade
                        ? new Date(dados.dataValidade)
                        : null,
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

            await tx.itemOrcamento.createMany({
                data: dados.itens.map((item) => ({
                    orcamentoId: id,
                    tipo: item.tipo,
                    variacaoProdutoId: item.tipo === "PRODUTO" ? item.variacaoProdutoId : null,
                    variacaoServicoId: item.tipo === "SERVICO" ? item.variacaoServicoId : null,
                    quantidade: item.quantidade,
                    valorUnitario: item.valorUnitario,
                    desconto: item.desconto ?? 0,
                    total: item.total
                }))
            });

            return tx.orcamento.findUnique({
                where: {
                    id
                },
                include: includeOrcamentoCompleto()
            });
        });
    }

    async aprovar(id, dados) {
        return prisma.$transaction(
            async (tx) => {
                const orcamento = await tx.orcamento.findFirst({
                    where: {
                        id,
                        empresaId: dados.empresaId
                    },
                    include: {
                        venda: true,
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
                        }
                    }
                });

                if (!orcamento) {
                    throw new Error("Orçamento não encontrado.");
                }

                if (orcamento.status === "APROVADO" || orcamento.venda) {
                    throw new Error("Este orçamento já foi aprovado.");
                }

                if (["CANCELADO", "REJEITADO", "VENCIDO"].includes(orcamento.status)) {
                    throw new Error(`Não é possível aprovar um orçamento com status ${orcamento.status}.`);
                }

                if (orcamento.itens.length === 0) {
                    throw new Error("O orçamento não possui itens.");
                }

                if (Number(orcamento.total) <= 0) {
                    throw new Error("O total do orçamento deve ser maior que zero.");
                }

                for (const item of orcamento.itens) {
                    if (item.tipo === "SERVICO") {
                        continue;
                    }

                    const { produto } = item.variacaoProduto;

                    if (
                        produto.controlaEstoque &&
                        !produto.permiteVendaSemEstoque &&
                        item.variacaoProduto.estoqueAtual.lessThan(item.quantidade)
                    ) {
                        throw new Error(
                            `Estoque insuficiente para ${produto.nome} - ${item.variacaoProduto.sku}.`
                        );
                    }
                }

                const ultimaVenda = await tx.venda.findFirst({
                    where: {
                        empresaId: dados.empresaId
                    },
                    orderBy: {
                        numero: "desc"
                    }
                });

                const numeroVenda = ultimaVenda ? ultimaVenda.numero + 1 : 1;

                const categoriaReceita = await tx.categoriaFinanceira.findFirst({
                    where: {
                        empresaId: dados.empresaId,
                        nome: "Vendas de Produtos e Serviços",
                        ativa: true
                    }
                });

                const centroCusto = await tx.centroCusto.findFirst({
                    where: {
                        empresaId: dados.empresaId,
                        codigo: "GERAL",
                        ativo: true
                    }
                });

                const venda = await tx.venda.create({
                    data: {
                        empresaId: dados.empresaId,
                        numero: numeroVenda,
                        orcamentoId: orcamento.id,
                        clienteId: orcamento.clienteId,
                        criadoPorId: dados.usuarioId,
                        status: "CONFIRMADA",
                        subtotal: orcamento.subtotal,
                        desconto: orcamento.desconto,
                        frete: orcamento.frete,
                        outrasDespesas: orcamento.outrasDespesas,
                        total: orcamento.total,
                        formaPagamento: dados.formaPagamento,
                        quantidadeParcelas: dados.quantidadeParcelas,
                        periodicidadeParcelas: dados.periodicidadeParcelas,
                        primeiroVencimento: dados.primeiroVencimento,
                        observacoes: orcamento.observacoes
                    }
                });

                for (const item of orcamento.itens) {
                    if (item.tipo === "SERVICO") {
                        const variacao = item.variacaoServico;
                        const servico = variacao.servico;

                        await tx.itemVenda.create({
                            data: {
                                vendaId: venda.id,
                                tipo: "SERVICO",
                                variacaoServicoId: variacao.id,
                                codigoProduto: servico.codigo,
                                sku: variacao.codigo,
                                descricao: variacao.descricao
                                    ? `${servico.nome} - ${variacao.descricao}`
                                    : servico.nome,
                                quantidade: item.quantidade,
                                valorUnitario: item.valorUnitario,
                                desconto: item.desconto,
                                total: item.total,
                                custoUnitario: variacao.precoCusto
                            }
                        });

                        continue;
                    }

                    const variacao = item.variacaoProduto;
                    const produto = variacao.produto;

                    const itemVenda = await tx.itemVenda.create({
                        data: {
                            vendaId: venda.id,
                            tipo: "PRODUTO",
                            variacaoProdutoId: variacao.id,
                            codigoProduto: produto.codigo,
                            sku: variacao.sku,
                            descricao: variacao.descricao
                                ? `${produto.nome} - ${variacao.descricao}`
                                : produto.nome,
                            quantidade: item.quantidade,
                            valorUnitario: item.valorUnitario,
                            desconto: item.desconto,
                            total: item.total,
                            custoUnitario: variacao.precoCusto
                        }
                    });

                    if (produto.controlaEstoque) {
                        const saldoAnterior = variacao.estoqueAtual;
                        const saldoPosterior = saldoAnterior.minus(item.quantidade);

                        if (!produto.permiteVendaSemEstoque) {
                            const atualizacao = await tx.variacaoProduto.updateMany({
                                where: {
                                    id: variacao.id,
                                    estoqueAtual: {
                                        gte: item.quantidade
                                    }
                                },
                                data: {
                                    estoqueAtual: {
                                        decrement: item.quantidade
                                    }
                                }
                            });

                            if (atualizacao.count !== 1) {
                                throw new Error(
                                    `O estoque de ${produto.nome} foi alterado. Revise o orçamento e tente novamente.`
                                );
                            }
                        } else {
                            await tx.variacaoProduto.update({
                                where: {
                                    id: variacao.id
                                },
                                data: {
                                    estoqueAtual: {
                                        decrement: item.quantidade
                                    }
                                }
                            });
                        }

                        await tx.movimentacaoEstoque.create({
                            data: {
                                empresaId: dados.empresaId,
                                variacaoProdutoId: variacao.id,
                                vendaId: venda.id,
                                itemVendaId: itemVenda.id,
                                responsavelId: dados.usuarioId,
                                tipo: "SAIDA",
                                origem: "VENDA",
                                quantidade: item.quantidade,
                                saldoAnterior,
                                saldoPosterior,
                                observacoes: `Baixa gerada pela aprovação do orçamento nº ${orcamento.numero}.`
                            }
                        });
                    }
                }

                const valoresParcelas = dividirValorEmParcelas(
                    orcamento.total,
                    dados.quantidadeParcelas
                );

                const parcelas = [];

                for (let indice = 0; indice < dados.quantidadeParcelas; indice += 1) {
                    const numeroParcela = indice + 1;
                    const vencimento = calcularVencimento(
                        dados.primeiroVencimento,
                        indice,
                        dados.periodicidadeParcelas,
                        dados.intervaloPersonalizadoDias
                    );

                    const parcela = await tx.contaReceber.create({
                        data: {
                            empresaId: dados.empresaId,
                            vendaId: venda.id,
                            clienteId: orcamento.clienteId,
                            categoriaFinanceiraId: categoriaReceita?.id || null,
                            centroCustoId: centroCusto?.id || null,
                            descricao: `Venda nº ${numeroVenda} - Parcela ${numeroParcela}/${dados.quantidadeParcelas}`,
                            numeroDocumento: `VENDA-${numeroVenda}`,
                            parcelaNumero: numeroParcela,
                            totalParcelas: dados.quantidadeParcelas,
                            valorOriginal: valoresParcelas[indice],
                            dataCompetencia: new Date(),
                            dataVencimento: vencimento,
                            formaPagamento: dados.formaPagamento,
                            status: "PENDENTE"
                        }
                    });

                    parcelas.push(parcela);
                }

                const orcamentoAprovado = await tx.orcamento.update({
                    where: {
                        id: orcamento.id
                    },
                    data: {
                        status: "APROVADO",
                        aprovadoEm: new Date(),
                        aprovadoPorId: dados.usuarioId,
                        formaPagamento: dados.formaPagamento,
                        quantidadeParcelas: dados.quantidadeParcelas,
                        periodicidadeParcelas: dados.periodicidadeParcelas,
                        intervaloPersonalizadoDias: dados.intervaloPersonalizadoDias,
                        primeiroVencimento: dados.primeiroVencimento,
                        motivoStatus: null
                    },
                    include: includeOrcamentoCompleto()
                });

                return {
                    orcamento: orcamentoAprovado,
                    venda: {
                        ...venda,
                        contasReceber: parcelas
                    }
                };
            },
            {
                isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
                maxWait: 5000,
                timeout: 15000
            }
        );
    }

    async excluir(id, empresaId) {
        const resultado = await prisma.orcamento.deleteMany({
            where: {
                id,
                empresaId
            }
        });

        if (resultado.count !== 1) {
            throw new Error("Orçamento não encontrado.");
        }

        return resultado;
    }
}

module.exports = new OrcamentoRepository();
