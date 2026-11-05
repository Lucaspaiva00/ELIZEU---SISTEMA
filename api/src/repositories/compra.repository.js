const prisma = require("../config/prisma");

function numero(valor) {
    return Number(valor || 0);
}

function arredondar2(valor) {
    return Math.round((numero(valor) + Number.EPSILON) * 100) / 100;
}

function dataAoMeioDia(valor) {
    if (!valor) return null;
    const data = typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor)
        ? new Date(`${valor}T12:00:00`)
        : new Date(valor);
    return Number.isNaN(data.getTime()) ? null : data;
}

function adicionarMeses(data, meses) {
    const resultado = new Date(data);
    resultado.setMonth(resultado.getMonth() + meses);
    return resultado;
}

class CompraRepository {
    async proximoNumero(tx, empresaId) {
        const ultima = await tx.compra.findFirst({
            where: { empresaId },
            orderBy: { numero: "desc" },
            select: { numero: true }
        });
        return (ultima?.numero || 0) + 1;
    }

    async listar(empresaId, filtros = {}) {
        const where = { empresaId };
        if (filtros.fornecedorId) where.fornecedorId = Number(filtros.fornecedorId);
        if (filtros.status) where.status = filtros.status;
        if (filtros.inicio || filtros.fim) {
            where.dataCompra = {};
            if (filtros.inicio) where.dataCompra.gte = dataAoMeioDia(filtros.inicio);
            if (filtros.fim) {
                const fim = dataAoMeioDia(filtros.fim);
                if (fim) {
                    fim.setHours(23,59,59,999);
                    where.dataCompra.lte = fim;
                }
            }
        }

        return prisma.compra.findMany({
            where,
            include: {
                fornecedor: true,
                itens: { include: { produto: true } },
                contasPagar: {
                    select: {
                        id: true,
                        parcelaNumero: true,
                        totalParcelas: true,
                        valorOriginal: true,
                        valorPago: true,
                        dataVencimento: true,
                        status: true
                    },
                    orderBy: { parcelaNumero: "asc" }
                }
            },
            orderBy: [{ dataCompra: "desc" }, { numero: "desc" }]
        });
    }

    async buscarPorId(id, empresaId) {
        return prisma.compra.findFirst({
            where: { id, empresaId },
            include: {
                fornecedor: true,
                itens: {
                    include: {
                        produto: true,
                        movimentacoesEstoque: {
                            orderBy: { criadoEm: "desc" },
                            take: 3
                        }
                    }
                },
                contasPagar: {
                    orderBy: { parcelaNumero: "asc" }
                }
            }
        });
    }

    async apoio(empresaId) {
        const [fornecedores, produtos] = await Promise.all([
            prisma.fornecedor.findMany({
                where: { empresaId, ativo: true },
                orderBy: { nome: "asc" }
            }),
            prisma.produto.findMany({
                where: { empresaId, ativo: true, controlaEstoque: true },
                select: {
                    id: true,
                    codigo: true,
                    nome: true,
                    unidadeMedida: true,
                    estoqueAtual: true,
                    estoqueMinimo: true,
                    ultimoCusto: true,
                    custoMedio: true
                },
                orderBy: { nome: "asc" }
            })
        ]);
        return { fornecedores, produtos };
    }

