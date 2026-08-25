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
        case "SEMANAL": return adicionarDias(primeiroVencimento, indice * 7);
        case "QUINZENAL": return adicionarDias(primeiroVencimento, indice * 15);
        case "BIMESTRAL": return adicionarMeses(primeiroVencimento, indice * 2);
        case "TRIMESTRAL": return adicionarMeses(primeiroVencimento, indice * 3);
        case "SEMESTRAL": return adicionarMeses(primeiroVencimento, indice * 6);
        case "ANUAL": return adicionarMeses(primeiroVencimento, indice * 12);
        case "PERSONALIZADA": return adicionarDias(primeiroVencimento, indice * intervaloPersonalizadoDias);
        case "MENSAL":
        default: return adicionarMeses(primeiroVencimento, indice);
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

function arredondar(valor) {
    return Math.round((Number(valor) + Number.EPSILON) * 100) / 100;
}

async function prepararItensComCusto(tx, itens) {
    const preparados = [];
    let custoItensTotal = 0;

    for (const item of itens) {
        let custoUnitario = 0;

        if (item.tipo === "SERVICO") {
            const variacao = await tx.variacaoServico.findUnique({
                where: { id: item.variacaoServicoId },
                select: { id: true, precoCusto: true }
            });

            if (!variacao) throw new Error("Uma das variações de serviço não existe mais.");
            custoUnitario = Number(variacao.precoCusto || 0);
        } else {
            const variacao = await tx.variacaoProduto.findUnique({
                where: { id: item.variacaoProdutoId },
                select: { id: true, precoCusto: true }
            });

            if (!variacao) throw new Error("Uma das variações de produto não existe mais.");
            custoUnitario = Number(variacao.precoCusto || 0);
        }

        const quantidade = Number(item.quantidade);
        custoItensTotal += quantidade * custoUnitario;

        preparados.push({
            ...item,
            custoUnitario: arredondar(custoUnitario)
        });
    }

    return {
        itens: preparados,
        custoItensTotal: arredondar(custoItensTotal)
    };
}

function calcularResumo(dados, custoItensTotal) {
    const subtotal = arredondar(
        dados.itens.reduce((total, item) => total + Number(item.total || 0), 0)
    );
    const desconto = arredondar(dados.desconto || 0);
    const frete = arredondar(dados.frete || 0);
    const outrasDespesas = arredondar(dados.outrasDespesas || 0);
    const total = arredondar(Math.max(subtotal - desconto + frete + outrasDespesas, 0));
    const custoInternoTotal = arredondar(
        (dados.custosInternos || []).reduce((soma, custo) => soma + Number(custo.total || 0), 0)
    );
    const lucroEstimado = arredondar(total - custoItensTotal - custoInternoTotal);

    return {
        subtotal,
        desconto,
        frete,
        outrasDespesas,
        total,
        custoItensTotal,
        custoInternoTotal,
        lucroEstimado,
        custosInternos: dados.custosInternos || []
    };
}

function includeOrcamentoCompleto() {
    return {
        empresa: true,
        cliente: true,
        tabelaPreco: true,
        criadoPor: { select: { id: true, nome: true } },
        aprovadoPor: { select: { id: true, nome: true } },
        venda: {
            include: {
                contasReceber: { orderBy: { parcelaNumero: "asc" } }
            }
        },
        itens: {
            include: {
                variacaoProduto: { include: { produto: true } },
                variacaoServico: { include: { servico: true } }
            }
        }
    };
}

class OrcamentoRepository {
    async criar(dados) {
        return prisma.$transaction(async (tx) => {
            const ultimo = await tx.orcamento.findFirst({
                where: { empresaId: dados.empresaId },
                orderBy: { numero: "desc" }
            });

            const numero = ultimo ? ultimo.numero + 1 : 1;
            const custos = await prepararItensComCusto(tx, dados.itens);
            const resumo = calcularResumo(dados, custos.custoItensTotal);

            const orcamento = await tx.orcamento.create({
                data: {
                    empresaId: dados.empresaId,
                    clienteId: dados.clienteId,
                    criadoPorId: dados.criadoPorId,
                    tabelaPrecoId: dados.tabelaPrecoId || null,
                    numero,
                    status: dados.status || "RASCUNHO",
                    dataValidade: dados.dataValidade ? new Date(dados.dataValidade) : null,
                    ...resumo,
                    observacoes: dados.observacoes
                }
            });

            await tx.itemOrcamento.createMany({
                data: custos.itens.map((item) => ({
                    orcamentoId: orcamento.id,
                    tipo: item.tipo,
                    variacaoProdutoId: item.tipo === "PRODUTO" ? item.variacaoProdutoId : null,
                    variacaoServicoId: item.tipo === "SERVICO" ? item.variacaoServicoId : null,
                    quantidade: item.quantidade,
                    valorUnitario: item.valorUnitario,
                    desconto: item.desconto ?? 0,
                    total: item.total,
                    custoUnitario: item.custoUnitario
                }))
            });

            return tx.orcamento.findUnique({
                where: { id: orcamento.id },
                include: includeOrcamentoCompleto()
            });
        });
    }

    async listar(empresaId) {
        return prisma.orcamento.findMany({
            where: { empresaId },
            include: includeOrcamentoCompleto(),
            orderBy: { numero: "desc" }
        });
    }

