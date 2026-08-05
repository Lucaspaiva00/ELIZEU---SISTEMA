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

function includeContaPagarCompleta() {
    return {
        categoriaFinanceira: true,
        centroCusto: true,
        movimentacoes: {
            include: {
                contaFinanceira: true,
                criadoPor: {
                    select: {
                        id: true,
                        nome: true
                    }
                }
            },
            orderBy: {
                dataMovimentacao: "desc"
            }
        }
    };
}

async function resolverCategoriaECentroCusto(tx, dados) {
    let categoriaFinanceiraId = dados.categoriaFinanceiraId;
    let centroCustoId = dados.centroCustoId;

    if (categoriaFinanceiraId) {
        const categoria = await tx.categoriaFinanceira.findFirst({
            where: {
                id: categoriaFinanceiraId,
                empresaId: dados.empresaId,
                ativa: true,
                natureza: {
                    in: ["DESPESA", "AMBAS"]
                }
            }
        });

        if (!categoria) {
            throw new Error("Categoria financeira de despesa inválida.");
        }
    } else {
        const categoriaPadrao = await tx.categoriaFinanceira.findFirst({
            where: {
                empresaId: dados.empresaId,
                nome: "Despesas Operacionais",
                ativa: true
            }
        });

        categoriaFinanceiraId = categoriaPadrao?.id || null;
    }

    if (centroCustoId) {
        const centroCusto = await tx.centroCusto.findFirst({
            where: {
                id: centroCustoId,
                empresaId: dados.empresaId,
                ativo: true
            }
        });

        if (!centroCusto) {
            throw new Error("Centro de custo inválido.");
        }
    } else {
        const centroCustoPadrao = await tx.centroCusto.findFirst({
            where: {
                empresaId: dados.empresaId,
                codigo: "GERAL",
                ativo: true
            }
        });

        centroCustoId = centroCustoPadrao?.id || null;
    }

    return {
        categoriaFinanceiraId,
        centroCustoId
    };
}

class ContaPagarRepository {

    async criar(dados) {
        return prisma.$transaction(async (tx) => {
            const relacionamentos = await resolverCategoriaECentroCusto(tx, dados);
            const grupo = dados.quantidadeParcelas > 1 ? randomUUID() : null;
            const valores = dados.modoGeracao === "RECORRENCIA"
                ? Array.from(
                    { length: dados.quantidadeParcelas },
                    () => new Prisma.Decimal(dados.valorOriginal)
                )
                : dividirValorEmParcelas(dados.valorOriginal, dados.quantidadeParcelas);

            const contasPagar = [];

            for (let indice = 0; indice < dados.quantidadeParcelas; indice += 1) {
                const numeroParcela = indice + 1;
                const vencimento = calcularVencimento(
                    dados.dataVencimento,
                    indice,
                    dados.periodicidadeParcelas,
                    dados.intervaloPersonalizadoDias
                );

                const contaPagar = await tx.contaPagar.create({
                    data: {
                        empresaId: dados.empresaId,
                        categoriaFinanceiraId: relacionamentos.categoriaFinanceiraId,
                        centroCustoId: relacionamentos.centroCustoId,
                        fornecedorNome: dados.fornecedorNome?.trim() || null,
                        fornecedorDocumento: dados.fornecedorDocumento?.trim() || null,
                        descricao: dados.quantidadeParcelas > 1
                            ? `${dados.descricao.trim()} - ${numeroParcela}/${dados.quantidadeParcelas}`
                            : dados.descricao.trim(),
                        numeroDocumento: dados.numeroDocumento || null,
                        parcelaNumero: numeroParcela,
                        totalParcelas: dados.quantidadeParcelas,
                        valorOriginal: valores[indice],
                        dataCompetencia: dados.dataCompetencia,
                        dataEmissao: dados.dataEmissao,
                        dataVencimento: vencimento,
                        formaPagamento: dados.formaPagamento || null,
                        status: vencimento < inicioDoDia()
                            ? "ATRASADO"
                            : "PENDENTE",
                        recorrente: dados.modoGeracao === "RECORRENCIA",
                        recorrenciaGrupo: grupo,
                        observacoes: dados.observacoes || null
                    },
                    include: includeContaPagarCompleta()
                });

                contasPagar.push(contaPagar);
            }

            return contasPagar;
        });
    }

