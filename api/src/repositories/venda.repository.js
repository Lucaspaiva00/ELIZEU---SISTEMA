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
    return Array.from(
        { length: quantidade },
        (_, i) => new Prisma.Decimal(base + (i < resto ? 1 : 0)).dividedBy(100)
    );
}

function numero(valor) {
    const n = Number(valor || 0);
    return Number.isFinite(n) ? n : 0;
}

function arredondar(valor) {
    return Math.round((numero(valor) + Number.EPSILON) * 100) / 100;
}

function calcularRentabilidadeRealizada(venda) {
    const totalVenda = numero(venda?.total);
    const recebido = (venda?.contasReceber || []).reduce(
        (total, conta) => total + numero(conta.valorRecebido),
        0
    );

    const custosInternosPagos = (venda?.contasPagar || [])
        .filter((conta) => conta.status !== "CANCELADO")
        .reduce((total, conta) => total + numero(conta.valorPago), 0);

    const percentualRecebido = totalVenda > 0
        ? Math.min(Math.max(recebido / totalVenda, 0), 1)
        : 0;

    // O custo dos itens é reconhecido proporcionalmente ao valor recebido.
    // Isso evita mostrar prejuízo "realizado" enquanto a venda ainda não recebeu nada.
    const custoItensReconhecido = numero(venda?.custoItensTotal) * percentualRecebido;
    const lucroRealizado = recebido - custoItensReconhecido - custosInternosPagos;
    const margemRealizada = recebido > 0 ? (lucroRealizado / recebido) * 100 : 0;

    return {
        valorRecebido: arredondar(recebido),
        percentualRecebido: arredondar(percentualRecebido * 100),
        custoItensReconhecido: arredondar(custoItensReconhecido),
        custosInternosPagos: arredondar(custosInternosPagos),
        lucroRealizado: arredondar(lucroRealizado),
        margemRealizada: arredondar(margemRealizada)
    };
}

function enriquecerVenda(venda) {
    if (!venda) return venda;
    return {
        ...venda,
        rentabilidadeRealizada: calcularRentabilidadeRealizada(venda)
    };
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
        contasPagar: {
            orderBy: [{ custoInternoIndice: "asc" }, { id: "asc" }]
        },
        movimentacoesEstoque: true,
        notaFiscal: true
    };
}

function nomeCategoriaCustoInterno(categoria) {
    switch (String(categoria || "OUTRO").toUpperCase()) {
        case "MATERIAL": return "Compras e Fornecedores";
        case "MAO_DE_OBRA": return "Folha e Prestadores";
        case "COMBUSTIVEL":
        case "FRETE":
        case "OUTRO":
        default: return "Despesas Operacionais";
    }
}

function rotuloCategoriaCustoInterno(categoria) {
    switch (String(categoria || "OUTRO").toUpperCase()) {
        case "MATERIAL": return "Material";
        case "COMBUSTIVEL": return "Combustível";
        case "FRETE": return "Frete / deslocamento";
        case "MAO_DE_OBRA": return "Mão de obra";
        default: return "Outro custo";
    }
}

async function resolverCategoriaCustoInterno(tx, empresaId, categoria) {
    const nome = nomeCategoriaCustoInterno(categoria);

    const categoriaExata = await tx.categoriaFinanceira.findFirst({
        where: {
            empresaId,
            nome,
            ativa: true,
            natureza: { in: ["DESPESA", "AMBAS"] }
        },
        select: { id: true }
    });

    if (categoriaExata) return categoriaExata.id;

    const fallback = await tx.categoriaFinanceira.findFirst({
        where: {
            empresaId,
            ativa: true,
            natureza: { in: ["DESPESA", "AMBAS"] }
        },
        orderBy: { id: "asc" },
        select: { id: true }
    });

    return fallback?.id || null;
}

async function resolverCentroCustoPadrao(tx, empresaId) {
    const centro = await tx.centroCusto.findFirst({
        where: {
            empresaId,
            codigo: "GERAL",
            ativo: true
        },
        select: { id: true }
    });

    return centro?.id || null;
}

async function gerarContasPagarCustosInternos(tx, venda, empresaId) {
    const custos = Array.isArray(venda.custosInternos) ? venda.custosInternos : [];
    if (!custos.length) return;

    const centroCustoId = await resolverCentroCustoPadrao(tx, empresaId);
    const agora = new Date();

    for (let indice = 0; indice < custos.length; indice += 1) {
        const custo = custos[indice] || {};
        const quantidade = numero(custo.quantidade || 1);
        const valorUnitario = numero(custo.valorUnitario);
        const valorTotal = arredondar(
            numero(custo.total) || (quantidade * valorUnitario)
        );

        if (valorTotal <= 0) continue;

        const existente = await tx.contaPagar.findFirst({
            where: {
                vendaId: venda.id,
                custoInternoIndice: indice
            },
            select: { id: true }
        });

        if (existente) continue;

        const categoriaFinanceiraId = await resolverCategoriaCustoInterno(
            tx,
            empresaId,
            custo.categoria
        );

        const rotulo = rotuloCategoriaCustoInterno(custo.categoria);
        const detalhe = String(custo.descricao || "").trim();
        const descricao = detalhe
            ? `Venda nº ${venda.numero} - ${rotulo}: ${detalhe}`
            : `Venda nº ${venda.numero} - ${rotulo}`;

        await tx.contaPagar.create({
            data: {
                empresaId,
                vendaId: venda.id,
                custoInternoIndice: indice,
                categoriaFinanceiraId,
                centroCustoId,
                fornecedorNome: `Custo interno - Venda nº ${venda.numero}`,
                fornecedorDocumento: null,
                descricao,
                numeroDocumento: `VENDA-${venda.numero}-CUSTO-${indice + 1}`,
                parcelaNumero: 1,
                totalParcelas: 1,
                valorOriginal: new Prisma.Decimal(valorTotal),
                dataCompetencia: agora,
                dataEmissao: agora,
                dataVencimento: agora,
                formaPagamento: null,
                status: "PENDENTE",
                recorrente: false,
                observacoes: "Gerado automaticamente a partir dos custos internos da venda no faturamento."
            }
        });
    }
}

