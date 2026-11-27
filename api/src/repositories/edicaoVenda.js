const { Prisma, FormaPagamento, PeriodicidadeParcela } = require("@prisma/client");

const Decimal = Prisma.Decimal;
const camposItem = ["descricao", "quantidade", "valorUnitario", "desconto", "custoUnitario", "observacao"];
const categoriasCusto = ["MATERIAL", "COMBUSTIVEL", "FRETE", "MAO_DE_OBRA", "OUTRO"];
const dinheiro = (valor, campo) => decimal(valor, campo, 2);

function decimal(valor, campo, casas) {
    if (!/^\d+(?:\.\d+)?$/.test(String(valor ?? ""))) throw new Error(`Informe um valor válido para ${campo}.`);
    const n = new Decimal(valor);
    if (n.decimalPlaces() > casas || n.gte(10 ** (12 - casas))) throw new Error(`Valor inválido para ${campo}.`);
    return n;
}

function data(valor, campo) {
    const dia = String(valor || "");
    const resultado = new Date(`${dia}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dia) || !Number.isFinite(+resultado) || resultado.toISOString().slice(0, 10) !== dia) {
        throw new Error(`Informe uma data válida para ${campo}.`);
    }
    return resultado;
}

function texto(valor) {
    return String(valor ?? "").trim();
}

function iguais(a, b, campos) {
    return campos.every(campo => String(a[campo] ?? "") === String(b[campo] ?? ""));
}

async function normalizarItens(tx, venda, entradas) {
    if (!Array.isArray(entradas) || !entradas.length || entradas.length > 200) {
        throw new Error("Informe de 1 a 200 itens para a venda.");
    }
    const existentes = new Map(venda.itens.map(item => [item.id, item]));
    const idsUsados = new Set();
    const itens = [];
    for (const item of entradas) {
        const atual = existentes.get(item.id);
        if (item.id != null && (!atual || idsUsados.has(item.id))) throw new Error("Item inválido ou duplicado.");
        if (atual) idsUsados.add(atual.id);
        const tipo = atual?.tipo || item.tipo;
        const produto = tipo === "PRODUTO";
        if (!produto && tipo !== "SERVICO") throw new Error("Tipo de item inválido.");
        const modelo = produto ? tx.variacaoProduto : tx.variacaoServico;
        const pai = produto ? "produto" : "servico";
        const variacaoId = Number(item.variacaoId);
        const idAtual = produto ? atual?.variacaoProdutoId : atual?.variacaoServicoId;
        const mesmaVariacao = atual && idAtual === variacaoId;
        if (!Number.isSafeInteger(variacaoId) || variacaoId < 1) throw new Error("Selecione a variação do item no catálogo.");
        const variacao = mesmaVariacao
            ? atual[produto ? "variacaoProduto" : "variacaoServico"]
            : await modelo.findFirst({ where: { id: variacaoId, ativo: true, [pai]: { empresaId: venda.empresaId, ativo: true } }, include: { [pai]: true } });
        if (!variacao) throw new Error("Item do catálogo indisponível para a empresa.");
        const quantidade = decimal(item.quantidade, "quantidade", 3);
        const valorUnitario = dinheiro(item.valorUnitario, "preço");
        const desconto = dinheiro(item.desconto, "desconto do item");
        const custoUnitario = dinheiro(item.custoUnitario, "custo do item");
        const bruto = quantidade.times(valorUnitario).toDecimalPlaces(2);
        const descricao = texto(item.descricao);
        if (quantidade.lte(0) || desconto.gt(bruto) || !descricao) throw new Error("Confira descrição, quantidade e desconto dos itens.");
        const codigo = produto ? variacao.sku : variacao.codigo;
        itens.push({
            atual,
            produto: variacao.produto,
            dados: {
                tipo, variacaoProdutoId: produto ? variacaoId : null, variacaoServicoId: produto ? null : variacaoId,
                codigoProduto: mesmaVariacao ? atual.codigoProduto : (variacao[pai].codigo || codigo),
                sku: mesmaVariacao ? atual.sku : codigo, descricao, quantidade, valorUnitario, desconto,
                total: bruto.minus(desconto), custoUnitario, observacao: texto(item.observacao) || null
            }
        });
    }
    return itens;
}

function normalizarCustos(entradas) {
    if (!Array.isArray(entradas) || entradas.length > 100) throw new Error("Informe até 100 custos internos.");
    return entradas.map(custo => {
        const quantidade = decimal(custo.quantidade, "quantidade do custo", 3);
        const valorUnitario = dinheiro(custo.valorUnitario, "valor do custo");
        const total = quantidade.times(valorUnitario).toDecimalPlaces(2);
        const descricao = texto(custo.descricao);
        if (quantidade.lte(0) || !categoriasCusto.includes(custo.categoria)) throw new Error("Confira os dados dos custos internos.");
        return { categoria: custo.categoria, descricao, quantidade: +quantidade, valorUnitario: +valorUnitario, total: +total };
    });
}

async function atualizarEstoque(tx, venda, itens, usuarioId) {
    const saldoPorVariacao = new Map();
    for (const mov of venda.movimentacoesEstoque) {
        const quantidade = new Decimal(mov.quantidade);
        const saida = ["SAIDA", "AJUSTE_SAIDA"].includes(mov.tipo);
        const existente = saldoPorVariacao.get(mov.variacaoProdutoId) || new Decimal(0);
        saldoPorVariacao.set(mov.variacaoProdutoId, existente.plus(saida ? quantidade : quantidade.negated()));
    }
    const desejado = new Map();
    for (const { produto, dados } of itens) {
        if (!produto || (!produto.controlaEstoque && !saldoPorVariacao.has(dados.variacaoProdutoId))) continue;
        const id = dados.variacaoProdutoId;
        desejado.set(id, (desejado.get(id) || new Decimal(0)).plus(dados.quantidade));
    }
    for (const id of new Set([...saldoPorVariacao.keys(), ...desejado.keys()])) {
        const delta = (saldoPorVariacao.get(id) || new Decimal(0)).minus(desejado.get(id) || 0);
        if (delta.isZero()) continue;
        const variacao = await tx.variacaoProduto.update({ where: { id }, data: { estoqueAtual: { increment: delta } } });
        const produto = await tx.produto.update({ where: { id: variacao.produtoId }, data: { estoqueAtual: { increment: delta } } });
        const movimento = {
            empresaId: venda.empresaId, responsavelId: usuarioId,
            tipo: delta.gt(0) ? "AJUSTE_ENTRADA" : "AJUSTE_SAIDA", origem: "VENDA", quantidade: delta.abs(),
            observacoes: `Ajuste de estoque pela edição da venda nº ${venda.numero}.`
        };
        await tx.movimentacaoEstoque.create({ data: {
            ...movimento, vendaId: venda.id, variacaoProdutoId: id,
            saldoAnterior: variacao.estoqueAtual.minus(delta), saldoPosterior: variacao.estoqueAtual
        } });
        await tx.movimentacaoEstoqueProduto.create({ data: {
            ...movimento, produtoId: produto.id,
            saldoAnterior: produto.estoqueAtual.minus(delta), saldoPosterior: produto.estoqueAtual
        } });
    }
}

async function ajustarRecebiveis(tx, venda, dados, decisao, helpers) {
    const { dividirValor, calcularVencimento } = helpers;
    const prefixo = `VENDA-${venda.numero}-REEMBOLSO`;
    const recebido = venda.contasReceber.reduce((soma, conta) => soma.plus(conta.valorRecebido), new Decimal(0));
    const reembolsos = venda.contasPagar.filter(conta => conta.numeroDocumento === prefixo && conta.status !== "CANCELADO");
    const reembolsado = reembolsos.reduce((soma, conta) => soma.plus(conta.valorOriginal), new Decimal(0));
    const saldo = dados.total.minus(recebido.minus(reembolsado));
    let ajuste = saldo.abs();
    if (recebido.gt(0) && !saldo.isZero()) {
        const opcoes = saldo.gt(0) ? ["INTEGRAL", "PARCIAL", "SEM_AJUSTE"] : ["REEMBOLSAR", "PARCIAL", "SEM_AJUSTE"];
        if (!opcoes.includes(decisao?.tipo) || String(decisao.saldo) !== saldo.toString()) {
            return { decisaoFinanceira: { recebido: +recebido, saldo: +saldo } };
        }
        if (decisao.tipo === "SEM_AJUSTE") ajuste = new Decimal(0);
        if (decisao.tipo === "PARCIAL") {
            ajuste = dinheiro(decisao.valor, "valor do ajuste");
            if (ajuste.lte(0) || ajuste.gte(saldo.abs())) throw new Error("Informe um ajuste parcial menor que a diferença.");
        }
    }

    for (const conta of venda.contasReceber) {
        if (conta.status === "CANCELADO" || conta.status === "PAGO") continue;
        if (conta.valorRecebido.gt(0)) {
            await tx.contaReceber.update({ where: { id: conta.id }, data: {
                status: "PAGO",
                valorDesconto: conta.valorOriginal.plus(conta.valorJuros).plus(conta.valorMulta).minus(conta.valorRecebido),
                observacoes: [conta.observacoes, "Saldo pendente substituído na edição da venda. Valor recebido preservado."].filter(Boolean).join("\n")
            } });
        } else {
            await tx.contaReceber.update({ where: { id: conta.id }, data: { status: "CANCELADO" } });
        }
    }
    if (ajuste.isZero()) return {};
    const comum = { empresaId: venda.empresaId, vendaId: venda.id, dataCompetencia: dados.dataVenda, status: "PENDENTE" };
    if (saldo.lt(0)) {
        const pagador = venda.contasReceber.find(conta => conta.valorRecebido.gt(0));
        const cliente = await tx.cliente.findUnique({ where: { id: pagador.clienteId } });
        await tx.contaPagar.create({ data: {
            ...comum, numeroDocumento: prefixo, fornecedorNome: cliente.nome, fornecedorDocumento: cliente.cpfCnpj,
            descricao: `Reembolso ao cliente da venda nº ${venda.numero}`,
            valorOriginal: ajuste, dataVencimento: dados.primeiroVencimento
        } });
        return {};
    }
    const parcelas = dados.quantidadeParcelas;
    if (ajuste.times(100).lt(parcelas)) throw new Error("O saldo a receber é menor que a quantidade de parcelas.");
    const valores = dividirValor(ajuste, parcelas);
    const ultima = Math.max(0, ...venda.contasReceber.map(conta => conta.parcelaNumero));
    const referencia = venda.contasReceber[0];
    await tx.contaReceber.createMany({ data: valores.map((valorOriginal, i) => ({
        ...comum, clienteId: dados.clienteId, numeroDocumento: `VENDA-${venda.numero}`,
        categoriaFinanceiraId: referencia?.categoriaFinanceiraId, centroCustoId: referencia?.centroCustoId,
        descricao: `Venda nº ${venda.numero} - Parcela ${i + 1}/${parcelas}`,
        parcelaNumero: ultima + i + 1, totalParcelas: parcelas, valorOriginal,
        dataVencimento: calcularVencimento(dados.primeiroVencimento, i, dados.periodicidadeParcelas, 30),
        formaPagamento: dados.formaPagamento
    })) });
    return {};
}

async function editarVenda(tx, venda, entrada, usuarioId, helpers) {
    if (venda.status !== "FATURADA") throw new Error("Esta edição é para vendas faturadas.");
    if (entrada.atualizadoEm !== venda.atualizadoEm.toISOString()) throw new Error("A venda mudou. Reabra a edição antes de salvar.");
    const clienteId = Number(entrada.clienteId);
    const cliente = Number.isSafeInteger(clienteId) && await tx.cliente.findFirst({
        where: { id: clienteId, empresaId: venda.empresaId }
    });
    if (!cliente) throw new Error("Selecione um cliente da empresa.");

    const itens = await normalizarItens(tx, venda, entrada.itens);
    const custos = normalizarCustos(entrada.custosInternos);
    const antigos = Array.isArray(venda.custosInternos) ? venda.custosInternos : [];
    const custosMudaram = custos.length !== antigos.length || custos.some((custo, i) =>
        !iguais(custo, antigos[i], ["categoria", "descricao", "quantidade", "valorUnitario"]));
    const itensMudaram = itens.length !== venda.itens.length || itens.some(({ atual, dados }) =>
        !atual || !iguais(atual, dados, [...camposItem, "variacaoProdutoId", "variacaoServicoId"]));
    const subtotal = itens.reduce((soma, item) => soma.plus(item.dados.total), new Decimal(0));
    const desconto = dinheiro(entrada.desconto, "desconto da venda");
    const frete = dinheiro(entrada.frete, "frete");
    const outrasDespesas = dinheiro(entrada.outrasDespesas, "outras despesas");
    const total = subtotal.minus(desconto).plus(frete).plus(outrasDespesas);
    if (total.lte(0) || desconto.gt(subtotal)) throw new Error("Confira o desconto e o total da venda.");

    const quantidadeParcelas = Number(entrada.quantidadeParcelas);
    const { formaPagamento, periodicidadeParcelas } = entrada;
    if (!Object.hasOwn(FormaPagamento, formaPagamento) || !Object.hasOwn(PeriodicidadeParcela, periodicidadeParcelas)
        || !Number.isInteger(quantidadeParcelas) || quantidadeParcelas < 1 || quantidadeParcelas > 120) {
        throw new Error("Confira as condições de pagamento.");
    }
    const primeiroVencimento = data(entrada.primeiroVencimento, "primeiro vencimento");
    const dataVenda = entrada.dataVenda === venda.dataVenda.toISOString().slice(0, 10)
        ? venda.dataVenda : data(entrada.dataVenda, "data da venda");
    const custoItensTotal = itens.reduce((soma, item) => soma.plus(item.dados.quantidade.times(item.dados.custoUnitario)), new Decimal(0)).toDecimalPlaces(2);
    const custoInternoTotal = custos.reduce((soma, custo) => soma.plus(custo.total), new Decimal(0));
    const dados = {
        clienteId, subtotal, desconto, frete, outrasDespesas, total, formaPagamento, quantidadeParcelas,
        periodicidadeParcelas, primeiroVencimento, dataVenda, observacoes: texto(entrada.observacoes) || null,
        custosInternos: custos, custoItensTotal, custoInternoTotal, lucroEstimado: total.minus(custoItensTotal).minus(custoInternoTotal)
    };

    const camposFinanceiros = ["clienteId", "total", "formaPagamento", "quantidadeParcelas", "periodicidadeParcelas"];
    const financeiroMudou = !iguais(venda, dados, camposFinanceiros)
        || venda.primeiroVencimento.toISOString().slice(0, 10) !== entrada.primeiroVencimento;
    if (+primeiroVencimento !== +venda.primeiroVencimento && venda.primeiroVencimento.toISOString().slice(0, 10) === entrada.primeiroVencimento) {
        dados.primeiroVencimento = venda.primeiroVencimento;
    }
    for (const campo of ["subtotal", "total", "custoItensTotal", "custoInternoTotal", "lucroEstimado"]) {
        if (dados[campo].abs().gte(10 ** 10)) throw new Error("Os valores ultrapassam o limite permitido para a venda.");
    }
    const itensFiscaisMudaram = itens.length !== venda.itens.length || itens.some(({ atual, dados: item }) =>
        !atual || !iguais(atual, item, ["descricao", "quantidade", "valorUnitario", "desconto", "variacaoProdutoId", "variacaoServicoId"]));
    const fiscalMudou = itensFiscaisMudaram || financeiroMudou || +dataVenda !== +venda.dataVenda
        || !iguais(venda, dados, ["desconto", "frete", "outrasDespesas"]);
    if (fiscalMudou && [venda.notaFiscal, venda.notaFiscalServico].some(nota => nota && nota.status !== "CANCELADA")) {
        throw new Error("A venda tem um registro fiscal ativo. Regularize a nota na aba Fiscal antes de alterar os dados da emissão.");
    }
    const titulosCusto = venda.contasPagar.filter(conta => conta.custoInternoIndice != null && conta.status !== "CANCELADO");
    if (custosMudaram && titulosCusto.some(conta => conta.valorPago.gt(0))) {
        throw new Error("Há custos internos já pagos. Regularize esses pagamentos em Contas a Pagar antes de editar os custos.");
    }

    if (financeiroMudou) {
        const resultado = await ajustarRecebiveis(tx, venda, dados, entrada.decisaoFinanceira, helpers);
        if (resultado.decisaoFinanceira) return resultado;
    }
    if (itensMudaram) {
        const mantidos = itens.filter(item => item.atual).map(item => item.atual.id);
        await tx.itemVenda.deleteMany({ where: { vendaId: venda.id, id: { notIn: mantidos } } });
        for (const { atual, dados: item } of itens) {
            if (!atual) await tx.itemVenda.create({ data: { ...item, vendaId: venda.id } });
            else await tx.itemVenda.update({ where: { id: atual.id }, data: item });
        }
        const mudancaEstoque = itens.length !== venda.itens.length || itens.some(({ atual, dados: item }) =>
            !atual || !iguais(atual, item, ["quantidade", "variacaoProdutoId"]));
        if (mudancaEstoque) await atualizarEstoque(tx, venda, itens, usuarioId);
    }
    if (custosMudaram) {
        await tx.contaPagar.updateMany({
            where: { vendaId: venda.id, custoInternoIndice: { not: null } },
            data: { status: "CANCELADO", custoInternoIndice: null }
        });
        await helpers.gerarContasPagarCustosInternos(tx, { ...venda, ...dados }, venda.empresaId);
    }

    await tx.venda.update({ where: { id: venda.id }, data: dados });
    return {};
}

module.exports = editarVenda;
