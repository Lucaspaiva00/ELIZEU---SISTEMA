const { randomUUID } = require("crypto");
const { Prisma } = require("@prisma/client");
const prisma = require("../config/prisma");

function inicioDoDia(data = new Date()) {
    const resultado = new Date(data);
    resultado.setHours(0, 0, 0, 0);
    return resultado;
}

function fimDoDia(data = new Date()) {
    const resultado = new Date(data);
    resultado.setHours(23, 59, 59, 999);
    return resultado;
}

function includeMovimentacaoCompleta() {
    return {
        contaFinanceira: true,
        categoriaFinanceira: true,
        centroCusto: true,
        contaReceber: {
            include: {
                cliente: true
            }
        },
        contaPagar: true,
        criadoPor: {
            select: {
                id: true,
                nome: true,
                perfil: true
            }
        }
    };
}

async function resolverConta(tx, empresaId, contaFinanceiraId) {
    if (contaFinanceiraId) {
        const conta = await tx.contaFinanceira.findFirst({
            where: {
                id: contaFinanceiraId,
                empresaId,
                ativa: true
            }
        });

        if (!conta) {
            throw new Error("Conta financeira inválida.");
        }

        return conta;
    }

    const contaPadrao = await tx.contaFinanceira.findFirst({
        where: {
            empresaId,
            padrao: true,
            ativa: true
        },
        orderBy: {
            id: "asc"
        }
    });

    if (!contaPadrao) {
        throw new Error("Nenhuma conta financeira padrão ativa foi encontrada.");
    }

    return contaPadrao;
}

async function resolverCategoriaECentroCusto(tx, dados) {
    let categoriaFinanceiraId = dados.categoriaFinanceiraId;
    let centroCustoId = dados.centroCustoId;
    const naturezasPermitidas = dados.tipo === "ENTRADA"
        ? ["RECEITA", "AMBAS"]
        : ["DESPESA", "AMBAS"];

    if (categoriaFinanceiraId) {
        const categoria = await tx.categoriaFinanceira.findFirst({
            where: {
                id: categoriaFinanceiraId,
                empresaId: dados.empresaId,
                ativa: true,
                natureza: {
                    in: naturezasPermitidas
                }
            }
        });

        if (!categoria) {
            throw new Error("Categoria financeira incompatível com a movimentação.");
        }
    } else {
        const nomePadrao = dados.tipo === "ENTRADA"
            ? "Outras Receitas"
            : "Despesas Operacionais";
        const categoria = await tx.categoriaFinanceira.findFirst({
            where: {
                empresaId: dados.empresaId,
                nome: nomePadrao,
                ativa: true
            }
        });

        categoriaFinanceiraId = categoria?.id || null;
    }

    if (centroCustoId) {
        const centro = await tx.centroCusto.findFirst({
            where: {
                id: centroCustoId,
                empresaId: dados.empresaId,
                ativo: true
            }
        });

        if (!centro) {
            throw new Error("Centro de custo inválido.");
        }
    } else {
        const centro = await tx.centroCusto.findFirst({
            where: {
                empresaId: dados.empresaId,
                codigo: "GERAL",
                ativo: true
            }
        });

        centroCustoId = centro?.id || null;
    }

    return {
        categoriaFinanceiraId,
        centroCustoId
    };
}

function construirFiltroPeriodo(dataInicio, dataFim) {
    if (!dataInicio && !dataFim) {
        return undefined;
    }

    const periodo = {};

    if (dataInicio) {
        periodo.gte = inicioDoDia(dataInicio);
    }

    if (dataFim) {
        periodo.lte = fimDoDia(dataFim);
    }

    return periodo;
}

function statusTituloAposEstorno(titulo, valorLiquidado, campoData) {
    const valorTotal = new Prisma.Decimal(titulo.valorOriginal)
        .plus(titulo.valorJuros)
        .plus(titulo.valorMulta)
        .minus(titulo.valorDesconto);
    const atrasado = titulo.dataVencimento < inicioDoDia();

    if (valorLiquidado.equals(0)) {
        return {
            status: atrasado ? "ATRASADO" : "PENDENTE",
            [campoData]: null
        };
    }

    if (valorLiquidado.lessThan(valorTotal)) {
        return {
            status: atrasado ? "ATRASADO" : "PARCIAL"
        };
    }

    return {
        status: "PAGO"
    };
}