    async buscarPorId(id, empresaId) {
        return prisma.orcamento.findFirst({
            where: { id, empresaId },
            include: includeOrcamentoCompleto()
        });
    }

    async atualizar(id, dados) {
        return prisma.$transaction(async (tx) => {
            const custos = await prepararItensComCusto(tx, dados.itens);
            const resumo = calcularResumo(dados, custos.custoItensTotal);

            await tx.orcamento.update({
                where: { id },
                data: {
                    clienteId: dados.clienteId,
                    tabelaPrecoId: dados.tabelaPrecoId || null,
                    dataValidade: dados.dataValidade ? new Date(dados.dataValidade) : null,
                    ...resumo,
                    observacoes: dados.observacoes
                }
            });

            await tx.itemOrcamento.deleteMany({ where: { orcamentoId: id } });

            await tx.itemOrcamento.createMany({
                data: custos.itens.map((item) => ({
                    orcamentoId: id,
                    tipo: item.tipo,
                    variacaoProdutoId: item.tipo === "PRODUTO" ? item.variacaoProdutoId : null,
                    variacaoServicoId: item.tipo === "SERVICO" ? item.variacaoServicoId : null,
                    quantidade: item.quantidade,
                    valorUnitario: item.valorUnitario,
                    desconto: item.desconto ?? 0,
                    total: item.total,
                    custoUnitario: item.custoUnitario
                }))
            });

            return tx.orcamento.findUnique({
                where: { id },
                include: includeOrcamentoCompleto()
            });
        });
    }

    async aprovar(id, dados) {
        return prisma.$transaction(
            async (tx) => {
                const orcamento = await tx.orcamento.findFirst({
                    where: { id, empresaId: dados.empresaId },
                    include: {
                        venda: true,
                        cliente: true,
                        itens: {
                            include: {
                                variacaoProduto: { include: { produto: true } },
                                variacaoServico: { include: { servico: true } }
                            }
                        }
                    }
                });

                if (!orcamento) throw new Error("Orçamento não encontrado.");
                if (orcamento.status === "APROVADO" || orcamento.venda) {
                    throw new Error("Este orçamento já gerou uma venda.");
                }
                if (["CANCELADO", "REJEITADO", "VENCIDO"].includes(orcamento.status)) {
                    throw new Error(`Não é possível aprovar um orçamento com status ${orcamento.status}.`);
                }
                if (!orcamento.itens.length) throw new Error("O orçamento não possui itens.");
                if (Number(orcamento.total) <= 0) throw new Error("O total do orçamento deve ser maior que zero.");

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
                        custosInternos: orcamento.custosInternos || [],
                        custoItensTotal: orcamento.custoItensTotal,
                        custoInternoTotal: orcamento.custoInternoTotal,
                        lucroEstimado: orcamento.lucroEstimado,
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

                        if (!variacao || !servico) throw new Error("Serviço do orçamento não encontrado.");

                        await tx.itemVenda.create({
                            data: {
                                vendaId: venda.id,
                                tipo: "SERVICO",
                                variacaoServicoId: variacao.id,
                                codigoProduto: servico.codigo,
                                sku: variacao.codigo,
                                descricao: variacao.descricao ? `${servico.nome} - ${variacao.descricao}` : servico.nome,
                                quantidade: item.quantidade,
                                valorUnitario: item.valorUnitario,
                                desconto: item.desconto,
                                total: item.total,
                                custoUnitario: item.custoUnitario
                            }
                        });
                        continue;
                    }

                    const variacao = item.variacaoProduto;
                    const produto = variacao?.produto;

                    if (!variacao || !produto) throw new Error("Produto do orçamento não encontrado.");

                    await tx.itemVenda.create({
                        data: {
                            vendaId: venda.id,
                            tipo: "PRODUTO",
                            variacaoProdutoId: variacao.id,
                            codigoProduto: produto.codigo,
                            sku: variacao.sku,
                            descricao: variacao.descricao ? `${produto.nome} - ${variacao.descricao}` : produto.nome,
                            quantidade: item.quantidade,
                            valorUnitario: item.valorUnitario,
                            desconto: item.desconto,
                            total: item.total,
                            custoUnitario: item.custoUnitario
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

                return { orcamento: orcamentoAprovado, venda };
            },
            {
                isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
                maxWait: 5000,
                timeout: 15000
            }
        );
    }

    async marcarEnviado(id, empresaId) {
        const orcamento = await prisma.orcamento.findFirst({
            where: { id, empresaId },
            select: { id: true, status: true }
        });

        if (!orcamento) {
            throw new Error("Orçamento não encontrado.");
        }

        if (["CANCELADO", "REJEITADO", "VENCIDO"].includes(orcamento.status)) {
            throw new Error(`Não é possível marcar como enviado um orçamento com status ${orcamento.status}.`);
        }

        if (orcamento.status === "RASCUNHO") {
            await prisma.orcamento.update({
                where: { id },
                data: { status: "ENVIADO" }
            });
        }

        return this.buscarPorId(id, empresaId);
    }

    async excluir(id, empresaId) {
        const resultado = await prisma.orcamento.deleteMany({
            where: { id, empresaId }
        });

        if (resultado.count !== 1) throw new Error("Orçamento não encontrado.");
        return resultado;
    }
}

module.exports = new OrcamentoRepository();
