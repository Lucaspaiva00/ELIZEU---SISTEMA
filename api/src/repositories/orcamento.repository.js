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
                    throw new Error("Este orçamento já gerou uma venda.");
                }

                if (["CANCELADO", "REJEITADO", "VENCIDO"].includes(orcamento.status)) {
                    throw new Error(`Não é possível aprovar um orçamento com status ${orcamento.status}.`);
                }

                if (!orcamento.itens.length) {
                    throw new Error("O orçamento não possui itens.");
                }

                if (Number(orcamento.total) <= 0) {
                    throw new Error("O total do orçamento deve ser maior que zero.");
                }

                const ultimaVenda = await tx.venda.findFirst({
                    where: { empresaId: dados.empresaId },
                    orderBy: { numero: "desc" }
                });

                const numeroVenda = ultimaVenda ? ultimaVenda.numero + 1 : 1;

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
                        const servico = variacao?.servico;

                        if (!variacao || !servico) {
                            throw new Error("Serviço do orçamento não encontrado.");
                        }

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
                    const produto = variacao?.produto;

                    if (!variacao || !produto) {
                        throw new Error("Produto do orçamento não encontrado.");
                    }

                    await tx.itemVenda.create({
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
                }

                const orcamentoAprovado = await tx.orcamento.update({
                    where: { id: orcamento.id },
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
                    venda
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
