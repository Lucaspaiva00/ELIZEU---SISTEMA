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
    const ultimoDia = new Date(resultado.getFullYear(), resultado.getMonth() + 1, 0).getDate();
    resultado.setDate(Math.min(diaOriginal, ultimoDia));
    return resultado;
}

function calcularVencimento(primeiro, indice, periodicidade, intervalo) {
    switch (periodicidade) {
        case "SEMANAL": return adicionarDias(primeiro, indice * 7);
        case "QUINZENAL": return adicionarDias(primeiro, indice * 15);
        case "BIMESTRAL": return adicionarMeses(primeiro, indice * 2);
        case "TRIMESTRAL": return adicionarMeses(primeiro, indice * 3);
        case "SEMESTRAL": return adicionarMeses(primeiro, indice * 6);
        case "ANUAL": return adicionarMeses(primeiro, indice * 12);
        case "PERSONALIZADA": return adicionarDias(primeiro, indice * intervalo);
        default: return adicionarMeses(primeiro, indice);
    }
}

function dividirValor(valorTotal, quantidade) {
    const totalCentavos = Math.round(Number(valorTotal) * 100);
    const base = Math.floor(totalCentavos / quantidade);
    const resto = totalCentavos - base * quantidade;
    return Array.from({ length: quantidade }, (_, i) => new Prisma.Decimal(base + (i < resto ? 1 : 0)).dividedBy(100));
}

function includeVenda() {
    return {
        cliente: true,
        orcamento: { select: { id: true, numero: true, status: true } },
        criadoPor: { select: { id: true, nome: true } },
        itens: {
            include: {
                variacaoProduto: { include: { produto: true } },
                variacaoServico: { include: { servico: true } }
            },
            orderBy: { id: "asc" }
        },
        contasReceber: { orderBy: { parcelaNumero: "asc" } },
        movimentacoesEstoque: true
    };
}

class VendaRepository {
    async listar(empresaId) {
        return prisma.venda.findMany({
            where: { empresaId },
            include: includeVenda(),
            orderBy: { numero: "desc" }
        });
    }

    async buscarPorId(id, empresaId) {
        return prisma.venda.findFirst({
            where: { id, empresaId },
            include: includeVenda()
        });
    }

    async faturar(id, dados) {
        return prisma.$transaction(async (tx) => {
            const venda = await tx.venda.findFirst({
                where: { id, empresaId: dados.empresaId },
                include: includeVenda()
            });

            if (!venda) throw new Error("Venda não encontrada.");
            if (venda.status === "CANCELADA") throw new Error("Venda cancelada não pode ser faturada.");
            if (venda.status === "FATURADA") throw new Error("Venda já está faturada.");

            for (const item of venda.itens) {
                if (item.tipo !== "PRODUTO" || !item.variacaoProduto) continue;
                const produto = item.variacaoProduto.produto;
                if (!produto.controlaEstoque) continue;

                const movimentoExistente = await tx.movimentacaoEstoque.findFirst({
                    where: { vendaId: venda.id, itemVendaId: item.id, origem: "VENDA" }
                });
                if (movimentoExistente) continue;

                const variacaoAtual = await tx.variacaoProduto.findUnique({ where: { id: item.variacaoProdutoId } });
                if (!variacaoAtual) throw new Error(`Variação do item ${item.descricao} não encontrada.`);

                if (!produto.permiteVendaSemEstoque && variacaoAtual.estoqueAtual.lessThan(item.quantidade)) {
                    throw new Error(`Estoque insuficiente para ${item.descricao}.`);
                }

                const saldoAnterior = variacaoAtual.estoqueAtual;
                const saldoPosterior = saldoAnterior.minus(item.quantidade);

                await tx.variacaoProduto.update({
                    where: { id: item.variacaoProdutoId },
                    data: { estoqueAtual: { decrement: item.quantidade } }
                });

                await tx.movimentacaoEstoque.create({
                    data: {
                        empresaId: dados.empresaId,
                        variacaoProdutoId: item.variacaoProdutoId,
                        vendaId: venda.id,
                        itemVendaId: item.id,
                        responsavelId: dados.usuarioId,
                        tipo: "SAIDA",
                        origem: "VENDA",
                        quantidade: item.quantidade,
                        saldoAnterior,
                        saldoPosterior,
                        observacoes: `Baixa de estoque no faturamento da venda nº ${venda.numero}.`
                    }
                });
            }

            const contasExistentes = await tx.contaReceber.count({ where: { vendaId: venda.id } });
            if (!contasExistentes) {
                const categoria = await tx.categoriaFinanceira.findFirst({
                    where: { empresaId: dados.empresaId, nome: "Vendas de Produtos e Serviços", ativa: true }
                });
                const centro = await tx.centroCusto.findFirst({
                    where: { empresaId: dados.empresaId, codigo: "GERAL", ativo: true }
                });
                const parcelas = dividirValor(venda.total, venda.quantidadeParcelas);

                for (let i = 0; i < venda.quantidadeParcelas; i += 1) {
                    const numero = i + 1;
                    await tx.contaReceber.create({
                        data: {
                            empresaId: dados.empresaId,
                            vendaId: venda.id,
                            clienteId: venda.clienteId,
                            categoriaFinanceiraId: categoria?.id || null,
                            centroCustoId: centro?.id || null,
                            descricao: `Venda nº ${venda.numero} - Parcela ${numero}/${venda.quantidadeParcelas}`,
                            numeroDocumento: `VENDA-${venda.numero}`,
                            parcelaNumero: numero,
                            totalParcelas: venda.quantidadeParcelas,
                            valorOriginal: parcelas[i],
                            dataCompetencia: new Date(),
                            dataVencimento: calcularVencimento(
                                venda.primeiroVencimento,
                                i,
                                venda.periodicidadeParcelas,
                                30
                            ),
                            formaPagamento: venda.formaPagamento,
                            status: "PENDENTE"
                        }
                    });
                }
            }

            await tx.venda.update({ where: { id: venda.id }, data: { status: "FATURADA" } });

            return tx.venda.findUnique({ where: { id: venda.id }, include: includeVenda() });
        }, {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            maxWait: 5000,
            timeout: 15000
        });
    }

    async cancelar(id, empresaId, motivo) {
        const venda = await this.buscarPorId(id, empresaId);
        if (!venda) throw new Error("Venda não encontrada.");
        if (venda.status === "FATURADA") throw new Error("Venda faturada deve ser estornada pelo financeiro antes do cancelamento.");
        if (venda.status === "CANCELADA") throw new Error("Venda já está cancelada.");
        return prisma.venda.update({
            where: { id },
            data: { status: "CANCELADA", canceladaEm: new Date(), motivoCancelamento: motivo || null },
            include: includeVenda()
        });
    }
}

module.exports = new VendaRepository();