class MovimentacaoFinanceiraRepository {

    async listar(empresaId, filtros) {
        const where = {
            empresaId
        };

        if (filtros.contaFinanceiraId) {
            where.contaFinanceiraId = filtros.contaFinanceiraId;
        }

        if (filtros.tipo) {
            where.tipo = filtros.tipo;
        }

        if (filtros.origem) {
            where.origem = filtros.origem;
        }

        if (!filtros.incluirEstornadas) {
            where.estornada = false;
        }

        const periodo = construirFiltroPeriodo(filtros.dataInicio, filtros.dataFim);

        if (periodo) {
            where.dataMovimentacao = periodo;
        }

        if (filtros.busca) {
            where.OR = [
                {
                    descricao: {
                        contains: filtros.busca,
                        mode: "insensitive"
                    }
                },
                {
                    documento: {
                        contains: filtros.busca,
                        mode: "insensitive"
                    }
                },
                {
                    observacoes: {
                        contains: filtros.busca,
                        mode: "insensitive"
                    }
                }
            ];
        }

        const skip = (filtros.pagina - 1) * filtros.limite;
        const [movimentacoes, total] = await prisma.$transaction([
            prisma.movimentacaoFinanceira.findMany({
                where,
                include: includeMovimentacaoCompleta(),
                orderBy: [
                    {
                        dataMovimentacao: "desc"
                    },
                    {
                        id: "desc"
                    }
                ],
                skip,
                take: filtros.limite
            }),
            prisma.movimentacaoFinanceira.count({ where })
        ]);

        return {
            movimentacoes,
            paginacao: {
                pagina: filtros.pagina,
                limite: filtros.limite,
                total,
                totalPaginas: Math.ceil(total / filtros.limite)
            }
        };
    }

    async resumo(empresaId, filtros) {
        const wherePeriodo = {
            empresaId
        };

        if (filtros.contaFinanceiraId) {
            wherePeriodo.contaFinanceiraId = filtros.contaFinanceiraId;
        }

        const periodo = construirFiltroPeriodo(filtros.dataInicio, filtros.dataFim);

        if (periodo) {
            wherePeriodo.dataMovimentacao = periodo;
        }

        const [movimentosPeriodo, contas, movimentosTotais] = await Promise.all([
            prisma.movimentacaoFinanceira.groupBy({
                by: ["tipo"],
                where: wherePeriodo,
                _sum: {
                    valor: true
                },
                _count: {
                    id: true
                }
            }),
            prisma.contaFinanceira.findMany({
                where: {
                    empresaId,
                    ...(filtros.contaFinanceiraId
                        ? { id: filtros.contaFinanceiraId }
                        : {})
                },
                select: {
                    id: true,
                    saldoInicial: true
                }
            }),
            prisma.movimentacaoFinanceira.groupBy({
                by: ["tipo"],
                where: {
                    empresaId,
                    ...(filtros.contaFinanceiraId
                        ? { contaFinanceiraId: filtros.contaFinanceiraId }
                        : {})
                },
                _sum: {
                    valor: true
                }
            })
        ]);

        let entradasPeriodo = 0;
        let saidasPeriodo = 0;
        let quantidadeEntradas = 0;
        let quantidadeSaidas = 0;

        for (const grupo of movimentosPeriodo) {
            if (grupo.tipo === "ENTRADA") {
                entradasPeriodo = Number(grupo._sum.valor || 0);
                quantidadeEntradas = grupo._count.id;
            } else {
                saidasPeriodo = Number(grupo._sum.valor || 0);
                quantidadeSaidas = grupo._count.id;
            }
        }

        const saldoInicial = contas.reduce(
            (total, conta) => total + Number(conta.saldoInicial),
            0
        );
        let entradasTotais = 0;
        let saidasTotais = 0;

        for (const grupo of movimentosTotais) {
            if (grupo.tipo === "ENTRADA") {
                entradasTotais = Number(grupo._sum.valor || 0);
            } else {
                saidasTotais = Number(grupo._sum.valor || 0);
            }
        }

        return {
            entradasPeriodo: Number(entradasPeriodo.toFixed(2)),
            saidasPeriodo: Number(saidasPeriodo.toFixed(2)),
            resultadoPeriodo: Number((entradasPeriodo - saidasPeriodo).toFixed(2)),
            saldoAtual: Number((saldoInicial + entradasTotais - saidasTotais).toFixed(2)),
            quantidadeEntradas,
            quantidadeSaidas
        };
    }