    async criar(dados) {
        return prisma.$transaction(async (tx) => {
            const fornecedor = await tx.fornecedor.findFirst({
                where: { id: dados.fornecedorId, empresaId: dados.empresaId, ativo: true }
            });
            if (!fornecedor) throw new Error("Fornecedor não encontrado ou inativo.");

            const idsProdutos = [...new Set(dados.itens.map(item => item.produtoId))];
            const produtos = await tx.produto.findMany({
                where: {
                    empresaId: dados.empresaId,
                    id: { in: idsProdutos },
                    ativo: true,
                    controlaEstoque: true
                }
            });
            if (produtos.length !== idsProdutos.length) {
                throw new Error("Um ou mais produtos não existem ou não controlam estoque.");
            }

            const mapaProdutos = new Map(produtos.map(p => [p.id, p]));
            const numeroCompra = await this.proximoNumero(tx, dados.empresaId);
            const subtotal = arredondar2(dados.itens.reduce(
                (soma, item) => soma + (item.quantidade * item.custoUnitario), 0
            ));
            const total = arredondar2(
                subtotal - dados.desconto + dados.frete + dados.outrasDespesas
            );
            if (total <= 0) throw new Error("O total da compra deve ser maior que zero.");

            const compra = await tx.compra.create({
                data: {
                    empresaId: dados.empresaId,
                    fornecedorId: fornecedor.id,
                    numero: numeroCompra,
                    dataCompra: dados.dataCompra || new Date(),
                    numeroDocumento: dados.numeroDocumento || null,
                    formaPagamento: dados.formaPagamento || null,
                    quantidadeParcelas: dados.gerarFinanceiro ? dados.quantidadeParcelas : 1,
                    primeiroVencimento: dados.gerarFinanceiro ? dados.primeiroVencimento : null,
                    subtotal,
                    desconto: dados.desconto,
                    frete: dados.frete,
                    outrasDespesas: dados.outrasDespesas,
                    total,
                    observacoes: dados.observacoes || null
                }
            });

            const itensCriados = [];
            for (const item of dados.itens) {
                const produto = mapaProdutos.get(item.produtoId);
                const estoqueAnterior = numero(produto.estoqueAtual);
                const custoMedioAnterior = numero(produto.custoMedio || produto.ultimoCusto);
                const novoEstoque = estoqueAnterior + item.quantidade;
                const novoCustoMedio = novoEstoque > 0
                    ? arredondar2(((estoqueAnterior * custoMedioAnterior) + (item.quantidade * item.custoUnitario)) / novoEstoque)
                    : item.custoUnitario;

                const itemCompra = await tx.itemCompra.create({
                    data: {
                        compraId: compra.id,
                        produtoId: item.produtoId,
                        quantidade: item.quantidade,
                        custoUnitario: item.custoUnitario,
                        total: arredondar2(item.quantidade * item.custoUnitario)
                    }
                });

                const produtoAtualizado = await tx.produto.update({
                    where: { id: item.produtoId },
                    data: {
                        estoqueAtual: { increment: item.quantidade },
                        ultimoCusto: item.custoUnitario,
                        custoMedio: novoCustoMedio
                    }
                });

                await tx.movimentacaoEstoqueProduto.create({
                    data: {
                        empresaId: dados.empresaId,
                        produtoId: item.produtoId,
                        responsavelId: dados.usuarioId || null,
                        itemCompraId: itemCompra.id,
                        tipo: "ENTRADA",
                        origem: "COMPRA",
                        quantidade: item.quantidade,
                        saldoAnterior: estoqueAnterior,
                        saldoPosterior: numero(produtoAtualizado.estoqueAtual),
                        observacoes: `Compra #${numeroCompra} - ${fornecedor.nomeFantasia || fornecedor.nome}`
                    }
                });
                itensCriados.push(itemCompra);
            }

            const contasPagar = [];
            if (dados.gerarFinanceiro) {
                const vencimentoInicial = dados.primeiroVencimento;
                const parcelas = dados.quantidadeParcelas;
                const base = Math.floor((total / parcelas) * 100) / 100;
                let acumulado = 0;

                for (let i = 1; i <= parcelas; i += 1) {
                    const valor = i === parcelas ? arredondar2(total - acumulado) : base;
                    acumulado = arredondar2(acumulado + valor);
                    const vencimento = adicionarMeses(vencimentoInicial, i - 1);
                    const hoje = new Date();
                    hoje.setHours(0,0,0,0);

                    const conta = await tx.contaPagar.create({
                        data: {
                            empresaId: dados.empresaId,
                            compraId: compra.id,
                            fornecedorId: fornecedor.id,
                            fornecedorNome: fornecedor.nomeFantasia || fornecedor.nome,
                            fornecedorDocumento: fornecedor.cpfCnpj,
                            descricao: `Compra #${numeroCompra} - ${fornecedor.nomeFantasia || fornecedor.nome}`,
                            numeroDocumento: dados.numeroDocumento || null,
                            parcelaNumero: i,
                            totalParcelas: parcelas,
                            valorOriginal: valor,
                            dataCompetencia: dados.dataCompra || new Date(),
                            dataEmissao: dados.dataCompra || new Date(),
                            dataVencimento: vencimento,
                            formaPagamento: dados.formaPagamento || null,
                            status: vencimento < hoje ? "ATRASADO" : "PENDENTE",
                            observacoes: `Gerada automaticamente pela compra #${numeroCompra}.`
                        }
                    });
                    contasPagar.push(conta);
                }
            }

            return this.buscarPorId(compra.id, dados.empresaId);
        }, { timeout: 20000 });
    }

