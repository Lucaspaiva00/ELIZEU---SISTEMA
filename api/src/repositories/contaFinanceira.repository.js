const prisma = require("../config/prisma");

async function calcularSaldos(empresaId) {
    const agrupamentos = await prisma.movimentacaoFinanceira.groupBy({
        by: ["contaFinanceiraId", "tipo"],
        where: {
            empresaId
        },
        _sum: {
            valor: true
        }
    });

    const saldos = new Map();

    for (const grupo of agrupamentos) {
        const atual = saldos.get(grupo.contaFinanceiraId) || {
            entradas: 0,
            saidas: 0
        };
        const valor = Number(grupo._sum.valor || 0);

        if (grupo.tipo === "ENTRADA") {
            atual.entradas += valor;
        } else {
            atual.saidas += valor;
        }

        saldos.set(grupo.contaFinanceiraId, atual);
    }

    return saldos;
}

function adicionarSaldo(conta, saldos) {
    const movimentacoes = saldos.get(conta.id) || {
        entradas: 0,
        saidas: 0
    };

    return {
        ...conta,
        totalEntradas: Number(movimentacoes.entradas.toFixed(2)),
        totalSaidas: Number(movimentacoes.saidas.toFixed(2)),
        saldoAtual: Number((
            Number(conta.saldoInicial) +
            movimentacoes.entradas -
            movimentacoes.saidas
        ).toFixed(2))
    };
}

class ContaFinanceiraRepository {

    async criar(dados) {
        return prisma.$transaction(async (tx) => {
            const existente = await tx.contaFinanceira.findFirst({
                where: {
                    empresaId: dados.empresaId,
                    nome: {
                        equals: dados.nome,
                        mode: "insensitive"
                    }
                }
            });

            if (existente) {
                throw new Error("Já existe uma conta financeira com este nome.");
            }

            const quantidade = await tx.contaFinanceira.count({
                where: {
                    empresaId: dados.empresaId,
                    ativa: true
                }
            });

            const deveSerPadrao = dados.padrao || quantidade === 0;

            if (deveSerPadrao) {
                await tx.contaFinanceira.updateMany({
                    where: {
                        empresaId: dados.empresaId
                    },
                    data: {
                        padrao: false
                    }
                });
            }

            return tx.contaFinanceira.create({
                data: {
                    empresaId: dados.empresaId,
                    nome: dados.nome,
                    tipo: dados.tipo,
                    banco: dados.banco?.trim() || null,
                    agencia: dados.agencia?.trim() || null,
                    numeroConta: dados.numeroConta?.trim() || null,
                    saldoInicial: dados.saldoInicial,
                    dataSaldoInicial: dados.dataSaldoInicial,
                    padrao: deveSerPadrao,
                    ativa: dados.ativa
                }
            });
        });
    }

    async listar(empresaId, filtros) {
        const contas = await prisma.contaFinanceira.findMany({
            where: {
                empresaId,
                ...(filtros.incluirInativas ? {} : { ativa: true })
            },
            include: {
                _count: {
                    select: {
                        movimentacoes: true
                    }
                }
            },
            orderBy: [
                {
                    padrao: "desc"
                },
                {
                    nome: "asc"
                }
            ]
        });

        const saldos = await calcularSaldos(empresaId);
        return contas.map((conta) => adicionarSaldo(conta, saldos));
    }

    async buscarPorId(id, empresaId) {
        const conta = await prisma.contaFinanceira.findFirst({
            where: {
                id,
                empresaId
            },
            include: {
                _count: {
                    select: {
                        movimentacoes: true
                    }
                }
            }
        });

        if (!conta) {
            return null;
        }

        const saldos = await calcularSaldos(empresaId);
        return adicionarSaldo(conta, saldos);
    }

    async atualizar(id, dados) {
        return prisma.$transaction(async (tx) => {
            const contaAtual = await tx.contaFinanceira.findFirst({
                where: {
                    id,
                    empresaId: dados.empresaId
                },
                include: {
                    _count: {
                        select: {
                            movimentacoes: true
                        }
                    }
                }
            });

            if (!contaAtual) {
                throw new Error("Conta financeira não encontrada.");
            }

            const duplicada = await tx.contaFinanceira.findFirst({
                where: {
                    empresaId: dados.empresaId,
                    id: {
                        not: id
                    },
                    nome: {
                        equals: dados.nome,
                        mode: "insensitive"
                    }
                }
            });

            if (duplicada) {
                throw new Error("Já existe outra conta financeira com este nome.");
            }

            if (
                contaAtual._count.movimentacoes > 0 &&
                Number(contaAtual.saldoInicial) !== Number(dados.saldoInicial)
            ) {
                throw new Error("O saldo inicial não pode ser alterado após existirem movimentações.");
            }

            if (dados.padrao) {
                await tx.contaFinanceira.updateMany({
                    where: {
                        empresaId: dados.empresaId
                    },
                    data: {
                        padrao: false
                    }
                });
            }

            return tx.contaFinanceira.update({
                where: {
                    id
                },
                data: {
                    nome: dados.nome,
                    tipo: dados.tipo,
                    banco: dados.banco?.trim() || null,
                    agencia: dados.agencia?.trim() || null,
                    numeroConta: dados.numeroConta?.trim() || null,
                    saldoInicial: dados.saldoInicial,
                    dataSaldoInicial: dados.dataSaldoInicial,
                    padrao: dados.padrao || contaAtual.padrao,
                    ativa: contaAtual.ativa
                }
            });
        });
    }

    async tornarPadrao(id, empresaId) {
        return prisma.$transaction(async (tx) => {
            const conta = await tx.contaFinanceira.findFirst({
                where: {
                    id,
                    empresaId,
                    ativa: true
                }
            });

            if (!conta) {
                throw new Error("A conta precisa estar ativa para ser definida como padrão.");
            }

            await tx.contaFinanceira.updateMany({
                where: {
                    empresaId
                },
                data: {
                    padrao: false
                }
            });

            return tx.contaFinanceira.update({
                where: {
                    id
                },
                data: {
                    padrao: true
                }
            });
        });
    }

    async desativar(id, empresaId) {
        return prisma.$transaction(async (tx) => {
            const conta = await tx.contaFinanceira.findFirst({
                where: {
                    id,
                    empresaId
                }
            });

            if (!conta) {
                throw new Error("Conta financeira não encontrada.");
            }

            if (!conta.ativa) {
                throw new Error("Esta conta financeira já está desativada.");
            }

            const outrasContas = await tx.contaFinanceira.findMany({
                where: {
                    empresaId,
                    ativa: true,
                    id: {
                        not: id
                    }
                },
                orderBy: {
                    id: "asc"
                }
            });

            if (outrasContas.length === 0) {
                throw new Error("Não é possível desativar a única conta financeira ativa.");
            }

            if (conta.padrao) {
                await tx.contaFinanceira.update({
                    where: {
                        id: outrasContas[0].id
                    },
                    data: {
                        padrao: true
                    }
                });
            }

            return tx.contaFinanceira.update({
                where: {
                    id
                },
                data: {
                    ativa: false,
                    padrao: false
                }
            });
        });
    }
}

module.exports = new ContaFinanceiraRepository();