    async atualizarAtrasados(empresaId) {
        return prisma.contaPagar.updateMany({
            where: {
                empresaId,
                status: {
                    in: ["PENDENTE", "PARCIAL"]
                },
                dataVencimento: {
                    lt: inicioDoDia()
                }
            },
            data: {
                status: "ATRASADO"
            }
        });
    }

    async listar(empresaId, filtros) {
        const where = {
            empresaId
        };

        if (filtros.status) {
            where.status = filtros.status;
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
                    fornecedorNome: {
                        contains: filtros.busca,
                        mode: "insensitive"
                    }
                },
                {
                    fornecedorDocumento: {
                        contains: filtros.busca,
                        mode: "insensitive"
                    }
                },
                {
                    numeroDocumento: {
                        contains: filtros.busca,
                        mode: "insensitive"
                    }
                }
            ];
        }

        if (filtros.vencimentoInicio || filtros.vencimentoFim) {
            where.dataVencimento = {};

            if (filtros.vencimentoInicio) {
                where.dataVencimento.gte = inicioDoDia(filtros.vencimentoInicio);
            }

            if (filtros.vencimentoFim) {
                where.dataVencimento.lte = fimDoDia(filtros.vencimentoFim);
            }
        }

        const skip = (filtros.pagina - 1) * filtros.limite;

        const [contasPagar, total] = await prisma.$transaction([
            prisma.contaPagar.findMany({
                where,
                include: includeContaPagarCompleta(),
                orderBy: [
                    {
                        dataVencimento: "asc"
                    },
                    {
                        id: "desc"
                    }
                ],
                skip,
                take: filtros.limite
            }),
            prisma.contaPagar.count({ where })
        ]);

        return {
            contasPagar,
            paginacao: {
                pagina: filtros.pagina,
                limite: filtros.limite,
                total,
                totalPaginas: Math.ceil(total / filtros.limite)
            }
        };
    }

    async resumo(empresaId, filtros) {
        const where = {
            empresaId,
            status: {
                not: "CANCELADO"
            }
        };

        if (filtros.vencimentoInicio || filtros.vencimentoFim) {
            where.dataVencimento = {};

            if (filtros.vencimentoInicio) {
                where.dataVencimento.gte = inicioDoDia(filtros.vencimentoInicio);
            }

            if (filtros.vencimentoFim) {
                where.dataVencimento.lte = fimDoDia(filtros.vencimentoFim);
            }
        }

        const titulos = await prisma.contaPagar.findMany({
            where,
            select: {
                status: true,
                valorOriginal: true,
                valorDesconto: true,
                valorJuros: true,
                valorMulta: true,
                valorPago: true,
                dataVencimento: true
            }
        });

        const hojeInicio = inicioDoDia();
        const hojeFim = fimDoDia();
        const resumo = {
            totalOriginal: 0,
            totalEmAberto: 0,
            totalAtrasado: 0,
            totalPago: 0,
            totalVencendoHoje: 0,
            quantidadeTitulos: titulos.length,
            quantidadeEmAberto: 0,
            quantidadeAtrasados: 0,
            quantidadePagos: 0
        };

        for (const titulo of titulos) {
            const valorAtual = Number(titulo.valorOriginal)
                + Number(titulo.valorJuros)
                + Number(titulo.valorMulta)
                - Number(titulo.valorDesconto);
            const valorPago = Number(titulo.valorPago);
            const saldo = Math.max(valorAtual - valorPago, 0);

            resumo.totalOriginal += Number(titulo.valorOriginal);
            resumo.totalPago += valorPago;

            if (titulo.status === "PAGO") {
                resumo.quantidadePagos += 1;
            } else {
                resumo.totalEmAberto += saldo;
                resumo.quantidadeEmAberto += 1;
            }

            if (titulo.status === "ATRASADO") {
                resumo.totalAtrasado += saldo;
                resumo.quantidadeAtrasados += 1;
            }

            if (
                titulo.status !== "PAGO" &&
                titulo.dataVencimento >= hojeInicio &&
                titulo.dataVencimento <= hojeFim
            ) {
                resumo.totalVencendoHoje += saldo;
            }
        }

        for (const chave of [
            "totalOriginal",
            "totalEmAberto",
            "totalAtrasado",
            "totalPago",
            "totalVencendoHoje"
        ]) {
            resumo[chave] = Number(resumo[chave].toFixed(2));
        }

        return resumo;
    }

    async buscarPorId(id, empresaId) {
        return prisma.contaPagar.findFirst({
            where: {
                id,
                empresaId
            },
            include: includeContaPagarCompleta()
        });
    }

    async atualizar(id, dados) {
        return prisma.$transaction(async (tx) => {
            const relacionamentos = await resolverCategoriaECentroCusto(tx, dados);

            return tx.contaPagar.update({
                where: {
                    id
                },
                data: {
                    categoriaFinanceiraId: relacionamentos.categoriaFinanceiraId,
                    centroCustoId: relacionamentos.centroCustoId,
                    fornecedorNome: dados.fornecedorNome?.trim() || null,
                    fornecedorDocumento: dados.fornecedorDocumento?.trim() || null,
                    descricao: dados.descricao.trim(),
                    numeroDocumento: dados.numeroDocumento || null,
                    valorOriginal: dados.valorOriginal,
                    dataCompetencia: dados.dataCompetencia,
                    dataVencimento: dados.dataVencimento,
                    formaPagamento: dados.formaPagamento || null,
                    status: dados.dataVencimento < inicioDoDia()
                        ? "ATRASADO"
                        : "PENDENTE",
                    observacoes: dados.observacoes || null
                },
                include: includeContaPagarCompleta()
            });
        });
    }

    async pagar(id, dados) {
        return prisma.$transaction(
            async (tx) => {
                const titulo = await tx.contaPagar.findFirst({
                    where: {
                        id,
                        empresaId: dados.empresaId
                    }
                });

                if (!titulo) {
                    throw new Error("Conta a pagar não encontrada.");
                }

                if (titulo.status === "PAGO") {
                    throw new Error("Esta conta já foi paga integralmente.");
                }

                if (titulo.status === "CANCELADO") {
                    throw new Error("Uma conta cancelada não pode ser paga.");
                }

                let contaFinanceira;

                if (dados.contaFinanceiraId) {
                    contaFinanceira = await tx.contaFinanceira.findFirst({
                        where: {
                            id: dados.contaFinanceiraId,
                            empresaId: dados.empresaId,
                            ativa: true
                        }
                    });

                    if (!contaFinanceira) {
                        throw new Error("Conta financeira inválida.");
                    }
                } else {
                    contaFinanceira = await tx.contaFinanceira.findFirst({
                        where: {
                            empresaId: dados.empresaId,
                            padrao: true,
                            ativa: true
                        },
                        orderBy: {
                            id: "asc"
                        }
                    });
                }

                if (!contaFinanceira) {
                    throw new Error("Nenhuma conta financeira ativa foi encontrada.");
                }

                const descontoAtualizado = new Prisma.Decimal(titulo.valorDesconto)
                    .plus(dados.valorDesconto);
                const jurosAtualizados = new Prisma.Decimal(titulo.valorJuros)
                    .plus(dados.valorJuros);
                const multaAtualizada = new Prisma.Decimal(titulo.valorMulta)
                    .plus(dados.valorMulta);
                const pagoAtualizado = new Prisma.Decimal(titulo.valorPago)
                    .plus(dados.valor);

                const valorTotalAtualizado = new Prisma.Decimal(titulo.valorOriginal)
                    .plus(jurosAtualizados)
                    .plus(multaAtualizada)
                    .minus(descontoAtualizado);

                if (valorTotalAtualizado.lessThanOrEqualTo(0)) {
                    throw new Error("Os descontos não podem zerar ou tornar o título negativo.");
                }

                if (pagoAtualizado.greaterThan(valorTotalAtualizado)) {
                    const saldoDisponivel = valorTotalAtualizado
                        .minus(titulo.valorPago)
                        .toFixed(2);

                    throw new Error(`O pagamento ultrapassa o saldo atual de R$ ${saldoDisponivel}.`);
                }

                const totalmentePago = pagoAtualizado.equals(valorTotalAtualizado);
                const vencida = titulo.dataVencimento < inicioDoDia(dados.dataPagamento);
                const novoStatus = totalmentePago
                    ? "PAGO"
                    : vencida
                        ? "ATRASADO"
                        : "PARCIAL";
                const formaPagamento = dados.formaPagamento || titulo.formaPagamento;

                const contaPagar = await tx.contaPagar.update({
                    where: {
                        id: titulo.id
                    },
                    data: {
                        valorDesconto: descontoAtualizado,
                        valorJuros: jurosAtualizados,
                        valorMulta: multaAtualizada,
                        valorPago: pagoAtualizado,
                        dataPagamento: dados.dataPagamento,
                        formaPagamento,
                        status: novoStatus
                    }
                });

                const movimentacao = await tx.movimentacaoFinanceira.create({
                    data: {
                        empresaId: dados.empresaId,
                        contaFinanceiraId: contaFinanceira.id,
                        categoriaFinanceiraId: titulo.categoriaFinanceiraId,
                        centroCustoId: titulo.centroCustoId,
                        contaPagarId: titulo.id,
                        criadoPorId: dados.usuarioId,
                        tipo: "SAIDA",
                        origem: "CONTA_PAGAR",
                        descricao: `Pagamento: ${titulo.descricao}`,
                        valor: dados.valor,
                        dataMovimentacao: dados.dataPagamento,
                        dataCompetencia: titulo.dataCompetencia,
                        formaPagamento,
                        documento: titulo.numeroDocumento,
                        observacoes: dados.observacoes || null
                    }
                });

                const contaCompleta = await tx.contaPagar.findUnique({
                    where: {
                        id: contaPagar.id
                    },
                    include: includeContaPagarCompleta()
                });

                return {
                    contaPagar: contaCompleta,
                    movimentacao
                };
            },
            {
                isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
                maxWait: 5000,
                timeout: 10000
            }
        );
    }

    async cancelar(id, dados) {
        return prisma.$transaction(async (tx) => {
            const titulo = await tx.contaPagar.findFirst({
                where: {
                    id,
                    empresaId: dados.empresaId
                },
                include: {
                    movimentacoes: true
                }
            });

            if (!titulo) {
                throw new Error("Conta a pagar não encontrada.");
            }

            if (titulo.status === "CANCELADO") {
                throw new Error("Esta conta já está cancelada.");
            }

            if (titulo.status === "PAGO" || titulo.movimentacoes.length > 0) {
                throw new Error("Uma conta com pagamentos deve ser estornada antes do cancelamento.");
            }

            return tx.contaPagar.update({
                where: {
                    id: titulo.id
                },
                data: {
                    status: "CANCELADO",
                    observacoes: titulo.observacoes
                        ? `${titulo.observacoes}\nCancelamento: ${dados.motivo.trim()}`
                        : `Cancelamento: ${dados.motivo.trim()}`
                },
                include: includeContaPagarCompleta()
            });
        });
    }
}

module.exports = new ContaPagarRepository();
