const editarVendaDialog = document.getElementById("editarVendaDialog");
const formEdicaoVenda = document.getElementById("formEdicaoVenda");
const listaItensEdicao = document.getElementById("itensEdicaoVenda");
const listaCustosEdicao = document.getElementById("custosEdicaoVenda");
const decisaoEdicao = document.getElementById("decisaoEdicaoVenda");
let vendaEmEdicao;
let catalogoEdicaoVenda = new Map();

function campoEdicao(nome, rotulo, valor, tipo = "text", passo = "") {
    const numerico = tipo === "number" ? ` min="0" step="${passo}"` : "";
    const opcional = ["observacao", "observacoes", "descricaoCusto"].includes(nome);
    return `<label>${rotulo}<input class="form-control" name="${nome}" type="${tipo}" value="${esc(valor ?? "")}"${numerico}${opcional ? "" : " required"}></label>`;
}

function opcoesEdicao(registros, selecionado) {
    return registros.map(([valor, rotulo]) => `<option value="${esc(valor)}"${String(valor) === String(selecionado) ? " selected" : ""}>${esc(rotulo)}</option>`).join("");
}

function seletorEdicao(nome, rotulo, registros, selecionado) {
    return `<label>${rotulo}<select class="form-control" name="${nome}" required>${opcoesEdicao(registros, selecionado)}</select></label>`;
}

const categoriasEdicao = [["MATERIAL","Material"],["COMBUSTIVEL","Combustível"],["FRETE","Frete"],["MAO_DE_OBRA","Mão de obra"],["OUTRO","Outro"]];
const pagamentosEdicao = [["PIX","Pix"],["DINHEIRO","Dinheiro"],["BOLETO","Boleto"],["CARTAO_CREDITO","Cartão de crédito"],
    ["CARTAO_DEBITO","Cartão de débito"],["TRANSFERENCIA","Transferência"],["CHEQUE","Cheque"],["CREDITO_LOJA","Crédito em loja"],["OUTRO","Outro"]];
const periodicidadesEdicao = [["SEMANAL","Semanal"],["QUINZENAL","Quinzenal"],["MENSAL","Mensal"],["BIMESTRAL","Bimestral"],
    ["TRIMESTRAL","Trimestral"],["SEMESTRAL","Semestral"],["ANUAL","Anual"],["PERSONALIZADA","Personalizada"]];

function adicionarLinhaEdicao(lista, campos, dados = {}) {
    const linha = document.createElement("div");
    linha.className = "edicao-venda-linha";
    linha.innerHTML = campos + '<button type="button" class="btn btn-light">Remover</button>';
    Object.assign(linha.dataset, dados);
    linha.querySelector("button").onclick = () => {
        linha.remove();
        limparDecisaoEdicao();
    };
    lista.append(linha);
}

function adicionarItemEdicao(item) {
    const variacaoId = item.variacaoProdutoId || item.variacaoServicoId || item.variacaoId;
    adicionarLinhaEdicao(listaItensEdicao, [
        campoEdicao("descricao", "Descrição", item.descricao),
        campoEdicao("quantidade", "Quantidade", item.quantidade, "number", "0.001"),
        campoEdicao("valorUnitario", "Preço unitário", item.valorUnitario, "number", "0.01"),
        campoEdicao("desconto", "Desconto do item", item.desconto || 0, "number", "0.01"),
        campoEdicao("custoUnitario", "Custo unitário", item.custoUnitario || 0, "number", "0.01"),
        campoEdicao("observacao", "Observação do item", item.observacao)
    ].join(""), { id: item.id || "", variacaoId, tipo: item.tipo });
}

function adicionarCustoEdicao(custo = {}) {
    adicionarLinhaEdicao(listaCustosEdicao, [
        seletorEdicao("categoria", "Categoria", categoriasEdicao, custo.categoria || "OUTRO"),
        campoEdicao("descricaoCusto", "Descrição do custo", custo.descricao),
        campoEdicao("quantidadeCusto", "Quantidade", custo.quantidade || 1, "number", "0.001"),
        campoEdicao("valorCusto", "Valor unitário", custo.valorUnitario || 0, "number", "0.01")
    ].join(""));
}