class VendaRepository {
    async listar(empresaId) {
        const vendas = await prisma.venda.findMany({
            where: { empresaId },
            include: includeVenda(),
            orderBy: { numero: "desc" }
        });

        return vendas.map(enriquecerVenda);
    }

    async buscarPorId(id, empresaId) {
        const venda = await prisma.venda.findFirst({
            where: { id, empresaId },
            include: includeVenda()
        });

        return enriquecerVenda(venda);
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
                    where: {
                        vendaId: venda.id,
                        itemVendaId: item.id,
                        origem: "VENDA"
                    }
                });

                if (movimentoExistente) continue;

                const variacaoAtual = await tx.variacaoProduto.findUnique({
                    where: { id: item.variacaoProdutoId }
                });

                if (!variacaoAtual) {
                    throw new Error(`Variação do item ${item.descricao} não encontrada.`);
                }

                const saldoAnterior = new Prisma.Decimal(variacaoAtual.estoqueAtual || 0);
                const quantidade = new Prisma.Decimal(item.quantidade || 0);
                const saldoPosterior = saldoAnterior.minus(quantidade);

                await tx.variacaoProduto.update({
                    where: { id: item.variacaoProdutoId },
                    data: {
                        estoqueAtual: {
                            decrement: quantidade
                        }
                    }
                });

                const semSaldoSuficiente = saldoAnterior.lessThan(quantidade);

                await tx.movimentacaoEstoque.create({
                    data: {
                        empresaId: dados.empresaId,
                        variacaoProdutoId: item.variacaoProdutoId,
                        vendaId: venda.id,
                        itemVendaId: item.id,
                        responsavelId: dados.usuarioId,
                        tipo: "SAIDA",
                        origem: "VENDA",
                        quantidade,
                        saldoAnterior,
                        saldoPosterior,
                        observacoes: semSaldoSuficiente
                            ? `Baixa de estoque no faturamento da venda nº ${venda.numero}. Saldo ficou negativo por insuficiência de estoque no momento do faturamento.`
                            : `Baixa de estoque no faturamento da venda nº ${venda.numero}.`
                    }
                });
            }

            const contasExistentes = await tx.contaReceber.count({
                where: { vendaId: venda.id }
            });

            if (!contasExistentes) {
                const categoria = await tx.categoriaFinanceira.findFirst({
                    where: {
                        empresaId: dados.empresaId,
                        nome: "Vendas de Produtos e Serviços",
                        ativa: true
                    }
                });

                const centro = await tx.centroCusto.findFirst({
                    where: {
                        empresaId: dados.empresaId,
                        codigo: "GERAL",
                        ativo: true
                    }
                });

                const parcelas = dividirValor(venda.total, venda.quantidadeParcelas);

                for (let i = 0; i < venda.quantidadeParcelas; i += 1) {
                    const numeroParcela = i + 1;

                    await tx.contaReceber.create({
                        data: {
                            empresaId: dados.empresaId,
                            vendaId: venda.id,
                            clienteId: venda.clienteId,
                            categoriaFinanceiraId: categoria?.id || null,
                            centroCustoId: centro?.id || null,
                            descricao: `Venda nº ${venda.numero} - Parcela ${numeroParcela}/${venda.quantidadeParcelas}`,
                            numeroDocumento: `VENDA-${venda.numero}`,
                            parcelaNumero: numeroParcela,
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

            // Cada custo interno do orçamento vira um título em Contas a Pagar.
            // O vínculo com a venda permite medir custo realizado sem expor isso ao cliente.
            await gerarContasPagarCustosInternos(tx, venda, dados.empresaId);

            await tx.venda.update({
                where: { id: venda.id },
                data: { status: "FATURADA" }
            });

            const vendaFinal = await tx.venda.findUnique({
                where: { id: venda.id },
                include: includeVenda()
            });

            return enriquecerVenda(vendaFinal);
        }, {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            maxWait: 5000,
            timeout: 15000
        });
    }

    async cancelar(id, empresaId, motivo) {
        const venda = await this.buscarPorId(id, empresaId);

        if (!venda) throw new Error("Venda não encontrada.");
        if (venda.status === "FATURADA") {
            throw new Error("Venda faturada deve ser estornada pelo financeiro antes do cancelamento.");
        }
        if (venda.status === "CANCELADA") {
            throw new Error("Venda já está cancelada.");
        }

        const atualizada = await prisma.venda.update({
            where: { id },
            data: {
                status: "CANCELADA",
                canceladaEm: new Date(),
                motivoCancelamento: motivo || null
            },
            include: includeVenda()
        });

        return enriquecerVenda(atualizada);
    }
}

module.exports = new VendaRepository();
