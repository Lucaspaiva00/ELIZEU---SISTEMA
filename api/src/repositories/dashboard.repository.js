const prisma = require("../config/prisma");

class DashboardRepository {

    numero(valor) {
        return Number(valor || 0);
    }

    valorPendente(titulo, campoBaixado) {
        return Math.max(
            0,
            this.numero(titulo.valorOriginal)
                - this.numero(titulo.valorDesconto)
                + this.numero(titulo.valorJuros)
                + this.numero(titulo.valorMulta)
                - this.numero(titulo[campoBaixado])
        );
    }

    chaveFluxo(data, agruparPorMes) {
        const iso = new Date(data).toISOString();
        return agruparPorMes ? iso.slice(0, 7) : iso.slice(0, 10);
    }

    async buscarFinanceiro(empresaId, { periodo, dataInicio, dataFim }) {
        const agora = new Date();
        const hoje = new Date(agora);
        hoje.setHours(0, 0, 0, 0);
        const horizonte = new Date(hoje);
        horizonte.setDate(horizonte.getDate() + 30);
        horizonte.setHours(23, 59, 59, 999);

        await Promise.all([
            prisma.contaReceber.updateMany({
                where: {
                    empresaId,
                    status: { in: ["PENDENTE", "PARCIAL"] },
                    dataVencimento: { lt: hoje }
                },
                data: { status: "ATRASADO" }
            }),
            prisma.contaPagar.updateMany({
                where: {
                    empresaId,
                    status: { in: ["PENDENTE", "PARCIAL"] },
                    dataVencimento: { lt: hoje }
                },
                data: { status: "ATRASADO" }
            })
        ]);

        const filtroPeriodo = { gte: dataInicio, lte: dataFim };
        const statusAbertos = ["PENDENTE", "PARCIAL", "ATRASADO"];

        const [
            contas,
            todasMovimentacoes,
            movimentacoesPeriodo,
            receberAbertas,
            pagarAbertas,
            receberProximas,
            pagarProximas,
            receberProjecao,
            pagarProjecao,
            ultimasMovimentacoes,
            vendasPeriodo,
            orcamentosPeriodo,
            itensVendaPeriodo
        ] = await Promise.all([
            prisma.contaFinanceira.findMany({
                where: { empresaId },
                orderBy: [{ padrao: "desc" }, { nome: "asc" }]
            }),
            prisma.movimentacaoFinanceira.findMany({
                where: { empresaId },
                select: { contaFinanceiraId: true, tipo: true, valor: true }
            }),
            prisma.movimentacaoFinanceira.findMany({
                where: { empresaId, dataMovimentacao: filtroPeriodo },
                include: {
                    contaFinanceira: { select: { id: true, nome: true } },
                    categoriaFinanceira: { select: { id: true, nome: true, natureza: true } }
                },
                orderBy: { dataMovimentacao: "asc" }
            }),
            prisma.contaReceber.findMany({
                where: { empresaId, status: { in: statusAbertos } }
            }),
            prisma.contaPagar.findMany({
                where: { empresaId, status: { in: statusAbertos } }
            }),
            prisma.contaReceber.findMany({
                where: { empresaId, status: { in: statusAbertos } },
                include: { cliente: { select: { id: true, nome: true } } },
                orderBy: { dataVencimento: "asc" },
                take: 8
            }),
            prisma.contaPagar.findMany({
                where: { empresaId, status: { in: statusAbertos } },
                orderBy: { dataVencimento: "asc" },
                take: 8
            }),
            prisma.contaReceber.findMany({
                where: {
                    empresaId,
                    status: { in: statusAbertos },
                    dataVencimento: { gte: hoje, lte: horizonte }
                }
            }),
            prisma.contaPagar.findMany({
                where: {
                    empresaId,
                    status: { in: statusAbertos },
                    dataVencimento: { gte: hoje, lte: horizonte }
                }
            }),
            prisma.movimentacaoFinanceira.findMany({
                where: { empresaId },
                include: {
                    contaFinanceira: { select: { id: true, nome: true } },
                    categoriaFinanceira: { select: { id: true, nome: true } }
                },
                orderBy: [{ dataMovimentacao: "desc" }, { id: "desc" }],
                take: 10
            }),
            prisma.venda.findMany({
                where: { empresaId, status: { in: ["CONFIRMADA", "FATURADA"] }, dataVenda: filtroPeriodo },
                select: {
                    id: true,
                    numero: true,
                    status: true,
                    dataVenda: true,
                    total: true,
                    custoItensTotal: true,
                    custoInternoTotal: true,
                    lucroEstimado: true,
                    cliente: { select: { id: true, nome: true } },
                    contasReceber: { select: { valorRecebido: true } },
                    contasPagar: { select: { valorPago: true, status: true } }
                },
                orderBy: [{ dataVenda: "desc" }, { numero: "desc" }]
            }),
            prisma.orcamento.findMany({
                where: { empresaId, criadoEm: filtroPeriodo },
                select: { status: true, total: true }
            }),
            prisma.itemVenda.findMany({
                where: {
                    venda: {
                        empresaId,
                        status: { in: ["CONFIRMADA", "FATURADA"] },
                        dataVenda: filtroPeriodo
                    }
                },
                select: {
                    descricao: true,
                    tipo: true,
                    quantidade: true,
                    total: true
                }
            })
        ]);

        const saldoPorConta = new Map(
            contas.map(conta => [conta.id, this.numero(conta.saldoInicial)])
        );
        todasMovimentacoes.forEach(movimento => {
            const saldo = saldoPorConta.get(movimento.contaFinanceiraId) || 0;
            const sinal = movimento.tipo === "ENTRADA" ? 1 : -1;
            saldoPorConta.set(
                movimento.contaFinanceiraId,
                saldo + (sinal * this.numero(movimento.valor))
            );
        });

        const contasComSaldo = contas.map(conta => ({
            id: conta.id,
            nome: conta.nome,
            tipo: conta.tipo,
            banco: conta.banco,
            padrao: conta.padrao,
            ativa: conta.ativa,
            saldoAtual: saldoPorConta.get(conta.id) || 0
        }));
        const saldoConsolidado = contasComSaldo.reduce((total, conta) => total + conta.saldoAtual, 0);

        let entradasPeriodo = 0;
        let saidasPeriodo = 0;
        const categorias = new Map();
        const agruparPorMes = (dataFim - dataInicio) > (1000 * 60 * 60 * 24 * 90);
        const fluxo = new Map();

        movimentacoesPeriodo.forEach(movimento => {
            const valor = this.numero(movimento.valor);
            if (movimento.tipo === "ENTRADA") entradasPeriodo += valor;
            else saidasPeriodo += valor;

            const chave = this.chaveFluxo(movimento.dataMovimentacao, agruparPorMes);
            if (!fluxo.has(chave)) fluxo.set(chave, { periodo: chave, entradas: 0, saidas: 0 });
            fluxo.get(chave)[movimento.tipo === "ENTRADA" ? "entradas" : "saidas"] += valor;

            const categoriaNome = movimento.categoriaFinanceira?.nome || "Sem categoria";
            const categoriaChave = `${movimento.tipo}:${categoriaNome}`;
            if (!categorias.has(categoriaChave)) {
                categorias.set(categoriaChave, {
                    categoria: categoriaNome,
                    tipo: movimento.tipo,
                    valor: 0
                });
            }
            categorias.get(categoriaChave).valor += valor;
        });

        const totalReceberAberto = receberAbertas.reduce(
            (total, titulo) => total + this.valorPendente(titulo, "valorRecebido"), 0
        );
        const totalPagarAberto = pagarAbertas.reduce(
            (total, titulo) => total + this.valorPendente(titulo, "valorPago"), 0
        );
        const receberAtrasado = receberAbertas.filter(titulo => titulo.status === "ATRASADO");
        const pagarAtrasado = pagarAbertas.filter(titulo => titulo.status === "ATRASADO");
        const totalVendas = vendasPeriodo.reduce((total, venda) => total + this.numero(venda.total), 0);
        const aprovados = orcamentosPeriodo.filter(orcamento => orcamento.status === "APROVADO");
        const orcamentosEmAberto = orcamentosPeriodo.filter(orcamento =>
            ["RASCUNHO", "ENVIADO"].includes(orcamento.status)
        );

        const vendasGerenciais = vendasPeriodo.map((venda) => {
            const total = this.numero(venda.total);
            const custoItens = this.numero(venda.custoItensTotal);
            const custoInternoEstimado = this.numero(venda.custoInternoTotal);
            const lucroEstimado = this.numero(venda.lucroEstimado);
            const recebido = (venda.contasReceber || []).reduce(
                (soma, conta) => soma + this.numero(conta.valorRecebido),
                0
            );
            const custosInternosPagos = (venda.contasPagar || [])
                .filter(conta => conta.status !== "CANCELADO")
                .reduce((soma, conta) => soma + this.numero(conta.valorPago), 0);
            const percentualRecebido = total > 0
                ? Math.min(Math.max(recebido / total, 0), 1)
                : 0;
            const custoItensReconhecido = custoItens * percentualRecebido;
            const lucroRealizado = recebido - custoItensReconhecido - custosInternosPagos;

            return {
                id: venda.id,
                numero: venda.numero,
                status: venda.status,
                dataVenda: venda.dataVenda,
                cliente: venda.cliente,
                total,
                custoItens,
                custoInternoEstimado,
                lucroEstimado,
                margemEstimada: total > 0 ? (lucroEstimado / total) * 100 : 0,
                recebido,
                custosInternosPagos,
                custoItensReconhecido,
                lucroRealizado,
                margemRealizada: recebido > 0 ? (lucroRealizado / recebido) * 100 : 0
            };
        });

        const gerencialTotais = vendasGerenciais.reduce((acc, venda) => {
            acc.custoItens += venda.custoItens;
            acc.custoInternoEstimado += venda.custoInternoEstimado;
            acc.lucroEstimado += venda.lucroEstimado;
            acc.recebido += venda.recebido;
            acc.custosInternosPagos += venda.custosInternosPagos;
            acc.custoItensReconhecido += venda.custoItensReconhecido;
            acc.lucroRealizado += venda.lucroRealizado;
            return acc;
        }, {
            custoItens: 0,
            custoInternoEstimado: 0,
            lucroEstimado: 0,
            recebido: 0,
            custosInternosPagos: 0,
            custoItensReconhecido: 0,
            lucroRealizado: 0
        });

        const rankingItens = new Map();
        itensVendaPeriodo.forEach((item) => {
            const chave = String(item.descricao || "Item").trim() || "Item";
            if (!rankingItens.has(chave)) {
                rankingItens.set(chave, { nome: chave, tipo: item.tipo, quantidade: 0, valor: 0 });
            }
            const registro = rankingItens.get(chave);
            registro.quantidade += this.numero(item.quantidade);
            registro.valor += this.numero(item.total);
        });

        const rankingClientes = new Map();
        vendasGerenciais.forEach((venda) => {
            const id = venda.cliente?.id || 0;
            const chave = `${id}:${venda.cliente?.nome || "Cliente"}`;
            if (!rankingClientes.has(chave)) {
                rankingClientes.set(chave, {
                    id,
                    nome: venda.cliente?.nome || "Cliente",
                    quantidadeVendas: 0,
                    valor: 0,
                    lucroEstimado: 0
                });
            }
            const registro = rankingClientes.get(chave);
            registro.quantidadeVendas += 1;
            registro.valor += venda.total;
            registro.lucroEstimado += venda.lucroEstimado;
        });

        const eventosProjecao = new Map();
        receberProjecao.forEach(titulo => {
            const chave = this.chaveFluxo(titulo.dataVencimento, false);
            if (!eventosProjecao.has(chave)) eventosProjecao.set(chave, { entradas: 0, saidas: 0 });
            eventosProjecao.get(chave).entradas += this.valorPendente(titulo, "valorRecebido");
        });
        pagarProjecao.forEach(titulo => {
            const chave = this.chaveFluxo(titulo.dataVencimento, false);
            if (!eventosProjecao.has(chave)) eventosProjecao.set(chave, { entradas: 0, saidas: 0 });
            eventosProjecao.get(chave).saidas += this.valorPendente(titulo, "valorPago");
        });

        let saldoProjetado = saldoConsolidado;
        const projecao30Dias = [];
        const cursor = new Date(hoje);
        while (cursor <= horizonte) {
            const chave = this.chaveFluxo(cursor, false);
            const evento = eventosProjecao.get(chave) || { entradas: 0, saidas: 0 };
            saldoProjetado += evento.entradas - evento.saidas;
            projecao30Dias.push({ data: chave, ...evento, saldoProjetado });
            cursor.setDate(cursor.getDate() + 1);
        }

        const formatarReceber = titulo => ({
            id: titulo.id,
            descricao: titulo.descricao,
            cliente: titulo.cliente,
            dataVencimento: titulo.dataVencimento,
            status: titulo.status,
            valorPendente: this.valorPendente(titulo, "valorRecebido")
        });
        const formatarPagar = titulo => ({
            id: titulo.id,
            descricao: titulo.descricao,
            fornecedorNome: titulo.fornecedorNome,
            dataVencimento: titulo.dataVencimento,
            status: titulo.status,
            valorPendente: this.valorPendente(titulo, "valorPago")
        });

        return {
            periodo: { tipo: periodo, dataInicio, dataFim, agrupamento: agruparPorMes ? "MES" : "DIA" },
            kpis: {
                saldoConsolidado,
                entradasPeriodo,
                saidasPeriodo,
                resultadoPeriodo: entradasPeriodo - saidasPeriodo,
                contasReceberEmAberto: totalReceberAberto,
                contasPagarEmAberto: totalPagarAberto,
                contasReceberAtrasadas: receberAtrasado.reduce(
                    (total, titulo) => total + this.valorPendente(titulo, "valorRecebido"), 0
                ),
                contasPagarAtrasadas: pagarAtrasado.reduce(
                    (total, titulo) => total + this.valorPendente(titulo, "valorPago"), 0
                ),
                vendasPeriodo: totalVendas,
                quantidadeVendas: vendasPeriodo.length,
                ticketMedio: vendasPeriodo.length ? totalVendas / vendasPeriodo.length : 0
            },
            contas: contasComSaldo,
            fluxoCaixa: Array.from(fluxo.values()).map(item => ({
                ...item,
                resultado: item.entradas - item.saidas
            })),
            categorias: Array.from(categorias.values()).sort((a, b) => b.valor - a.valor),
            titulos: {
                receber: {
                    quantidade: receberAbertas.length,
                    valor: totalReceberAberto,
                    atrasados: receberAtrasado.length
                },
                pagar: {
                    quantidade: pagarAbertas.length,
                    valor: totalPagarAberto,
                    atrasados: pagarAtrasado.length
                }
            },
            comercial: {
                orcamentos: orcamentosPeriodo.length,
                orcamentosAprovados: aprovados.length,
                orcamentosEmAberto: orcamentosEmAberto.length,
                valorOrcamentosEmAberto: orcamentosEmAberto.reduce(
                    (total, orcamento) => total + this.numero(orcamento.total), 0
                ),
                valorOrcamentos: orcamentosPeriodo.reduce(
                    (total, orcamento) => total + this.numero(orcamento.total), 0
                ),
                taxaConversao: orcamentosPeriodo.length
                    ? (aprovados.length / orcamentosPeriodo.length) * 100
                    : 0
            },
            gerencial: {
                faturamento: totalVendas,
                custoItens: gerencialTotais.custoItens,
                custosInternosEstimados: gerencialTotais.custoInternoEstimado,
                custoTotalEstimado: gerencialTotais.custoItens + gerencialTotais.custoInternoEstimado,
                lucroEstimado: gerencialTotais.lucroEstimado,
                margemEstimada: totalVendas > 0
                    ? (gerencialTotais.lucroEstimado / totalVendas) * 100
                    : 0,
                valorRecebido: gerencialTotais.recebido,
                custosInternosPagos: gerencialTotais.custosInternosPagos,
                custoItensReconhecido: gerencialTotais.custoItensReconhecido,
                lucroRealizado: gerencialTotais.lucroRealizado,
                margemRealizada: gerencialTotais.recebido > 0
                    ? (gerencialTotais.lucroRealizado / gerencialTotais.recebido) * 100
                    : 0,
                produtosMaisVendidos: Array.from(rankingItens.values())
                    .sort((a, b) => b.valor - a.valor)
                    .slice(0, 8),
                clientesMaisCompram: Array.from(rankingClientes.values())
                    .sort((a, b) => b.valor - a.valor)
                    .slice(0, 8),
                rentabilidadeVendas: vendasGerenciais.slice(0, 10)
            },
            contasReceberProximas: receberProximas.map(formatarReceber),
            contasPagarProximas: pagarProximas.map(formatarPagar),
            ultimasMovimentacoes: ultimasMovimentacoes.map(movimento => ({
                id: movimento.id,
                descricao: movimento.descricao,
                tipo: movimento.tipo,
                origem: movimento.origem,
                valor: this.numero(movimento.valor),
                dataMovimentacao: movimento.dataMovimentacao,
                conta: movimento.contaFinanceira,
                categoria: movimento.categoriaFinanceira,
                conciliada: movimento.conciliada,
                estornada: movimento.estornada
            })),
            projecao30Dias
        };
    }