    async buscarPorId(id, empresaId) {
        return prisma.movimentacaoFinanceira.findFirst({
            where: {
                id,
                empresaId
            },
            include: includeMovimentacaoCompleta()
        });
    }

    async criarManual(dados) {
        return prisma.$transaction(async (tx) => {
            const conta = await resolverConta(tx, dados.empresaId, dados.contaFinanceiraId);
            const relacionamentos = await resolverCategoriaECentroCusto(tx, dados);

            return tx.movimentacaoFinanceira.create({
                data: {
                    empresaId: dados.empresaId,
                    contaFinanceiraId: conta.id,
                    categoriaFinanceiraId: relacionamentos.categoriaFinanceiraId,
                    centroCustoId: relacionamentos.centroCustoId,
                    criadoPorId: dados.usuarioId,
                    tipo: dados.tipo,
                    origem: "LANCAMENTO_MANUAL",
                    descricao: dados.descricao.trim(),
                    valor: dados.valor,
                    dataMovimentacao: dados.dataMovimentacao,
                    dataCompetencia: dados.dataCompetencia,
                    formaPagamento: dados.formaPagamento || null,
                    documento: dados.documento || null,
                    observacoes: dados.observacoes || null
                },
                include: includeMovimentacaoCompleta()
            });
        });
    }

    async transferir(dados) {
        return prisma.$transaction(async (tx) => {
            const contaOrigem = await resolverConta(
                tx,
                dados.empresaId,
                dados.contaOrigemId
            );
            const contaDestino = await resolverConta(
                tx,
                dados.empresaId,
                dados.contaDestinoId
            );

            if (dados.centroCustoId) {
                const centro = await tx.centroCusto.findFirst({
                    where: {
                        id: dados.centroCustoId,
                        empresaId: dados.empresaId,
                        ativo: true
                    }
                });

                if (!centro) {
                    throw new Error("Centro de custo inválido.");
                }
            }

            const grupo = randomUUID();
            const descricao = dados.descricao?.trim()
                || `Transferência de ${contaOrigem.nome} para ${contaDestino.nome}`;

            const saida = await tx.movimentacaoFinanceira.create({
                data: {
                    empresaId: dados.empresaId,
                    contaFinanceiraId: contaOrigem.id,
                    centroCustoId: dados.centroCustoId,
                    criadoPorId: dados.usuarioId,
                    tipo: "SAIDA",
                    origem: "TRANSFERENCIA",
                    descricao,
                    valor: dados.valor,
                    dataMovimentacao: dados.dataMovimentacao,
                    formaPagamento: "TRANSFERENCIA",
                    documento: dados.documento || null,
                    transferenciaGrupo: grupo,
                    observacoes: dados.observacoes || null
                },
                include: includeMovimentacaoCompleta()
            });

            const entrada = await tx.movimentacaoFinanceira.create({
                data: {
                    empresaId: dados.empresaId,
                    contaFinanceiraId: contaDestino.id,
                    centroCustoId: dados.centroCustoId,
                    criadoPorId: dados.usuarioId,
                    tipo: "ENTRADA",
                    origem: "TRANSFERENCIA",
                    descricao,
                    valor: dados.valor,
                    dataMovimentacao: dados.dataMovimentacao,
                    formaPagamento: "TRANSFERENCIA",
                    documento: dados.documento || null,
                    transferenciaGrupo: grupo,
                    observacoes: dados.observacoes || null
                },
                include: includeMovimentacaoCompleta()
            });

            return {
                grupo,
                saida,
                entrada
            };
        });
    }

