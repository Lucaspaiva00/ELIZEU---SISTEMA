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

function includeContaReceberCompleta() {
    return {
        cliente: true,
        venda: {
            select: {
                id: true,
                numero: true,
                status: true,
                dataVenda: true
            }
        },
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

async function validarRelacionamentos(tx, dados) {
    const cliente = await tx.cliente.findFirst({
        where: {
            id: dados.clienteId,
            empresaId: dados.empresaId,
            ativo: true
        }
    });

    if (!cliente) {
        throw new Error("Cliente não encontrado para esta empresa.");
    }

    if (dados.categoriaFinanceiraId) {
        const categoria = await tx.categoriaFinanceira.findFirst({
            where: {
                id: dados.categoriaFinanceiraId,
                empresaId: dados.empresaId,
                ativa: true,
                natureza: {
                    in: ["RECEITA", "AMBAS"]
                }
            }
        });

        if (!categoria) {
            throw new Error("Categoria financeira de receita inválida.");
        }
    }

    if (dados.centroCustoId) {
        const centroCusto = await tx.centroCusto.findFirst({
            where: {
                id: dados.centroCustoId,
                empresaId: dados.empresaId,
                ativo: true
            }
        });

        if (!centroCusto) {
            throw new Error("Centro de custo inválido.");
        }
    }
}

class ContaReceberRepository {

    async criar(dados) {
        return prisma.$transaction(async (tx) => {
            await validarRelacionamentos(tx, dados);

            return tx.contaReceber.create({
                data: {
                    empresaId: dados.empresaId,
                    clienteId: dados.clienteId,
                    categoriaFinanceiraId: dados.categoriaFinanceiraId,
                    centroCustoId: dados.centroCustoId,
                    descricao: dados.descricao.trim(),
                    numeroDocumento: dados.numeroDocumento || null,
                    parcelaNumero: Number(dados.parcelaNumero) || 1,
                    totalParcelas: Number(dados.totalParcelas) || 1,
                    valorOriginal: dados.valorOriginal,
                    dataCompetencia: dados.dataCompetencia,
                    dataEmissao: dados.dataEmissao,
                    dataVencimento: dados.dataVencimento,
                    formaPagamento: dados.formaPagamento || null,
                    status: dados.dataVencimento < inicioDoDia()
                        ? "ATRASADO"
                        : "PENDENTE",
                    observacoes: dados.observacoes || null
                },
                include: includeContaReceberCompleta()
            });
        });
    }

    async atualizarAtrasados(empresaId) {
        return prisma.contaReceber.updateMany({
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

        if (filtros.clienteId) {
            where.clienteId = filtros.clienteId;
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
                    numeroDocumento: {
                        contains: filtros.busca,
                        mode: "insensitive"
                    }
                },
                {
                    cliente: {
                        nome: {
                            contains: filtros.busca,
                            mode: "insensitive"
                        }
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

        const [contasReceber, total] = await prisma.$transaction([
            prisma.contaReceber.findMany({
                where,
                include: includeContaReceberCompleta(),
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
            prisma.contaReceber.count({ where })
        ]);

        return {
            contasReceber,
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

        const titulos = await prisma.contaReceber.findMany({
            where,
            select: {
                status: true,
                valorOriginal: true,
                valorDesconto: true,
                valorJuros: true,
                valorMulta: true,
                valorRecebido: true,
                dataVencimento: true
            }
        });

        const hojeInicio = inicioDoDia();
        const hojeFim = fimDoDia();

        const resumo = {
            totalOriginal: 0,
            totalEmAberto: 0,
            totalAtrasado: 0,
            totalRecebido: 0,
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
            const valorRecebido = Number(titulo.valorRecebido);
            const saldo = Math.max(valorAtual - valorRecebido, 0);

            resumo.totalOriginal += Number(titulo.valorOriginal);
            resumo.totalRecebido += valorRecebido;

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
            "totalRecebido",
            "totalVencendoHoje"
        ]) {
            resumo[chave] = Number(resumo[chave].toFixed(2));
        }

        return resumo;
    }

    async buscarPorId(id, empresaId) {
        return prisma.contaReceber.findFirst({
            where: {
                id,
                empresaId
            },
            include: includeContaReceberCompleta()
        });
    }

    async atualizar(id, dados) {
        return prisma.$transaction(async (tx) => {
            await validarRelacionamentos(tx, dados);

            return tx.contaReceber.update({
                where: {
                    id
                },
                data: {
                    clienteId: dados.clienteId,
                    categoriaFinanceiraId: dados.categoriaFinanceiraId,
                    centroCustoId: dados.centroCustoId,
                    descricao: dados.descricao.trim(),
                    numeroDocumento: dados.numeroDocumento || null,
                    parcelaNumero: Number(dados.parcelaNumero) || 1,
                    totalParcelas: Number(dados.totalParcelas) || 1,
                    valorOriginal: dados.valorOriginal,
                    dataCompetencia: dados.dataCompetencia,
                    dataVencimento: dados.dataVencimento,
                    formaPagamento: dados.formaPagamento || null,
                    status: dados.dataVencimento < inicioDoDia()
                        ? "ATRASADO"
                        : "PENDENTE",
                    observacoes: dados.observacoes || null
                },
                include: includeContaReceberCompleta()
            });
        });
    }

    async receber(id, dados) {
        return prisma.$transaction(
            async (tx) => {
                const titulo = await tx.contaReceber.findFirst({
                    where: {
                        id,
                        empresaId: dados.empresaId
                    }
                });

                if (!titulo) {
                    throw new Error("Conta a receber não encontrada.");
                }

                if (titulo.status === "PAGO") {
                    throw new Error("Esta conta já foi recebida integralmente.");
                }

                if (titulo.status === "CANCELADO") {
                    throw new Error("Uma conta cancelada não pode ser recebida.");
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
                const recebidoAtualizado = new Prisma.Decimal(titulo.valorRecebido)
                    .plus(dados.valor);

                const valorTotalAtualizado = new Prisma.Decimal(titulo.valorOriginal)
                    .plus(jurosAtualizados)
                    .plus(multaAtualizada)
                    .minus(descontoAtualizado);

                if (valorTotalAtualizado.lessThanOrEqualTo(0)) {
                    throw new Error("Os descontos não podem zerar ou tornar o título negativo.");
                }

                if (recebidoAtualizado.greaterThan(valorTotalAtualizado)) {
                    const saldoDisponivel = valorTotalAtualizado
                        .minus(titulo.valorRecebido)
                        .toFixed(2);

                    throw new Error(`O recebimento ultrapassa o saldo atual de R$ ${saldoDisponivel}.`);
                }

                const totalmentePago = recebidoAtualizado.equals(valorTotalAtualizado);
                const vencida = titulo.dataVencimento < inicioDoDia(dados.dataRecebimento);
                const novoStatus = totalmentePago
                    ? "PAGO"
                    : vencida
                        ? "ATRASADO"
                        : "PARCIAL";

                const formaPagamento = dados.formaPagamento || titulo.formaPagamento;

                const contaReceber = await tx.contaReceber.update({
                    where: {
                        id: titulo.id
                    },
                    data: {
                        valorDesconto: descontoAtualizado,
                        valorJuros: jurosAtualizados,
                        valorMulta: multaAtualizada,
                        valorRecebido: recebidoAtualizado,
                        dataRecebimento: dados.dataRecebimento,
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
                        contaReceberId: titulo.id,
                        criadoPorId: dados.usuarioId,
                        tipo: "ENTRADA",
                        origem: "CONTA_RECEBER",
                        descricao: `Recebimento: ${titulo.descricao}`,
                        valor: dados.valor,
                        dataMovimentacao: dados.dataRecebimento,
                        dataCompetencia: titulo.dataCompetencia,
                        formaPagamento,
                        documento: titulo.numeroDocumento,
                        observacoes: dados.observacoes || null
                    }
                });

                const contaCompleta = await tx.contaReceber.findUnique({
                    where: {
                        id: contaReceber.id
                    },
                    include: includeContaReceberCompleta()
                });

                return {
                    contaReceber: contaCompleta,
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
            const titulo = await tx.contaReceber.findFirst({
                where: {
                    id,
                    empresaId: dados.empresaId
                },
                include: {
                    movimentacoes: true
                }
            });

            if (!titulo) {
                throw new Error("Conta a receber não encontrada.");
            }

            if (titulo.status === "CANCELADO") {
                throw new Error("Esta conta já está cancelada.");
            }

            if (titulo.status === "PAGO" || titulo.movimentacoes.length > 0) {
                throw new Error("Uma conta com recebimentos deve ser estornada antes do cancelamento.");
            }

            return tx.contaReceber.update({
                where: {
                    id: titulo.id
                },
                data: {
                    status: "CANCELADO",
                    observacoes: titulo.observacoes
                        ? `${titulo.observacoes}\nCancelamento: ${dados.motivo.trim()}`
                        : `Cancelamento: ${dados.motivo.trim()}`
                },
                include: includeContaReceberCompleta()
            });
        });
    }
}

module.exports = new ContaReceberRepository();