    async buscarResumo(empresaId) {

        const [

            clientes,

            produtos,

            categorias,

            orcamentos,

            variacoes,

            totalOrcamentos,

            ultimosOrcamentos,

            estoqueBaixoProdutos

        ] = await Promise.all([

            prisma.cliente.count({
                where: { empresaId }
            }),

            prisma.produto.count({
                where: { empresaId }
            }),

            prisma.categoriaProduto.count({
                where: { empresaId }
            }),

            prisma.orcamento.count({
                where: { empresaId }
            }),

            prisma.variacaoProduto.findMany({
                where: {
                    produto: {
                        empresaId
                    }
                },
                select: {
                    estoqueAtual: true,
                    estoqueMinimo: true
                }
            }),

            prisma.orcamento.aggregate({
                where: {
                    empresaId
                },
                _sum: {
                    total: true
                }
            }),

            prisma.orcamento.findMany({
                where: {
                    empresaId
                },
                include: {
                    cliente: true
                },
                orderBy: {
                    criadoEm: "desc"
                },
                take: 5
            }),

            prisma.variacaoProduto.findMany({
                where: {
                    produto: {
                        empresaId
                    }
                },
                include: {
                    produto: true
                },
                orderBy: {
                    estoqueAtual: "asc"
                },
                take: 5
            })

        ]);

        const estoqueBaixo = variacoes.filter(v =>
            Number(v.estoqueAtual) <= Number(v.estoqueMinimo)
        ).length;

        return {

            clientes,

            produtos,

            categorias,

            orcamentos,

            estoqueBaixo,

            valorTotal:
                Number(totalOrcamentos._sum.total || 0),

            ultimosOrcamentos,

            estoqueBaixoProdutos

        };

    }

}

module.exports = new DashboardRepository();