    async estornar(id, dados) {
        return prisma.$transaction(
            async (tx) => {
                const original = await tx.movimentacaoFinanceira.findFirst({
                    where: {
                        id,
                        empresaId: dados.empresaId
                    }
                });

                if (!original) {
                    throw new Error("Movimentação financeira não encontrada.");
                }

                if (original.estornada) {
                    throw new Error("Esta movimentação já foi estornada.");
                }

                if (original.origem === "ESTORNO") {
                    throw new Error("Uma movimentação de estorno não pode ser estornada novamente.");
                }

                const movimentosOriginais = original.origem === "TRANSFERENCIA"
                    && original.transferenciaGrupo
                    ? await tx.movimentacaoFinanceira.findMany({
                        where: {
                            empresaId: dados.empresaId,
                            origem: "TRANSFERENCIA",
                            transferenciaGrupo: original.transferenciaGrupo,
                            estornada: false
                        }
                    })
                    : [original];

                const grupoEstorno = `ESTORNO-${randomUUID()}`;
                const estornos = [];

                for (const movimento of movimentosOriginais) {
                    await tx.movimentacaoFinanceira.update({
                        where: {
                            id: movimento.id
                        },
                        data: {
                            estornada: true,
                            estornadaEm: dados.dataEstorno,
                            observacoes: movimento.observacoes
                                ? `${movimento.observacoes}\nEstorno: ${dados.motivo.trim()}`
                                : `Estorno: ${dados.motivo.trim()}`
                        }
                    });

                    if (movimento.contaReceberId) {
                        const titulo = await tx.contaReceber.findUnique({
                            where: {
                                id: movimento.contaReceberId
                            }
                        });

                        if (titulo) {
                            const novoRecebido = Prisma.Decimal.max(
                                new Prisma.Decimal(titulo.valorRecebido).minus(movimento.valor),
                                0
                            );
                            const status = statusTituloAposEstorno(
                                titulo,
                                novoRecebido,
                                "dataRecebimento"
                            );

                            await tx.contaReceber.update({
                                where: {
                                    id: titulo.id
                                },
                                data: {
                                    valorRecebido: novoRecebido,
                                    ...status
                                }
                            });
                        }
                    }

                    if (movimento.contaPagarId) {
                        const titulo = await tx.contaPagar.findUnique({
                            where: {
                                id: movimento.contaPagarId
                            }
                        });

                        if (titulo) {
                            const novoPago = Prisma.Decimal.max(
                                new Prisma.Decimal(titulo.valorPago).minus(movimento.valor),
                                0
                            );
                            const status = statusTituloAposEstorno(
                                titulo,
                                novoPago,
                                "dataPagamento"
                            );

                            await tx.contaPagar.update({
                                where: {
                                    id: titulo.id
                                },
                                data: {
                                    valorPago: novoPago,
                                    ...status
                                }
                            });
                        }
                    }

                    const estorno = await tx.movimentacaoFinanceira.create({
                        data: {
                            empresaId: dados.empresaId,
                            contaFinanceiraId: movimento.contaFinanceiraId,
                            categoriaFinanceiraId: movimento.categoriaFinanceiraId,
                            centroCustoId: movimento.centroCustoId,
                            contaReceberId: movimento.contaReceberId,
                            contaPagarId: movimento.contaPagarId,
                            criadoPorId: dados.usuarioId,
                            tipo: movimento.tipo === "ENTRADA" ? "SAIDA" : "ENTRADA",
                            origem: "ESTORNO",
                            descricao: `Estorno: ${movimento.descricao}`,
                            valor: movimento.valor,
                            dataMovimentacao: dados.dataEstorno,
                            dataCompetencia: movimento.dataCompetencia,
                            formaPagamento: movimento.formaPagamento,
                            documento: movimento.documento,
                            transferenciaGrupo: grupoEstorno,
                            observacoes: dados.motivo.trim()
                        },
                        include: includeMovimentacaoCompleta()
                    });

                    estornos.push(estorno);
                }

                return {
                    movimentacoesEstornadas: movimentosOriginais.map((item) => item.id),
                    estornos
                };
            },
            {
                isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
                maxWait: 5000,
                timeout: 15000
            }
        );
    }
}

module.exports = new MovimentacaoFinanceiraRepository();