async function abrirEdicaoVenda(id, botao) {
    botao.disabled = true;
    try {
        const [detalhe, catalogo] = await Promise.all([
            get(`/vendas/${id}`), get("/vendas/catalogo-edicao")
        ]);
        if (vendaAtualId !== id) return;
        const venda = detalhe?.venda;
        if (venda?.status !== "FATURADA" || !catalogo?.sucesso) {
            throw new Error("Não foi possível carregar a venda e o catálogo para edição.");
        }
        vendaEmEdicao = venda;
        const opcoesClientes = catalogo.clientes.map(cliente => [cliente.id, cliente.nome]);
        if (!opcoesClientes.some(([id]) => id === venda.clienteId)) opcoesClientes.unshift([venda.clienteId, venda.cliente.nome]);
        catalogoEdicaoVenda = new Map();
        for (const [tipo, registros] of [["PRODUTO", catalogo.produtos], ["SERVICO", catalogo.servicos]]) {
            for (const registro of registros || []) {
                if (registro.ativo === false) continue;
                for (const variacao of registro.variacoes || []) {
                    if (variacao.ativo === false) continue;
                    const variante = [variacao.sku || variacao.codigo, variacao.tamanho, variacao.saida, variacao.descricao].filter(Boolean).join(" · ");
                    const descricao = [registro.nome, variante].filter(Boolean).join(" · ");
                    catalogoEdicaoVenda.set(`${tipo}:${variacao.id}`, {
                        tipo, variacaoId: variacao.id, descricao, quantidade: 1, valorUnitario: variacao.precoVenda || 0, custoUnitario: variacao.precoCusto || 0
                    });
                }
            }
        }
        document.getElementById("tituloEdicaoVenda").textContent = `Editar venda #${String(venda.numero).padStart(5, "0")}`;
        document.getElementById("camposEdicaoVenda").innerHTML = [
            seletorEdicao("clienteId", "Cliente", opcoesClientes, venda.clienteId),
            campoEdicao("dataVenda", "Data da venda", venda.dataVenda.slice(0, 10), "date"),
            campoEdicao("desconto", "Desconto da venda", venda.desconto, "number", "0.01"),
            campoEdicao("frete", "Frete", venda.frete, "number", "0.01"),
            campoEdicao("outrasDespesas", "Outras despesas", venda.outrasDespesas, "number", "0.01"),
            seletorEdicao("formaPagamento", "Forma de pagamento", pagamentosEdicao, venda.formaPagamento),
            campoEdicao("quantidadeParcelas", "Parcelas", venda.quantidadeParcelas, "number", "1"),
            seletorEdicao("periodicidadeParcelas", "Periodicidade", periodicidadesEdicao, venda.periodicidadeParcelas),
            campoEdicao("primeiroVencimento", "Primeiro vencimento", venda.primeiroVencimento.slice(0, 10), "date"),
            campoEdicao("observacoes", "Observações da venda", venda.observacoes)
        ].join("");
        document.getElementById("catalogoEdicaoVenda").innerHTML = opcoesEdicao([
            ["", "Selecione no catálogo"], ...Array.from(catalogoEdicaoVenda, ([chave, item]) => [chave, item.descricao])
        ]);
        listaItensEdicao.replaceChildren();
        listaCustosEdicao.replaceChildren();
        venda.itens.forEach(adicionarItemEdicao);
        (venda.custosInternos || []).forEach(adicionarCustoEdicao);
        limparDecisaoEdicao();
        document.getElementById("erroEdicaoVenda").textContent = "";
        editarVendaDialog.showModal();
    } catch (error) {
        mostrarMensagem(error.message, { tipo: "erro" });
    } finally {
        botao.disabled = false;
    }
}

function camposLinhaEdicao(linha) {
    return Object.fromEntries(Array.from(linha.querySelectorAll("[name]"), campo => [campo.name, campo.value]));
}

function limparDecisaoEdicao() {
    decisaoEdicao.hidden = true;
    delete decisaoEdicao.dataset.saldo;
    decisaoEdicao.replaceChildren();
}