    async cancelar(id, empresaId, usuarioId, motivo) {
        return prisma.$transaction(async (tx) => {
            const compra = await tx.compra.findFirst({
                where: { id, empresaId },
                include: {
                    fornecedor: true,
                    itens: { include: { produto: true } },
                    contasPagar: true
                }
            });
            if (!compra) throw new Error("Compra não encontrada.");
            if (compra.status === "CANCELADA") throw new Error("Esta compra já está cancelada.");
            if (compra.contasPagar.some(c => numero(c.valorPago) > 0 || c.status === "PAGO")) {
                throw new Error("Não é possível cancelar uma compra que possui pagamento registrado.");
            }

            for (const item of compra.itens) {
                const saldoAtual = numero(item.produto.estoqueAtual);
                const quantidade = numero(item.quantidade);
                if (saldoAtual < quantidade) {
                    throw new Error(`Não é possível cancelar: o estoque de ${item.produto.nome} já foi consumido abaixo da quantidade comprada.`);
                }
            }

            for (const item of compra.itens) {
                const quantidade = numero(item.quantidade);
                const saldoAnterior = numero(item.produto.estoqueAtual);
                const atualizado = await tx.produto.update({
                    where: { id: item.produtoId },
                    data: { estoqueAtual: { decrement: quantidade } }
                });

                await tx.movimentacaoEstoqueProduto.create({
                    data: {
                        empresaId,
                        produtoId: item.produtoId,
                        responsavelId: usuarioId || null,
                        itemCompraId: item.id,
                        tipo: "AJUSTE_SAIDA",
                        origem: "CANCELAMENTO",
                        quantidade,
                        saldoAnterior,
                        saldoPosterior: numero(atualizado.estoqueAtual),
                        observacoes: `Cancelamento da compra #${compra.numero}. ${motivo || ""}`.trim()
                    }
                });
            }

            await tx.contaPagar.updateMany({
                where: { compraId: compra.id, status: { not: "PAGO" } },
                data: { status: "CANCELADO", observacoes: `Cancelada com a compra #${compra.numero}. ${motivo || ""}`.trim() }
            });

            await tx.compra.update({
                where: { id: compra.id },
                data: {
                    status: "CANCELADA",
                    observacoes: [compra.observacoes, `CANCELAMENTO: ${motivo || "Sem motivo informado."}`].filter(Boolean).join("\n")
                }
            });

            return this.buscarPorId(compra.id, empresaId);
        }, { timeout: 20000 });
    }

    async resumoFornecedor(fornecedorId, empresaId) {
        const fornecedor = await prisma.fornecedor.findFirst({
            where: { id: fornecedorId, empresaId }
        });
        if (!fornecedor) throw new Error("Fornecedor não encontrado.");

        const [compras, contas] = await Promise.all([
            prisma.compra.findMany({
                where: { empresaId, fornecedorId, status: "CONFIRMADA" },
                include: { itens: { include: { produto: true } } },
                orderBy: { dataCompra: "desc" }
            }),
            prisma.contaPagar.findMany({
                where: { empresaId, fornecedorId, status: { in: ["PENDENTE","PARCIAL","ATRASADO"] } }
            })
        ]);

        const totalComprado = compras.reduce((s,c)=>s+numero(c.total),0);
        const emAberto = contas.reduce((s,c)=>s+Math.max(0, numero(c.valorOriginal)-numero(c.valorPago)),0);
        const vencido = contas.filter(c=>c.status==="ATRASADO").reduce((s,c)=>s+Math.max(0, numero(c.valorOriginal)-numero(c.valorPago)),0);
        const produtos = new Map();
        compras.forEach(c=>c.itens.forEach(item=>{
            const atual=produtos.get(item.produtoId)||{id:item.produtoId,nome:item.produto.nome,quantidade:0,valor:0};
            atual.quantidade += numero(item.quantidade);
            atual.valor += numero(item.total);
            produtos.set(item.produtoId,atual);
        }));

        return {
            fornecedor,
            indicadores: {
                totalComprado,
                quantidadeCompras: compras.length,
                ultimaCompra: compras[0]?.dataCompra || null,
                emAberto,
                vencido
            },
            comprasRecentes: compras.slice(0,10),
            produtosMaisComprados: [...produtos.values()].sort((a,b)=>b.valor-a.valor).slice(0,8)
        };
    }
}

module.exports = new CompraRepository();