function perguntarDecisaoEdicao({ saldo, recebido }) {
    const credito = saldo < 0;
    decisaoEdicao.dataset.saldo = saldo;
    decisaoEdicao.innerHTML = `<legend>${credito ? "Como tratar o valor pago a mais?" : "Como cobrar a diferença?"}</legend>
        <p>Recebido: ${fmtMoeda(recebido)}. Diferença: ${fmtMoeda(Math.abs(saldo))}.</p>
        ${seletorEdicao("decisaoTipo", "O que deseja fazer?", [["", "Selecione uma opção"],
            credito ? ["REEMBOLSAR", "Lançar reembolso integral em Contas a Pagar"] : ["INTEGRAL", "Lançar a diferença integral em Contas a Receber"],
            ["SEM_AJUSTE", credito ? "Não reembolsar" : "Não lançar cobrança adicional"],
            ["PARCIAL", credito ? "Lançar reembolso parcial" : "Lançar apenas parte da diferença"]])}
        <div data-parcial hidden>${campoEdicao("decisaoValor", "Valor parcial", "", "number", "0.01")}</div>`;
    const valor = decisaoEdicao.querySelector("[name=decisaoValor]");
    valor.disabled = true;
    const selecao = decisaoEdicao.querySelector("[name=decisaoTipo]");
    selecao.onchange = () => {
        valor.disabled = selecao.value !== "PARCIAL";
        valor.closest("[data-parcial]").hidden = valor.disabled;
    };
    decisaoEdicao.hidden = false;
    selecao.focus();
}

document.getElementById("camposEdicaoVenda").addEventListener("input", limparDecisaoEdicao);
listaItensEdicao.addEventListener("input", limparDecisaoEdicao);
listaCustosEdicao.addEventListener("input", limparDecisaoEdicao);
document.getElementById("adicionarItemEdicaoVenda").onclick = () => {
    const select = document.getElementById("catalogoEdicaoVenda");
    const item = catalogoEdicaoVenda.get(select.value);
    if (!item) return;
    adicionarItemEdicao(item);
    select.value = "";
    limparDecisaoEdicao();
};
document.getElementById("adicionarCustoEdicaoVenda").onclick = () => {
    adicionarCustoEdicao();
    limparDecisaoEdicao();
};
document.getElementById("fecharEdicaoVenda").onclick = () => editarVendaDialog.close();
formEdicaoVenda.onsubmit = async event => {
    event.preventDefault();
    const botao = document.getElementById("salvarEdicaoVenda");
    const erro = document.getElementById("erroEdicaoVenda");
    erro.textContent = "";
    botao.disabled = true;
    const id = vendaEmEdicao.id;
    const dados = camposLinhaEdicao(document.getElementById("camposEdicaoVenda"));
    const decisao = camposLinhaEdicao(decisaoEdicao);
    const itens = Array.from(listaItensEdicao.children, linha => ({
        ...camposLinhaEdicao(linha), id: Number(linha.dataset.id) || undefined,
        tipo: linha.dataset.tipo, variacaoId: Number(linha.dataset.variacaoId)
    }));
    const custosInternos = Array.from(listaCustosEdicao.children, linha => {
        const custo = camposLinhaEdicao(linha);
        return { categoria: custo.categoria, descricao: custo.descricaoCusto, quantidade: custo.quantidadeCusto, valorUnitario: custo.valorCusto };
    });
    try {
        const resposta = await put(`/vendas/${id}`, {
            ...dados, atualizadoEm: vendaEmEdicao.atualizadoEm, itens, custosInternos,
            decisaoFinanceira: { tipo: decisao.decisaoTipo, valor: decisao.decisaoValor, saldo: decisaoEdicao.dataset.saldo }
        });
        if (!resposta?.sucesso) throw new Error(resposta?.mensagem || "Não foi possível salvar a venda.");
        if (resposta.decisaoFinanceira) return perguntarDecisaoEdicao(resposta.decisaoFinanceira);
        if (!resposta.venda) throw new Error("O ERP não confirmou a edição.");
        editarVendaDialog.close();
        await carregarVendas();
        if (vendaAtualId === id) await visualizarVenda(id);
        mostrarMensagem("Venda atualizada.", { tipo: "sucesso" });
    } catch (error) {
        erro.textContent = error.message;
    } finally {
        botao.disabled = false;
    }
};
