let orcamentos = [];
let clientes = [];
let produtos = [];
let servicos = [];
let itensOrcamento = [];
let custosInternos = [];

let orcamentoEditandoId = null;
let orcamentoVisualizadoId = null;
let orcamentoAprovandoId = null;

const modalOrcamento = document.getElementById("modalOrcamento");
const modalSelecionarProduto = document.getElementById(
    "modalSelecionarProduto"
);
const formOrcamento = document.getElementById("formOrcamento");

document.addEventListener("DOMContentLoaded", async () => {
    configurarEventos();

    await Promise.all([
        carregarClientes(),
        carregarProdutos(),
        carregarServicos(),
        carregarOrcamentos()
    ]);
});

function configurarEventos() {
    const produtoSelect = document.getElementById("produtoId");
    const variacaoSelect = document.getElementById(
        "variacaoProdutoId"
    );

    produtoSelect.addEventListener("change", () => {
        carregarVariacoesProduto();
    });

    variacaoSelect.addEventListener("change", () => {
        preencherValorVariacao();
    });

    document.getElementById("tipoItem").addEventListener("change", alternarTipoItem);
    document.getElementById("servicoId").addEventListener("change", carregarVariacoesServico);
    document.getElementById("variacaoServicoId").addEventListener("change", preencherValorVariacaoServico);
}

async function carregarServicos() {
    try {
        const resposta = await get("/servicos");
        if (!resposta?.sucesso) return;
        servicos = resposta.servicos || [];
        const select = document.getElementById("servicoId");
        select.innerHTML = '<option value="">Selecione um serviço</option>';
        servicos.filter((servico) => servico.ativo).forEach((servico) => {
            const option = document.createElement("option");
            option.value = servico.id;
            option.textContent = `${servico.codigo} - ${servico.nome}`;
            select.appendChild(option);
        });
    } catch (erro) {
        console.error(erro);
    }
}

function alternarTipoItem() {
    const tipo = document.getElementById("tipoItem").value;
    document.getElementById("camposProduto").style.display = tipo === "PRODUTO" ? "block" : "none";
    document.getElementById("camposServico").style.display = tipo === "SERVICO" ? "block" : "none";
    document.getElementById("valorUnitario").value = "";
}

function carregarVariacoesServico() {
    const servico = servicos.find((item) => item.id === Number(document.getElementById("servicoId").value));
    const select = document.getElementById("variacaoServicoId");
    select.innerHTML = '<option value="">Selecione uma variação</option>';
    (servico?.variacoes || []).filter((variacao) => variacao.ativo).forEach((variacao) => {
        const option = document.createElement("option");
        option.value = variacao.id;
        option.textContent = `${variacao.codigo} - ${variacao.descricao || "Padrão"} | ${moeda(variacao.precoVenda)}`;
        select.appendChild(option);
    });
}

function preencherValorVariacaoServico() {
    const servico = servicos.find((item) => item.id === Number(document.getElementById("servicoId").value));
    const variacao = servico?.variacoes?.find((item) => item.id === Number(document.getElementById("variacaoServicoId").value));
    document.getElementById("valorUnitario").value = variacao ? Number(variacao.precoVenda).toFixed(2) : "";
}

async function carregarClientes() {
    try {
        const resposta = await get("/clientes");

        if (!resposta || !resposta.sucesso) {
            mostrarMensagem(
                resposta?.mensagem ||
                "Erro ao carregar clientes."
            );

            return;
        }

        clientes = resposta.clientes || [];

        preencherSelectClientes();
    } catch (erro) {
        console.error(erro);
        mostrarMensagem("Erro ao carregar clientes.");
    }
}

function textoClienteOrcamento(valor) {
    return String(valor ?? "").trim();
}

function somenteDigitosClienteOrcamento(valor) {
    return textoClienteOrcamento(valor).replace(/\D/g, "");
}

function documentoTecnicoSacMaisClienteOrcamento(valor) {
    return /^SACMAIS-/i.test(textoClienteOrcamento(valor));
}

function nomeValidoClienteOrcamento(nome) {
    const valor = textoClienteOrcamento(nome);

    if (!valor || valor === "-" || valor === ".") {
        return false;
    }

    if (/^\+?[\d\s().-]+$/.test(valor)) {
        return false;
    }

    return /[A-Za-zÀ-ÿ]/.test(valor);
}

function nomeClienteOrcamento(cliente) {
    if (nomeValidoClienteOrcamento(cliente?.nome)) {
        return textoClienteOrcamento(cliente.nome);
    }

    return "Contato SacMais";
}

function formatarDocumentoClienteOrcamento(valor) {
    const original = textoClienteOrcamento(valor);

    if (!original || documentoTecnicoSacMaisClienteOrcamento(original)) {
        return "";
    }

    const digitos = somenteDigitosClienteOrcamento(original);

    if (digitos.length === 11) {
        return digitos.replace(
            /(\d{3})(\d{3})(\d{3})(\d{2})/,
            "$1.$2.$3-$4"
        );
    }

    if (digitos.length === 14) {
        return digitos.replace(
            /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
            "$1.$2.$3/$4-$5"
        );
    }

    return "";
}

function formatarTelefoneClienteOrcamento(valor) {
    let digitos = somenteDigitosClienteOrcamento(valor);

    if (!digitos) {
        return "";
    }

    if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith("55")) {
        digitos = digitos.slice(2);
    }

    if (digitos.length === 11) {
        return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
    }

    if (digitos.length === 10) {
        return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
    }

    return textoClienteOrcamento(valor);
}

function descricaoClienteSelect(cliente) {
    const nome = nomeClienteOrcamento(cliente);
    const documento = formatarDocumentoClienteOrcamento(cliente?.cpfCnpj);

    // No orçamento exibimos somente o que é dado real do cliente.
    // Identificadores técnicos como SACMAIS-5511999999999 nunca aparecem.
    if (documento) {
        return `${nome} - ${documento}`;
    }

    return nome;
}

function ordenarClientesParaSelect(lista) {
    return [...lista].sort((a, b) => {
        const aTemDocumento = formatarDocumentoClienteOrcamento(a?.cpfCnpj) ? 1 : 0;
        const bTemDocumento = formatarDocumentoClienteOrcamento(b?.cpfCnpj) ? 1 : 0;

        if (aTemDocumento !== bTemDocumento) {
            return bTemDocumento - aTemDocumento;
        }

        return descricaoClienteSelect(a).localeCompare(
            descricaoClienteSelect(b),
            "pt-BR",
            { sensitivity: "base" }
        );
    });
}

function preencherSelectClientes() {
    const select = document.getElementById("clienteId");

    select.innerHTML = `
        <option value="">
            Selecione um cliente
        </option>
    `;

    ordenarClientesParaSelect(clientes).forEach((cliente) => {
        const option = document.createElement("option");

        option.value = cliente.id;
        option.textContent = descricaoClienteSelect(cliente);
        option.title = option.textContent;

        select.appendChild(option);
    });
}

async function carregarProdutos() {
    try {
        const resposta = await get("/produtos");

        if (!resposta || !resposta.sucesso) {
            mostrarMensagem(
                resposta?.mensagem ||
                "Erro ao carregar produtos."
            );

            return;
        }

        produtos = resposta.produtos || [];

        preencherSelectProdutos();
    } catch (erro) {
        console.error(erro);
        mostrarMensagem("Erro ao carregar produtos.");
    }
}

function preencherSelectProdutos() {
    const select = document.getElementById("produtoId");

    select.innerHTML = `
        <option value="">
            Selecione um produto
        </option>
    `;

    produtos.forEach((produto) => {
        const option = document.createElement("option");

        option.value = produto.id;
        option.textContent = `${produto.codigo} - ${produto.nome}`;

        select.appendChild(option);
    });
}

async function carregarOrcamentos() {
    try {
        const resposta = await get("/orcamentos");

        if (!resposta || !resposta.sucesso) {
            mostrarMensagem(
                resposta?.mensagem ||
                "Erro ao carregar orçamentos."
            );

            return;
        }

        orcamentos = resposta.orcamentos || [];

        renderizarTabelaOrcamentos(orcamentos);
    } catch (erro) {
        console.error(erro);
        mostrarMensagem("Erro ao carregar orçamentos.");
    }
}

function statusOrcamentoInfo(status) {
    const mapa = {
        RASCUNHO: { texto: "Rascunho", classe: "badge-warning" },
        ENVIADO: { texto: "Enviado", classe: "badge-info" },
        APROVADO: { texto: "Aprovado / venda gerada", classe: "badge-success" },
        REJEITADO: { texto: "Rejeitado", classe: "badge-danger" },
        CANCELADO: { texto: "Cancelado", classe: "badge-danger" },
        VENCIDO: { texto: "Vencido", classe: "badge-secondary" }
    };
    return mapa[status] || { texto: status || "Rascunho", classe: "badge-secondary" };
}

function renderizarTabelaOrcamentos(lista) {
    const tbody = document.getElementById("tabelaOrcamentos");
    tbody.innerHTML = "";

    if (!lista.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Nenhum orçamento cadastrado.</td></tr>';
        return;
    }

    lista.forEach((orcamento) => {
        const st = statusOrcamentoInfo(orcamento.status);
        const podeEditar = !["APROVADO", "CANCELADO"].includes(orcamento.status);
        const podeAprovar = !orcamento.venda && !["APROVADO", "CANCELADO", "REJEITADO", "VENCIDO"].includes(orcamento.status);
        const linha = document.createElement("tr");
        linha.innerHTML = `
            <td><strong>#${String(orcamento.numero).padStart(5, "0")}</strong></td>
            <td>${escaparHtml(orcamento.cliente?.nome || "-")}</td>
            <td>${data(orcamento.criadoEm)}</td>
            <td><strong>${moeda(orcamento.total)}</strong></td>
            <td><span class="badge ${st.classe}">${st.texto}</span></td>
            <td><div class="table-actions">
                <button type="button" class="btn btn-light" onclick="visualizarOrcamento(${orcamento.id})" title="Visualizar"><i class="fas fa-eye"></i></button>
                <button type="button" class="btn btn-light" onclick="gerarPdfOrcamento(${orcamento.id})" title="Gerar PDF"><i class="fas fa-file-pdf"></i></button>
                ${podeAprovar ? `<button type="button" class="btn btn-success" onclick="abrirModalAprovacao(${orcamento.id})" title="Aprovar e gerar venda"><i class="fas fa-check"></i></button>` : ""}
                ${podeEditar ? `<button type="button" class="btn btn-warning" onclick="editarOrcamento(${orcamento.id})" title="Editar"><i class="fas fa-edit"></i></button>` : ""}
                ${podeEditar ? `<button type="button" class="btn btn-danger" onclick="excluirOrcamento(${orcamento.id})" title="Excluir"><i class="fas fa-trash"></i></button>` : ""}
            </div></td>`;
        tbody.appendChild(linha);
    });
}

function abrirModalOrcamento() {
    orcamentoEditandoId = null;
    itensOrcamento = [];
    custosInternos = [];

    formOrcamento.reset();

    document.getElementById("numero").value =
        "Gerado automaticamente";

    document.getElementById("desconto").value = 0;
    document.getElementById("frete").value = 0;
    document.getElementById("outrasDespesas").value = 0;

    document.querySelector(
        "#modalOrcamento .modal-title"
    ).textContent = "Novo Orçamento";

    renderizarItens();
    renderizarCustosInternos();
    calcularTotais();

    modalOrcamento.classList.add("active");
}

function fecharModalOrcamento() {
    modalOrcamento.classList.remove("active");

    formOrcamento.reset();

    orcamentoEditandoId = null;
    itensOrcamento = [];
    custosInternos = [];

    renderizarItens();
    renderizarCustosInternos();
    calcularTotais();
}

function abrirModalProduto() {
    if (!produtos.length && !servicos.length) {
        mostrarMensagem(
            "Cadastre ao menos um produto ou serviço antes de criar o orçamento."
        );

        return;
    }

    document.getElementById("produtoId").value = "";
    document.getElementById("servicoId").value = "";
    document.getElementById("tipoItem").value = produtos.length ? "PRODUTO" : "SERVICO";
    alternarTipoItem();
    document.getElementById("variacaoProdutoId").innerHTML = `
        <option value="">
            Selecione primeiro um produto
        </option>
    `;

    document.getElementById("quantidade").value = 1;
    document.getElementById("valorUnitario").value = "";

    modalSelecionarProduto.classList.add("active");
}

function fecharModalProduto() {
    modalSelecionarProduto.classList.remove("active");

    document.getElementById("produtoId").value = "";
    document.getElementById("variacaoProdutoId").innerHTML = "";
    document.getElementById("quantidade").value = 1;
    document.getElementById("valorUnitario").value = "";
}

function carregarVariacoesProduto() {

    const produtoId = Number(
        document.getElementById("produtoId").value
    );

    const select = document.getElementById(
        "variacaoProdutoId"
    );

    select.innerHTML = "";

    const produto = produtos.find(
        p => Number(p.id) === produtoId
    );

    console.log("Produto:", produto);

    if (!produto) {

        select.innerHTML = `
            <option value="">
                Produto não encontrado
            </option>
        `;

        return;

    }

    console.log("Variações:", produto.variacoes);

    if (!produto.variacoes || !produto.variacoes.length) {

        select.innerHTML = `
            <option value="">
                Produto sem variações
            </option>
        `;

        return;

    }

    select.innerHTML = `
        <option value="">
            Selecione uma variação
        </option>
    `;

    produto.variacoes.forEach(v => {

        const option = document.createElement("option");

        option.value = v.id;

        option.textContent =
            `${v.sku} | ${v.saida || "-"} | ${v.tamanho || "-"} | ${moeda(v.precoVenda)}`;

        select.appendChild(option);

    });

}
function preencherValorVariacao() {
    const produtoId = Number(
        document.getElementById("produtoId").value
    );

    const variacaoId = Number(
        document.getElementById("variacaoProdutoId").value
    );

    const produto = produtos.find(
        (item) => item.id === produtoId
    );

    const variacao = produto?.variacoes?.find(
        (item) => item.id === variacaoId
    );

    document.getElementById("valorUnitario").value =
        variacao
            ? Number(variacao.precoVenda).toFixed(2)
            : "";
}

function filtrarOrcamentos() {
    const pesquisa = document
        .getElementById("pesquisa")
        .value
        .trim()
        .toLowerCase();

    if (!pesquisa) {
        renderizarTabelaOrcamentos(orcamentos);
        return;
    }

    const filtrados = orcamentos.filter((orcamento) => {
        const numeroOrcamento = String(
            orcamento.numero || ""
        ).toLowerCase();

        const nomeCliente = String(
            orcamento.cliente?.nome || ""
        ).toLowerCase();

        const cpfCnpj = String(
            orcamento.cliente?.cpfCnpj || ""
        ).toLowerCase();

        return (
            numeroOrcamento.includes(pesquisa) ||
            nomeCliente.includes(pesquisa) ||
            cpfCnpj.includes(pesquisa)
        );
    });

    renderizarTabelaOrcamentos(filtrados);
}

function adicionarItemOrcamento() {

    const tipo = document.getElementById("tipoItem").value;
    const quantidade = Number(document.getElementById("quantidade").value);
    const valorUnitario = Number(document.getElementById("valorUnitario").value);

    if (quantidade <= 0) {
        mostrarMensagem("Informe uma quantidade válida.");
        return;
    }

    if (!Number.isFinite(valorUnitario) || valorUnitario < 0) {
        mostrarMensagem("Informe um valor unitário válido.");
        return;
    }

    if (tipo === "SERVICO") {
        const servicoId = Number(document.getElementById("servicoId").value);
        const variacaoId = Number(document.getElementById("variacaoServicoId").value);
        const servico = servicos.find((item) => item.id === servicoId);
        const variacao = servico?.variacoes?.find((item) => item.id === variacaoId);

        if (!servico || !variacao) {
            mostrarMensagem("Selecione o serviço e sua variação.");
            return;
        }

        const existente = itensOrcamento.find((item) => item.tipo === "SERVICO" && item.variacaoServicoId === variacaoId);
        if (existente) {
            existente.quantidade += quantidade;
            existente.valorUnitario = valorUnitario;
            existente.custoUnitario = Number(variacao.precoCusto || 0);
            existente.total = existente.quantidade * valorUnitario;
        } else {
            itensOrcamento.push({
                tipo: "SERVICO",
                servicoId,
                variacaoServicoId: variacao.id,
                produto: servico.nome,
                sku: variacao.codigo,
                descricao: variacao.descricao || "Padrão",
                quantidade,
                valorUnitario,
                custoUnitario: Number(variacao.precoCusto || 0),
                total: quantidade * valorUnitario
            });
        }

        fecharModalProduto();
        renderizarItens();
        calcularTotais();
        return;
    }

    const produtoId = Number(
        document.getElementById("produtoId").value
    );

    const variacaoId = Number(
        document.getElementById("variacaoProdutoId").value
    );

    if (!produtoId) {

        mostrarMensagem("Selecione um produto.");

        return;

    }

    if (!variacaoId) {

        mostrarMensagem("Selecione uma variação.");

        return;

    }

    const produto = produtos.find(
        p => p.id === produtoId
    );

    const variacao = produto.variacoes.find(
        v => v.id === variacaoId
    );

    const existente = itensOrcamento.find(
        item => item.tipo !== "SERVICO" && item.variacaoProdutoId === variacaoId
    );

    if (existente) {

        existente.quantidade += quantidade;

        existente.custoUnitario = Number(variacao.precoCusto || 0);

        existente.total =
            existente.quantidade *
            existente.valorUnitario;

    } else {

        itensOrcamento.push({

            tipo: "PRODUTO",

            produtoId,

            variacaoProdutoId: variacao.id,

            produto: produto.nome,

            sku: variacao.sku,

            descricao:

                [

                    variacao.saida,

                    variacao.tamanho

                ]

                    .filter(Boolean)

                    .join(" | "),

            quantidade,

            valorUnitario,

            custoUnitario: Number(variacao.precoCusto || 0),

            total:
                quantidade *
                valorUnitario

        });

    }

    fecharModalProduto();

    renderizarItens();

    calcularTotais();

}

function renderizarItens() {

    const tbody =
        document.getElementById("tabelaItens");

    tbody.innerHTML = "";

    if (!itensOrcamento.length) {

        tbody.innerHTML = `

            <tr>

                <td colspan="6" class="text-center">

                    Nenhum item adicionado.

                </td>

            </tr>

        `;

        return;

    }

    itensOrcamento.forEach((item, index) => {

        tbody.innerHTML += `

            <tr>

                <td>

                    <strong>

                        ${escaparHtml(item.produto)}

                    </strong>

                    <small class="d-block text-muted">${item.tipo === "SERVICO" ? "Serviço" : "Material"}</small>

                </td>

                <td>

                    ${escaparHtml(

            item.descricao ||

            item.sku

        )}

                </td>

                <td>

                    <input

                        type="number"

                        class="form-control"

                        min="0.5"

                        step="0.5"

                        value="${item.quantidade}"

                        onchange="alterarQuantidade(

                            ${index},

                            this.value

                        )">

                </td>

                <td>

                    <input

                        type="number"

                        class="form-control"

                        min="0"

                        step="0.01"

                        value="${item.valorUnitario}"

                        onchange="alterarValor(

                            ${index},

                            this.value

                        )">

                </td>

                <td>

                    <strong>

                        ${moeda(item.total)}

                    </strong>

                </td>

                <td>

                    <button

                        class="btn btn-danger"

                        onclick="removerItem(

                            ${index}

                        )">

                        <i class="fas fa-trash"></i>

                    </button>

                </td>

            </tr>

        `;

    });

}

function alterarQuantidade(index, valor) {

    const quantidade = Number(valor);

    if (quantidade <= 0) {

        return;

    }

    itensOrcamento[index].quantidade = quantidade;

    itensOrcamento[index].total =

        quantidade *

        itensOrcamento[index].valorUnitario;

    renderizarItens();

    calcularTotais();

}

function alterarValor(index, valor) {

    const unitario = Number(valor);

    if (unitario < 0) {

        return;

    }

    itensOrcamento[index].valorUnitario = unitario;

    itensOrcamento[index].total =

        unitario *

        itensOrcamento[index].quantidade;

    renderizarItens();

    calcularTotais();

}

function removerItem(index) {

    itensOrcamento.splice(index, 1);

    renderizarItens();

    calcularTotais();

}

function adicionarCustoInterno() {
    custosInternos.push({
        categoria: "MATERIAL",
        descricao: "",
        quantidade: 1,
        valorUnitario: 0,
        total: 0
    });

    renderizarCustosInternos();
    calcularTotais();
}

function renderizarCustosInternos() {
    const tbody = document.getElementById("tabelaCustosInternos");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (!custosInternos.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    Nenhum custo interno. Ex.: areia, cimento, combustível, pedágio.
                </td>
            </tr>
        `;
        return;
    }

    custosInternos.forEach((custo, index) => {
        const total = Number(custo.quantidade || 0) * Number(custo.valorUnitario || 0);
        custo.total = total;

        const linha = document.createElement("tr");
        linha.innerHTML = `
            <td>
                <select class="form-control" onchange="alterarCustoInterno(${index}, 'categoria', this.value)">
                    <option value="MATERIAL" ${custo.categoria === "MATERIAL" ? "selected" : ""}>Material</option>
                    <option value="COMBUSTIVEL" ${custo.categoria === "COMBUSTIVEL" ? "selected" : ""}>Combustível</option>
                    <option value="FRETE" ${custo.categoria === "FRETE" ? "selected" : ""}>Frete / deslocamento</option>
                    <option value="MAO_DE_OBRA" ${custo.categoria === "MAO_DE_OBRA" ? "selected" : ""}>Mão de obra</option>
                    <option value="OUTRO" ${custo.categoria === "OUTRO" ? "selected" : ""}>Outro</option>
                </select>
            </td>
            <td>
                <input class="form-control" value="${escaparHtml(custo.descricao || "")}" placeholder="Ex.: Areia" oninput="alterarCustoInterno(${index}, 'descricao', this.value)">
            </td>
            <td>
                <input type="number" class="form-control" min="0.5" step="0.5" value="${Number(custo.quantidade || 1)}" onchange="alterarCustoInterno(${index}, 'quantidade', this.value)">
            </td>
            <td>
                <input type="number" class="form-control" min="0" step="0.01" value="${Number(custo.valorUnitario || 0)}" onchange="alterarCustoInterno(${index}, 'valorUnitario', this.value)">
            </td>
            <td><strong>${moeda(total)}</strong></td>
            <td>
                <button type="button" class="btn btn-danger" onclick="removerCustoInterno(${index})" title="Remover custo">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(linha);
    });
}

function alterarCustoInterno(index, campo, valor) {
    if (!custosInternos[index]) return;

    if (["quantidade", "valorUnitario"].includes(campo)) {
        custosInternos[index][campo] = Number(valor) || 0;
    } else {
        custosInternos[index][campo] = valor;
    }

    custosInternos[index].total =
        Number(custosInternos[index].quantidade || 0) *
        Number(custosInternos[index].valorUnitario || 0);

    if (["quantidade", "valorUnitario"].includes(campo)) {
        renderizarCustosInternos();
    }

    calcularTotais();
}

function removerCustoInterno(index) {
    custosInternos.splice(index, 1);
    renderizarCustosInternos();
    calcularTotais();
}

function obterCustoInternoTotal() {
    return custosInternos.reduce(
        (total, custo) => total + Number(custo.quantidade || 0) * Number(custo.valorUnitario || 0),
        0
    );
}

function obterCustoItensTotal() {
    return itensOrcamento.reduce(
        (total, item) => total + Number(item.quantidade || 0) * Number(item.custoUnitario || 0),
        0
    );
}

function calcularTotais() {

    const subtotal = itensOrcamento.reduce(

        (total, item) => total + item.total,

        0

    );

    const desconto =

        Number(

            document.getElementById("desconto").value

        ) || 0;

    const frete =

        Number(

            document.getElementById("frete").value

        ) || 0;

    const outrasDespesas =

        Number(

            document.getElementById("outrasDespesas").value

        ) || 0;

    const total =

        subtotal -

        desconto +

        frete +

        outrasDespesas;

    document.getElementById("subtotal").value =

        subtotal.toFixed(2);

    document.getElementById("valorTotal").innerHTML =

        moeda(total);

    const custoItensTotal = obterCustoItensTotal();
    const custoInternoTotal = obterCustoInternoTotal();
    const lucroEstimado = total - custoItensTotal - custoInternoTotal;

    const campoCustoItens = document.getElementById("custoItensResumo");
    const campoCustoInterno = document.getElementById("custoInternoResumo");
    const campoLucro = document.getElementById("lucroEstimadoResumo");

    if (campoCustoItens) campoCustoItens.textContent = moeda(custoItensTotal);
    if (campoCustoInterno) campoCustoInterno.textContent = moeda(custoInternoTotal);
    if (campoLucro) campoLucro.textContent = moeda(lucroEstimado);

}

async function salvarOrcamento() {

    const botao = document.querySelector(
        "#modalOrcamento .modal-footer .btn-primary"
    );

    try {

        const dados = obterDadosFormulario();

        validarOrcamento(dados);

        botao.disabled = true;

        botao.innerHTML = `
            <i class="fas fa-spinner fa-spin"></i>
            Salvando...
        `;

        let resposta;

        if (orcamentoEditandoId) {

            resposta = await put(
                `/orcamentos/${orcamentoEditandoId}`,
                dados
            );

        } else {

            resposta = await post(
                "/orcamentos",
                dados
            );

        }

        if (!resposta || !resposta.sucesso) {

            mostrarMensagem(
                resposta?.mensagem ||
                "Erro ao salvar orçamento."
            );

            return;

        }

        fecharModalOrcamento();

        await carregarOrcamentos();

        mostrarMensagem(

            orcamentoEditandoId

                ? "Orçamento atualizado com sucesso."

                : "Orçamento cadastrado com sucesso."

        );

    } catch (erro) {

        console.error(erro);

        mostrarMensagem(
            erro.message || "Erro ao salvar orçamento."
        );

    } finally {

        botao.disabled = false;

        botao.innerHTML = `
            <i class="fas fa-save"></i>
            Salvar Orçamento
        `;

    }

}

function obterDadosFormulario() {

    const subtotal = itensOrcamento.reduce(
        (total, item) => total + item.total,
        0
    );

    const desconto =
        Number(
            document.getElementById("desconto").value
        ) || 0;

    const frete =
        Number(
            document.getElementById("frete").value
        ) || 0;

    const outrasDespesas =
        Number(
            document.getElementById("outrasDespesas").value
        ) || 0;

    return {

        clienteId: Number(
            document.getElementById("clienteId").value
        ),

        subtotal,

        desconto,

        frete,

        outrasDespesas,

        total:

            subtotal -

            desconto +

            frete +

            outrasDespesas,

        observacoes:

            document
                .getElementById("observacoes")
                .value
                .trim(),

        custosInternos: custosInternos.map((custo) => ({
            categoria: custo.categoria || "OUTRO",
            descricao: String(custo.descricao || "").trim(),
            quantidade: Number(custo.quantidade || 0),
            valorUnitario: Number(custo.valorUnitario || 0),
            total: Number(custo.quantidade || 0) * Number(custo.valorUnitario || 0)
        })),

        itens: itensOrcamento.map(item => ({

            tipo: item.tipo || "PRODUTO",

            variacaoProdutoId:
                item.tipo === "SERVICO" ? null : item.variacaoProdutoId,

            variacaoServicoId:
                item.tipo === "SERVICO" ? item.variacaoServicoId : null,

            quantidade:
                item.quantidade,

            valorUnitario:
                item.valorUnitario,

            desconto: 0,

            total:
                item.total

        }))

    };

}

function validarOrcamento(orcamento) {

    if (!orcamento.clienteId) {

        throw new Error(
            "Selecione um cliente."
        );

    }

    if (!orcamento.itens.length) {

        throw new Error(
            "Adicione pelo menos um produto ou serviço."
        );

    }

    orcamento.custosInternos.forEach((custo, index) => {
        if (!custo.descricao) {
            throw new Error(`Informe a descrição do custo interno ${index + 1}.`);
        }
        if (custo.quantidade <= 0) {
            throw new Error(`Informe uma quantidade válida no custo interno ${index + 1}.`);
        }
        if (custo.valorUnitario < 0) {
            throw new Error(`Informe um valor válido no custo interno ${index + 1}.`);
        }
    });

}

async function editarOrcamento(id) {

    const resposta = await get(`/orcamentos/${id}`);

    if (!resposta.sucesso) {

        mostrarMensagem(resposta.mensagem);

        return;

    }

    const orcamento = resposta.orcamento;

    orcamentoEditandoId = orcamento.id;

    document.getElementById("clienteId").value =
        orcamento.clienteId;

    document.getElementById("numero").value =
        orcamento.numero;

    document.getElementById("desconto").value =
        orcamento.desconto;

    document.getElementById("frete").value =
        orcamento.frete;

    document.getElementById("outrasDespesas").value =
        orcamento.outrasDespesas;

    document.getElementById("observacoes").value =
        orcamento.observacoes || "";

    itensOrcamento = [];

    orcamento.itens.forEach(item => {

        if (item.tipo === "SERVICO") {
            itensOrcamento.push({
                tipo: "SERVICO",
                servicoId: item.variacaoServico.servico.id,
                variacaoServicoId: item.variacaoServico.id,
                produto: item.variacaoServico.servico.nome,
                sku: item.variacaoServico.codigo,
                descricao: item.variacaoServico.descricao || "Padrão",
                quantidade: Number(item.quantidade),
                valorUnitario: Number(item.valorUnitario),
                custoUnitario: Number(item.custoUnitario || 0),
                total: Number(item.total)
            });
            return;
        }

        itensOrcamento.push({

            tipo: "PRODUTO",

            produtoId:
                item.variacaoProduto.produto.id,

            variacaoProdutoId:
                item.variacaoProduto.id,

            produto:
                item.variacaoProduto.produto.nome,

            sku:
                item.variacaoProduto.sku,

            descricao:

                [

                    item.variacaoProduto.saida,

                    item.variacaoProduto.tamanho

                ]

                    .filter(Boolean)

                    .join(" | "),

            quantidade:
                Number(item.quantidade),

            valorUnitario:
                Number(item.valorUnitario),

            custoUnitario:
                Number(item.custoUnitario || 0),

            total:
                Number(item.total)

        });

    });

    custosInternos = Array.isArray(orcamento.custosInternos)
        ? orcamento.custosInternos.map((custo) => ({
            categoria: custo.categoria || "OUTRO",
            descricao: custo.descricao || "",
            quantidade: Number(custo.quantidade || 1),
            valorUnitario: Number(custo.valorUnitario || 0),
            total: Number(custo.total || 0)
        }))
        : [];

    renderizarItens();
    renderizarCustosInternos();

    calcularTotais();

    document.querySelector(
        "#modalOrcamento .modal-title"
    ).textContent = "Editar Orçamento";

    modalOrcamento.classList.add("active");

}

async function visualizarOrcamento(id) {

    const resposta = await get(`/orcamentos/${id}`);

    if (!resposta.sucesso) {

        mostrarMensagem(resposta.mensagem);

        return;

    }

    const o = resposta.orcamento;

    document.getElementById("viewNumero").value =
        o.numero;

    document.getElementById("viewCliente").value =
        o.cliente.nome;

    document.getElementById("viewStatus").value = statusOrcamentoInfo(o.status).texto;

    document.getElementById("viewObservacoes").value =
        o.observacoes || "";

    document.getElementById("viewTotal").innerHTML =
        moeda(o.total);

    const tbody =
        document.getElementById("viewTabelaItens");

    tbody.innerHTML = "";

    o.itens.forEach(item => {

        const servico = item.tipo === "SERVICO";
        const nome = servico ? item.variacaoServico.servico.nome : item.variacaoProduto.produto.nome;
        const variacao = servico
            ? (item.variacaoServico.descricao || item.variacaoServico.codigo)
            : `${item.variacaoProduto.saida || "-"} / ${item.variacaoProduto.tamanho || "-"}`;

        tbody.innerHTML += `

            <tr>

                <td>${escaparHtml(nome)}</td>

                <td>

                    ${escaparHtml(variacao)}

                </td>

                <td>${item.quantidade}</td>

                <td>${moeda(item.valorUnitario)}</td>

                <td>${moeda(item.total)}</td>

            </tr>

        `;

    });

    const custos = Array.isArray(o.custosInternos) ? o.custosInternos : [];
    const tbodyCustos = document.getElementById("viewCustosInternos");
    if (tbodyCustos) {
        tbodyCustos.innerHTML = custos.length
            ? custos.map((custo) => `
                <tr>
                    <td>${escaparHtml(custo.categoria || "OUTRO")}</td>
                    <td>${escaparHtml(custo.descricao || "-")}</td>
                    <td>${Number(custo.quantidade || 0)}</td>
                    <td>${moeda(custo.valorUnitario || 0)}</td>
                    <td>${moeda(custo.total || 0)}</td>
                </tr>
            `).join("")
            : '<tr><td colspan="5" class="text-center">Nenhum custo interno lançado.</td></tr>';
    }

    const viewCustoItens = document.getElementById("viewCustoItens");
    const viewCustoInterno = document.getElementById("viewCustoInterno");
    const viewLucro = document.getElementById("viewLucroEstimado");
    if (viewCustoItens) viewCustoItens.value = moeda(o.custoItensTotal || 0);
    if (viewCustoInterno) viewCustoInterno.value = moeda(o.custoInternoTotal || 0);
    if (viewLucro) viewLucro.value = moeda(o.lucroEstimado || 0);

    orcamentoVisualizadoId = o.id;
    const podeEditar = !["APROVADO", "CANCELADO"].includes(o.status);
    const podeAprovar = !o.venda && !["APROVADO", "CANCELADO", "REJEITADO", "VENCIDO"].includes(o.status);
    document.getElementById("btnEditarOrcamentoView").style.display = podeEditar ? "inline-flex" : "none";
    document.getElementById("btnAprovarOrcamentoView").style.display = podeAprovar ? "inline-flex" : "none";

    document.getElementById("modalVisualizarOrcamento").classList.add("active");

}

function fecharVisualizacaoOrcamento() {

    document
        .getElementById("modalVisualizarOrcamento")
        .classList
        .remove("active");

}

async function excluirOrcamento(id) {

    if (!confirm(
        "Deseja realmente excluir este orçamento?"
    )) {

        return;

    }

    try {

        const resposta = await del(
            `/orcamentos/${id}`
        );

        if (!resposta.sucesso) {

            mostrarMensagem(
                resposta.mensagem
            );

            return;

        }

        await carregarOrcamentos();

        mostrarMensagem(
            "Orçamento removido com sucesso."
        );

    } catch (erro) {

        console.error(erro);

        mostrarMensagem(
            "Erro ao excluir orçamento."
        );

    }

}

function editarOrcamentoVisualizado() {
    if (!orcamentoVisualizadoId) return;
    const id = orcamentoVisualizadoId;
    fecharVisualizacaoOrcamento();
    editarOrcamento(id);
}

function abrirAprovacaoOrcamentoVisualizado() {
    if (!orcamentoVisualizadoId) return;
    fecharVisualizacaoOrcamento();
    abrirModalAprovacao(orcamentoVisualizadoId);
}

function gerarPdfOrcamentoVisualizado() {
    if (orcamentoVisualizadoId) gerarPdfOrcamento(orcamentoVisualizadoId);
}

function abrirModalAprovacao(id) {
    orcamentoAprovandoId = id;
    const hoje = new Date();
    const yyyy = hoje.getFullYear();
    const mm = String(hoje.getMonth() + 1).padStart(2, "0");
    const dd = String(hoje.getDate()).padStart(2, "0");
    document.getElementById("aprovarFormaPagamento").value = "PIX";
    document.getElementById("aprovarParcelas").value = 1;
    document.getElementById("aprovarPeriodicidade").value = "MENSAL";
    document.getElementById("aprovarPrimeiroVencimento").value = `${yyyy}-${mm}-${dd}`;
    document.getElementById("modalAprovarOrcamento").classList.add("active");
}

function fecharModalAprovacao() {
    document.getElementById("modalAprovarOrcamento").classList.remove("active");
    orcamentoAprovandoId = null;
}

async function confirmarAprovacaoOrcamento() {
    if (!orcamentoAprovandoId) return;
    const botao = document.getElementById("btnConfirmarAprovacao");
    const dados = {
        formaPagamento: document.getElementById("aprovarFormaPagamento").value,
        quantidadeParcelas: Number(document.getElementById("aprovarParcelas").value),
        periodicidadeParcelas: document.getElementById("aprovarPeriodicidade").value,
        primeiroVencimento: document.getElementById("aprovarPrimeiroVencimento").value
    };
    if (!dados.primeiroVencimento) return mostrarMensagem("Informe o primeiro vencimento.");
    try {
        botao.disabled = true;
        botao.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Aprovando...';
        const r = await put(`/orcamentos/${orcamentoAprovandoId}/aprovar`, dados);
        if (!r?.sucesso) return mostrarMensagem(r?.mensagem || "Erro ao aprovar orçamento.");
        fecharModalAprovacao();
        await carregarOrcamentos();
        mostrarMensagem(`Orçamento aprovado. Venda #${String(r.venda?.numero || "").padStart(5, "0")} criada e aguardando faturamento.`);
    } catch (e) {
        console.error(e);
        mostrarMensagem(e.message || "Erro ao aprovar orçamento.");
    } finally {
        botao.disabled = false;
        botao.innerHTML = '<i class="fas fa-check"></i> Aprovar e gerar venda';
    }
}

async function gerarPdfOrcamento(id) {
    const r = await get(`/orcamentos/${id}`);

    if (!r?.sucesso) {
        return mostrarMensagem(
            r?.mensagem ||
            "Erro ao carregar orçamento."
        );
    }

    const o = r.orcamento;

    // Dados oficiais que devem sair no orçamento da Potência Padrões.
    // Mantemos os demais campos vindos do cadastro (como a logo), mas
    // sobrescrevemos os dados de identificação para impedir que um CNPJ
    // de outro cadastro/empresa seja impresso no PDF.
    const empresaBanco = o.empresa || {};
    const empresa = {
        ...empresaBanco,
        razaoSocial: "ELIAN ELETRIC EMPREENDIMENTOS E SERVICOS LTDA",
        nomeFantasia: "POTÊNCIA PADRÕES",
        cnpj: "65.718.887/0001-01",
        inscricaoEstadual: "20.392.851-2",
        endereco: "AV GOIAS",
        numero: "13295",
        complemento: "QUADRA03 LOTE 03",
        bairro: "RES RECANTO DO BOSQUE",
        cidade: "Goiânia",
        estado: "GO",
        cep: "74474-310",
        telefone: "(62) 3298-4736"
    };

    const cliente = o.cliente || {};

    const textoSeguro = (valor, padrao = "-") => {
        const texto = String(valor ?? "").trim();
        return texto || padrao;
    };

    const somenteDigitosPdf = (valor) =>
        String(valor ?? "").replace(/\D/g, "");

    const formatarDocumentoPdf = (valor) => {
        const original = String(valor ?? "").trim();

        if (!original || /^SACMAIS-/i.test(original)) {
            return "";
        }

        const digitos = somenteDigitosPdf(original);

        if (digitos.length === 11) {
            return digitos.replace(
                /(\d{3})(\d{3})(\d{3})(\d{2})/,
                "$1.$2.$3-$4"
            );
        }

        if (digitos.length === 14) {
            return digitos.replace(
                /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
                "$1.$2.$3/$4-$5"
            );
        }

        return original;
    };

    const formatarTelefonePdf = (valor) => {
        let digitos = somenteDigitosPdf(valor);

        if (!digitos) {
            return "-";
        }

        if (
            (digitos.length === 12 || digitos.length === 13) &&
            digitos.startsWith("55")
        ) {
            digitos = digitos.slice(2);
        }

        if (digitos.length === 11) {
            return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
        }

        if (digitos.length === 10) {
            return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
        }

        return textoSeguro(valor);
    };

    const dataBrPdf = (valor) => {
        if (!valor) return "-";

        const dataObj = new Date(valor);

        if (Number.isNaN(dataObj.getTime())) {
            return "-";
        }

        return dataObj.toLocaleDateString("pt-BR");
    };

    const dataHoraBrPdf = (valor) => {
        const dataObj = valor
            ? new Date(valor)
            : new Date();

        if (Number.isNaN(dataObj.getTime())) {
            return "-";
        }

        const dataParte = dataObj.toLocaleDateString(
            "pt-BR"
        );

        const horaParte = dataObj.toLocaleTimeString(
            "pt-BR",
            {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }
        );

        return `${dataParte} às ${horaParte}`;
    };

    const numeroPtBrPdf = (
        valor,
        minimo = 2,
        maximo = 2
    ) => Number(valor || 0).toLocaleString(
        "pt-BR",
        {
            minimumFractionDigits: minimo,
            maximumFractionDigits: maximo
        }
    );

    const formatarNcmPdf = (valor) => {
        const digitos = somenteDigitosPdf(valor);

        if (digitos.length === 8) {
            return `${digitos.slice(0, 4)}.${digitos.slice(4, 6)}.${digitos.slice(6)}`;
        }

        return textoSeguro(valor);
    };

    const escapar = (valor) =>
        escaparHtml(
            textoSeguro(
                valor,
                ""
            )
        );

    const documentoCliente =
        formatarDocumentoPdf(
            cliente.cpfCnpj
        );

    const documentoEmpresa =
        formatarDocumentoPdf(
            empresa.cnpj
        );

    const labelDocumentoCliente =
        somenteDigitosPdf(documentoCliente).length === 14
            ? "CNPJ"
            : "CPF";

    const enderecoEmpresaBase = [
        empresa.endereco,
        empresa.numero
    ]
        .filter(Boolean)
        .join(", ");

    const enderecoEmpresa = [
        enderecoEmpresaBase,
        empresa.complemento
    ]
        .filter(Boolean)
        .join(" - ");

    const complementoEmpresa =
        String(
            empresa.bairro ||
            ""
        ).trim();

    const cidadeEmpresa = [
        empresa.cidade,
        empresa.estado
    ]
        .filter(Boolean)
        .join(" - ");

    const enderecoCliente = [
        cliente.endereco,
        cliente.numero
    ]
        .filter(Boolean)
        .join(", ");

    const cidadeCliente = [
        cliente.cidade,
        cliente.estado
    ]
        .filter(Boolean)
        .join(" - ");

    const logoPadrao = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAATsAAACvCAIAAAANPu5xAAB56ElEQVR4nOz995dl15HfC4bZ+5hr0/vyVaiCLXhLEKA3zSbbqJtqM6PR9FvS/PLmp3nzD8zTzFtrfhjNs5LeaFqtlpknsS1dsxskSBCEd4UqVBUKKG/TZ153zN47Yn64mWVg6NQooMD7Wbky78l7Ms89957vib0jYkegqsKAAQNuEOjDfgEDBgz4BRgodsCAG4mBYgcMuJEYKHbAgBuJgWIHDLiRGCh2wIAbiYFiBwy4kRgodsCAG4mBYgcMuJEYKHbAgBuJgWIHDLiRGCh2wIAbiYFiBwy4kRgodsCAG4mBYgcMuJEYKHbAgBuJgWIHDLiRGCh2wIAbiYFiBwy4kRgodsCAG4mBYgcMuJEYKHbAgBuJgWIHDLiRGCh2wIAbiYFiBwy4kRgodsCAG4mBYgcMuJEYKHbAgBuJgWIHDLiRGCh2wIAbiYFiBwy4kTDX4Rh5nl+Ho3w8QHDMuUgZgiBVOYoAxItzLkSUxqYijsErmxywpdpRyJFjhKb4keDRxKvIOaiGkiVYjlOyDCC9vCgcAqdkYgUABERB8EZKo8jBoFJACCwAG/2E+7u9GwF59+8RAIXea/ePLUmSfCjHvR6KHfDzo4AKBGiIQMGEQEhKaAyjBinLjDQmVV+0FdaRemxLRAdKiIbIgOSKDoEQCETUOdGAiIYYYhuA5eojbfwEwMs6/dkg4Hvsq++p7gF//wwU+1EDFQyiASINNjgkRmY1xMGVriwiq6o+a19wfoFtL6k6ExuEGuowUR3EAzBQQoCioM6BICAaGxkblYHKsHmYDYUpXDGnP5dqERD0ml3xvY3xgA+EgWI/ahBArEAKJEoqAAAKQuAsIKMa8q5cba281WodR16rNvJKHa2tWDsSJ1sJJwGGAatgLIMBBZCgPriQoxiAiJUFQAn6I2Po//u+ae8/2ORdEkbYtK6b+tTNJ/Adfzvgg2Og2I8WCiTKAiQBQZABQECDABTMBSfBZytr5w4vnn2h2z1pojV0PXTOMRIlPZ4z5mYys0hjjI0oalClDsYggwmwaVZjANy4D6j0HyoGUFBA0L50f7bVRABQumo4jYAyEO11YKDYjxrqxQuQAjMSAjIIQUDNMayC73UunVg89VK2/haEeQ6dKM+qqTMaRENensv0gsAY6BBINbIjleHJuFo3UZXTEYimUBz6CkCMSAoK6AGkHy9QBAABVEB9t+5QNwSM/S0AAERFBUAFfa+J7YAPiIFiP2poUA/IzEQKGgJRYOMgZKG3ULbnO8sny968ka5KSUUBWWZqkLACCmJHw3mnbZFqcInPGxLOl52GSRrx0JbYEJIQKgHpxueuuOnr2vAnXbGTV8a/+B72Fq/+1S/itxrwX8pAsR8tFFQ1MJMxiKLqSiAPVGroFOtnFi8c76zOM3QMSfCghS/bLlQYybDlCjk0uUMI6jwkZZFnrVa3EwPXKkUxStWoatGmqIIbc08CNACkYFRJ0W/Oaa9+QVfrUQFowx4DbljejY2BaK8TA8V+tEAAYxhRNRSswKZE6Gq+lq0cmT93YHXxVNldi6BMGAwnqkMmVKDHAoTsSllT7pHNCXusVaZKKaXzpih72VrajiZrMJI2JllJ0Go/TIMiSrjhiWIAByBXzWMVEEH7NhUBAFQREPTaiS725TrQ7PVgoNiPFoiYmsj50hU9Q0iRQNkpWucWTh9YWzrG0kmijEVITQgoPg5qfRmLNYY1jizBQpBS1EOZUzARWkIS9b7X6aws2bSb1hUVCUgRBVQBAFH7o9z3Gv4CKFxxBfcts+Jl2woKQHr1jgM+YAaK/Yih4EoPAJGxBA7ydrZ2qbVwpru+SJIRFMgBwHuvQBEaIwhZqRxpVLNkIvKJKqMQQAwQBzUKbMmIatHr+rwHoQQKbAAJnHgfXGStDx6AEAUQAUg3IzVX6RhBVVVElJHYGABQEVVF3Ijo4sABdV0YKPajhSp45yLLsbVa9Nz6Ynv+zPriOZ+1I9YQPIIP6kXRGAQyCtDzBXmpsSFEgJjUKjBhihSDsgIbMk6x9GXwJagDdYCejfHea8iAIXhPyIR9a7kZdMUNrSpo364iIIAAKBEqqIoCaP+PUFWVBkb2OjBQ7EcLREkiYCrV59nKyfWLR7srZ4r2eQ4dywEkCAQFEKaA3E8OBlHGUGAZs6DEiAhqFCJGKwIIyAAsghrQiJKI5nmGEaZIQAbKkPsQmCMIVgURGYkIEBEBVFVUVII3hg0TsSFV0SAhhBAAAMnoxvR2MCy+HgwU+9ECITAXKJ2QLa0uHVxdPBy6y+DWE8qMSlAQRQUEMkIsikjqg0f0OaGNgTnCwCBGg5FApEKgqIISWEWKjmuvcW0YEUUQiJAiUWCbEEUEBgRUQRWCQggKqAhEhMZGIj7LPZEyExMCMSGKiKoAIhKK/OyzG/BfzkCxHy0QRCUX18qzxW73gneLhrrGFqwORPrjU0VUYEVWREAVYK/eKypHoLyRlrzxyXoEQTGIFiUqnHR7rjlcS0xN0QRFkMgQcgSo4BwED8TADISAgKqoCioQRCUQgDGGEMCVBYCwIRtFqFo654NjtjgwsR88A8V+tEBQBO9DXpYtVywjrEe2jNRBWUIAUqR+MIaNKisSIqlGIhKCBUiUYlAGYAVWAIUSVAAZIUWoKFSDpEUeZSW02p31TrbSamd5riK+9KULCkKkzGoMVdK40ahXK5VqrdaoVaw1iEAIIqpKgAjA3ouKVwUifm9P84C/bwaK/WihgEgRkSFUgJ7hTsLeiivzXLw1YFWNBxIhAQY0zDGpqLNSpKhNwFSJBFkRFUS1UBBQAmgADnW6Zn5p5eLzL5yfl4XlzvJq69Li0vJyy+VQlg5NaWIHGAjBWm42a9MzE+Pjo1OTY3Oz48PDlVo1HRsdHh6uEsc++F6vLIoeMdRq1SRJytJ92G/erwQDxX7UsABD1miatJO4VmaA4FFKDI6EiUj6zlxFCKpIbFOjgD6CMkUZRVMRZBVSBEUHkIF6VCSusK8sXFx77fWTT/zw1OKa9RKhiYkj7xjVRnHV2iqRYwPGsmH0Ti9caC3Mt948eiqyWK9FE5Oje2/adccdOycmRgGgyIv19RYRIlpjkkHi0/VhoNiPGGJADABx1EvsmJNYpNAA/cx9AiUABvAqqgFICQxDDEIYKiA1wCoAKyOIAhYEokBBAYURsdasDY+JC5nzLmggFDKAZIIPoiTBCiCQYTVExliyFgyjsWAN+CCLC2vd7sFWa/XBB++ZmZmo1ernL1xYXVkuigIBqrV0MI+9DgwU+9FClYqSjUnJDFlTJ7UgBAJMLIIiAoAIjNpP2lcCQjAKqmoBIsFYkAQ2IqQCTjdymiwh24ijmAAdGyyLrMyL0hcitsjVZN04SaLYxhozkRpiiqwxxiCzEguzEmvwcObMPOJre/Zs371768T46Nra6htvHD59+tSnP/MpYy6XDXu34xjftTkwyL8MA8V+tFBE5wEIIxNHaR3VigcFZDKCGEQDoCKBMioRMioCoQA61MBIlrWfNigqwgJG+ukPGBEaG5Ex4spWKKPgqHDgPQe1ZQHEJs7jtJp4H/uy4ouKhFrwcRzbNLVMzAaiiJPE9rrrx4+f9UFsFN+8b2ZsbPStt46ePn3izjvvHJ8Y60dxAUBVAPRyGgbo1Yq9Km95wC/IQLEfNO9VrfKa5TGXqzcooCoKJooYCCVpDpOJtWABYgIhFkEvFJBRDauxHCOCEghrl4ssDkmCoqQKIkGEVBIAQGHS1EpSSaJ6iiSrJHa4PsJccxI5b4JwECnKTpkvZ10tMkWMk7SRJJVGsz4+MTI5PWJsrGCYkzQ11Wqc9/DAgWNxzFt3bLnL7T908OD3v//k1772G9VqgqQhuCAFgDITo1FA3ahMQ5vrBvoVMAaL4H9hBor90Ln2kkWNK8oI4AVdmaY1kDo5Ee8ADZh+yTWUEECDBg+qouIBYhODqTgxQQgUUAnRGEsIDGCCGO9jFFev8m989VPIw1E6UquP14emnOe1tc7K6sqlhfMXL51fXl5vrZXra8Xa+vpa1ml3Vi5cPLmjPXfbHbfU6zVj40qlyYSioSzckaPHJ2cae27a2+n0/t2f/Ke777p/1+4t1Vqi4H1QZiBGBXEuGI43zKzC5l1MB5b2l2Cg2A+a90oF6q9gu+ZC1c1tLV0wRmNSZAKksgyaewYVAC9BqZ86qIQE6JkJSkIwsa1FXI+jEREOQUQ8aCDAfiKEBICg4l2znv76Vz4bDc8Rp0wxYeKcuiAi6oJrd7N2q8h7cODAsW9849unTl8sCnGhfPt4O4p19549U5PTaVxN0lSlLAufZ77Vyhr18YmJaQQ6fPjI8EgjTRMiNsaIBAkKCIR8Pd7pXw0Giv3Q0Ct1RPWqR+olkCoYwMgqkgCrGkJRZCAFBAGvqESCJEz9zCS2VGGoMFQRGEEVPWAgAlCVIM6Xvihc3tWgY8OpbRggNUZNhKAGjAETAZJ4KB25nMfHR4qi95NnXzn65rHV9Xavl507f9pGbE1Uqw5bjgRRjIvjqNXKesOuUR/ZsnXba68duOWWfTMzkwDIZEIIIsBM+L6VjAfW9RdmoNjrw3tfmptVza56FoENqhRl0VMyIRCbCicqLhdRNqTgQTwxMAeigCChFCFjqUZaUR8DMKsiWICg3jtX5lm+sryytr7earVFsZ7GvHBGiTmK0EZKbNOU2CInaOtsqtY09906Obvldx58ZP/zz7/0ox8/ffDQkZWVS2WZeyeT41u0QUxJs5laG06fvBgZu2Vu+s799/wv/9P/9MUvflEVnBdjGICJiJlFVOUd1d70qi8YLCH4+Rko9jrw/pVB8Z0bCsBM/S4ADKZ0YMQgxgLBhwJIhAKQIDiBkihWDaQUm0q1MmJtnWwCQTU473ze7XQ7rW633W6tLyxcWl1dDsFXazU/PRrbGiLlvWJ5bS2AVmpVRWMrI5yOIFWnpnclFRoeih5/fP/DD9+xfefEf/8//KujR091W3Di7bfvuuPhqcnIWmMNnzp1bHHhWKOW3Lx3+3BzqNPJ1lZb3U5uDCoRk2VCABARvOKBw6vHFAPF/qIMFPtB83MW8t0wQargg1iOkmqzCLECFaULwTERErvgvHgBUUAQZ0AAII4jW6lWqhWMjKoXX7qs22m3VpaW1lZWet1O3u222mt51iUiTGMKuYXIGmsNWVOL08REUVaGArSTr2dFq1EbYmDVCkcYRO+9586777r9xPGzItJut5eWVvbtZQSzvLz21rETp0+/cffdu+IImE0SJ4uLy0uLqzOz48QoXrwPiIBImydIV0ViByWOfxkGiv1AufqivBLS6S8chyvf4arKSajCZAySy9Y6hCYACWpsDRgULz5s7BiCMBETRpbjmBnEd1ZbrVaR9fJet9NqrS6tdlpt50oNYklsNQaA1GJEAr4I4BXUIBiVkGfiBAyXeZlnigxRYkFYIIj42dmx22/f+4Mnn1241FbxF85fXFlpRdaeOXvq3LkL5y9carW7ABDHqIprq+utVmdu62R/6ioiAGqt3YzuvPv9GfCLMVDs9eGKdK+SK23mFaBesbGkgqvL7cVzRw499Z3b5rQSRRyK0ve8BkEFQmKjgQXQmogAVMoyW1+dP73SWl1dX3au9N67wpe5C6UHUQIkQEJFUAsl+sx3SyAUQkUuOu0sy21al5QZ0vHRkWqaGMIggUCS2JCxd99z9/47Xnly6bngzenT555/7qUoipaWL66srcRxqhplOTjnV9daChjHMagWZUBEYyyAquq1cemrfeWXvw8Gxj8XA8V+MFxxAm/+pl+OsF95RQCQEBkQXemTxIqiDyoCIeiLLxw6dvjg2bdfcosv3zZ3VxSTFqEoskI8GFJUUEYwCFzk3kkryzHAeidfXOuuly7X/joBQQZkJkBQUQ1eJZAhgzaUnSJzQETGAtluXgaviHHmsmhkfG52Z8wVddqfe0ZRUpZhdmZu587dz/zk9VK51WofPnK0kqZIQVSGR4eTtNrLZH6+FXwYHh5pNodEQACYkQhVVSTgO3OON8cUg4jsL8hAsR8MutmB6nJ9MwW4HORAVEVAQqSgvl9SSRWyzJ09c/GJv/3x0UOvFesn79kdR5ZVS9GCjGDo2yUMAVAIlPNeKb4bhD1470tAbxhUQIVURQRBFAU3V6dLZCi2KKEoi54iGpugiYIPTLF3Li9dhdMkaRImoBFRFARVAImsjeMoMRzlEgA0+CAi1pAI2ojjhEPwly4tpWnSqNeSJFZFYgIIIj9lsrpZMnVgXH8RBor9QHlHvvuGYUFi7wRVDHMcR0WBRODKsLSw+p//t7964dlXi+5KM4GRoaFet8VRz4BHDIhgo7gUdaWQEimDMqiCekQPWgIGVAIl0P7tAUERAVFUVAGEGYjElV1ULwrOBXWlKqtS0etJVI+jhuEqYoxgJLACIgITUT8lwlofXISUJGkUxUEK0VCvN5qNRDU7e/a0sWZoqFGvWy8SvGOD/drLzrl3ShPlynvyfp1qB7wXA8V+QOCV2vlXsvEuO0uZgFTAKwBgt1OeOz9/8ODRZ5994ciho0Unl6KnnG2ZmUqTwOAg5AgusrEPPggC8IbPaKMyeEBwiAWqqiQQLIgBoY1udSKqAUEJQ2TBRpIXqzYyolKW4jwbW/HgeqWp1HY0hqaQaioMQEAsQctSgQCAAAiBLEfWRsGrc45YqpXkpj27RkfHV1fbbx47OjU5NjJajVLSXHwQCGotEV098B0Mgv9LGSj2AwGxL84NS7I5qyUFBCDnJIopBCxy6OXFj5965blnX3rjjaNLy6sRQbez7HuX6uxiO2c5WPUavJKSNUXmRfqpwgxKCEQKqoogCIKAIAYkArGo/U5WohpUFQHIkI3JRtAreoYiDRI0eDHiMQQXoD48MtEcmhS1ZSnEYGJWkbz0SOSD5EWRF0UUJ0mcOu+w1EqV4yTat29PvV6/ePHC6urSJx/9RL3eAAVjSIR8KL0vFRivdLYUuCYwS4MYzy/KQLEfENcGbwA2HcIE2l/IAoQQPBw5fPL7Tzx94uTZ9bWeiml31rrr8yN1v2WukUQ+lF203hgWF5wPhETEKv3SpLBZcZQQCJURENSocn8tHgAqBAUBRSQkRiIAFCQN4IMKABCh8+J9SGtpvTnMUeoCBRVV4P7yGgIgLFzR7fWKsiS1xtjIxswAqoQwOTkuEi5ePA8ge/fdFMVJWQS2SAyoIBqw3xVEr877v3olwGAi+4vxXmvBBvy9gVe+FEH74RwkJAlYlmF1df1HP3rhuedebq1nadoUMUtLyzZye2+afPCBvcNDLL5DEKxhVHC5M2QsGUJEhH5WAvZH2mpQLYoFNaAG+kZ4YwSOCoAExhCiqgYiCOKDBCQiY0NAUa7Whir1phIpERpSRBcECWxsbcztbrvVXvfB52VBTJVqNYoi8SGNk7GxkXa7dfzE2zYy+/buSZKoKL0EAVTDSPQ+S+o24s8/V6/aAVczsLEfDBv+2c0rtX+BKvRLR3iR9mrn1deO/d0Tzz7/3IEoqnW7bmH+YpYV27dt+fpvfe7OW+rTw1lSHEk8s+TiHAgyRcyRKpIqiGK/1ysxBkIgkn7XObOxvqDviFVRDQpCjHFigcQFh4ylD0EQkEQjxLhWHR4b355WhiQEtoQcOeeLMjexsZEVlRMnT5w5e5oIlZCIVNSVjkjvvffuWi157rknnnzyyW1zW/bctN1YVhAfSoAyii0AiGgIgijv7K/Vf5sABqPiX4iBYj8I+sFHRCSAvmxR9Upw9tLF1b/6y7958cXXjp84WxZoTLW93nNOZ6a3/uEffOYf/vYclkcXzj7r3XIcadnOQ1kaW0/jWkDjQ0D0SIKEwCgBKVhVFbAEQtQfiurmS/CAHsBRhCY1SC6AMpF4UjAqkfdRmo5PTO1qTuzCqCYqAIGYUUBDQDYK2mp3Drz+6vETx8lyrT5ERL0ss4xT01MPP3zPW28e/8nTzy0uzP/BP/zdWi0CpBC8D6WCYN/Aq7z/0HdQO+YXZjAq/qXBax9clSrRj6kAQD+HCQgAFUkAlYEtvPLaGz955pWTpy4GIUBYXp4vXXd2buzzn//kJx+9q1nxWi6BW0sjBFBEYhOxtS54F7xoQADE/u2AABGo72bqHxYABCAoegWvGBRDPyZrmJmIQKmfvUEsimVATpr14dm4Ok62okiuLJx3AGKtBcQsL1bXWmfPXVxaWpWAlUoNEAG01qjOzE4ODdsXXnzm3PkzU9OTd9+zP4iqKhESERGpQvASfAC8qmrMFS8UDNxOvwQDxf7S4Ht/9Xs1iqIoCoAiKAJSEAgIvcK9dfLSs88fOnVmuZcDcVK6Ms9X5+Yaj37iti998b6bdjV951xoXahonhqjQsARRYkwOSmDloCCBCIgQgqsSEIiHJQdsMd+wgQpkAIJcABWZGAig2QRLSBJYBAEAQQ1ka2NpiNznI4KJYCoErwvFcRag8BFIRcuLJ87t1QUyKbCJhUAMjAy1ty5Z5sLvQMHXynK3k17d27fsSUEFRHtjy6IVSAEFUFQuma+iu9YajfgF2AwKv4pvOOSulqZ/QXpcCXcqpdr4iOogAQEVLCqqAhsoSiCGnP20vL/7z9+99XXTysPMYSi6LVba6Oj5te+fN9Xf/1Te3ZPRHq2vXLcFsuJCerFixGKRcVLwFgRPVKkBRYewCOjVeKgXtABlySqGhEwESuIqNcAyMhoImsI0AApoHeOIXgFwDipN5KRSTsyJ8mI92hjiCOTlyUIECUiKBK9dezc+XPr9cZMvTHlPKuoTXRieui2O266cOncwuLFsfHmzbfsYSYiUUAVBUBQCoIIhqifmolXvaV4raUd8AswUOxP4f0vqU1P0qZ6YXMTAAAQ2bD4oBrImKDqPHrRp374yo+ffu31199eXXOt1V5wmWW3Z/eW3/v6o489eufunU2E85CdxOKcKZeM5qWgYopRBRCCFM4Vzgf1AUKUpqOWG64IvawQViAPrOK8gsX+kFz7fi8lRttfC6RBxat4AlVABRYwaWN0fOtNUBn2WEUGCYX3pbUWyJR5WF7NDr5x8odPvjB/sVOrTdioZjixhu+999ZPfOKuyenKf/8//pmN6DOffezXfu2LUWyuymQCAOq/Le81fx1Y11+egWJ/Ju8VfsCrCiBusJnT0+/1ZowPQcAz2aznTRwdPHjmm3/x7KFDb/d6TkWkbJXZaq0Z/e++/ju/8w8+0RhGgy0pFlYWD4mbtyZDUoa0DDb3UHh1wSjWOTJgbGqHxke32qi+eH4+Ly6BMqAVZRcyREJEUBRFDEiC1lBiKDYC4ERLhRDQCMYhxMBDjZFtw1PbRSMv6IOQInFkbaxAhYNXXj36//rn/8tbx84ZU0vihBBVvbF0//23b5kbf/mVFw8fPvSHf/gbn/vsYzMzs3iNDAcBmw+KgWJ/Ju+3qhOvfYAbpgNVAbwI9NPzCIDh0qXVl144cur4fNFDDDa4lstWJ0bT++65+b679o4MVYE64Hvg1nudS0ZyZgxMAYwLlAfIHQEllXQoSarWpJVkuDYyDRTxcg9gCcASoIqgBgC6nFyBAgRokSIm5gDgkIICuIDKVZEkSkYbQ9NsUggMQfrjex8AHbDB9bX2668fPXrkeKftx8fH4jgiwqLIbr1l37at05fmL/zgBz8YGW7euX//9PQ0k9Hgr+OH8qvLQLE/hfeMPei1z16enl0JLYqq994YQ0RBNUg49MbJV148sr7SM5iQhVZ3iTW/bd++3/rq57ZvGVXN0LW1WHPdRXFtQQjIouTVFGo9WDVJnI7Wh6aq1aE0rUVJDdOKL0sh03fzABIKG7RylUcWAQyiJbAMTEHVAakClY4Aqxg1qkOzjeY0BEQF0EBIAOScU1UMcuLE+ddePaxioyi2No4ii0CI/Ogn7o0svH7glVdeef5rX/3M7MxMGqcEGAbj3OvCQLE/hZ9eMyFcK9Qrg+R+ICcAMNGli2uvvHLsm3/941On5kPJZZ4j+lB0v/T5T3z1y49+6uHb6w2PtB66l9za6c76qcSgC5VMvAAFaGBlvDkyauOxSn22ko4zx2QtYpDecrm6mnVbgt6gIIAqW44deRVRUVS1SDFrwhCjEDoHLiCVYAqqKDZGJ28a33Z70phxmaAJoOiDsDFpzQaHJ08u/eVfPPnSC0cM1SuNShQlrsyHR5qPfuKRqenan/67f/H6gVdvv2XX7/3ub26bnQ0Sep08innQd+c6MFDsT+fqa/A9/SX6rgeAiEysyJ2ePv/8m//x3//V/KVucIkGn/farfWFe+7e+k/+6A9vu3mGqA2J17DSWTndWz6toRs8CY2AjYytVKsTaWOLTcZNNEpmHKGGCoACfqW73lq4cLqbrVDkDAr4EFQAkBkDgIoQijVQsRhZMeQFSmEtRQtgTZucTk5su21s7mbluuSqKsyGbCRARaHtlvvJMwf/6q+e6HV1dGxcBcXr1OzI7Xfs+dKX7vvud7/9wx99b8+urb/39d/YtWNbZBmUxdgA/r2LMw/4e2Wg2J/CO+R69TPvMwTUjedEFRHPn118+cWj58+uBB9p8KXvCfTiFB566N7Zmam4mqApwa2GYrnI1vIyZ2KkZpI2TVI3SSNuTJjqJFFTteqlDhAzAGmJQLnP1rvLHnrWlKihH/lVwI218eoRxBiIrFj2AKVo6DuUPdqoMlwf35IOT1Fc8yUS968BBkbv4eKl9vf/7iff+9sfdztloz5WqTRA0Ub44IP7H3nk9tWV5ZdefG7b1qnPffbRBx7YX6na1aXVtJKk1Yr4gf/3ejBQ7E8Br/iTruGnVDPdWEQOgMHryeMXj75xxpUGlFxR5EULuZyeGbrn3lsaIxU0whall3XWl/IyEzZxVI3iZlKbMnHDxFVOhyBqilZCiJ1GqKQIpGBQSym6+ZrBzGIBEgARCUlZ+7WiIAAGY8BaZfReXFARjAVtwDSujIzP7ohqQwImCDD1lwhgCDC/0H75lSN/870fvfrqG8bE1WqD0CDh1i3T+/ffMjLS+Pa3v7O0dPHXvvzpT37yoZmZcVDwLoSgADpYhHN9GCj2/cCNoOs7Yv3XxnU21s0RAYAE6PtoVZiZzpxe+vGPXrtwdjWNhnpZr9trZfny9PTwF770yG13bqsNW5W2K9tK2i4DpUPNxmQlbsaNWbQjCDGg8YChjJRSRauMElRUWZ13rV6+4qTNJhPNRYE5juI4eA4YEIBQjPEmUuUyqAskgsZp6rGC0ejQxM6RmR1AlcIHUQNIhAQAp0+vfOMv/+77P/jJyRPnQ6BGfYiIsyzbMjfz+OOPtNvdf/Mn3zn4+gsPP3T37/7OV3fu2OadJ4Wx0VEA8IX0W+oN+KAZKPaXBxFFRFWtsSIIEFSBkJ2D7mr59A9f/fGTL/mCDYIG71ynWqfb9u/87a9/aXbHuNNCwQMjUDK+7WYGZIwQqgCN4GPEGNl48V4B0SAToIIIUmGNW1m9uLZyLk0hJqQSMPR7vdZyEZHCELHFNOIoyr3rBg3IEZhalqchHq2P7JrZdpti7AIKEFmjQqXDXrf7ne888cd//O8Xl9Yb9bFGYyiycbWSNhr1L335c1NTI//2T//Hg2+88JnPPPSHf/AP9uzeZgwHD6hICkFEdTCDvU4MFPtLspE6q+C9L51XQSJGRFAV7948fP7EsflQgmEj4vKsU5a97btnb75lz/BoFVlEHYCAEkCiYAUIICZNQSuCFtCgsoJqv4QbCIAglUSFSseVLQk5aCBEQquKIiTATCYUXcFgLbHxbMBGiQ9SOOjm4KDaHJ4bn9odJEm4KhypMCgRYqcTnn/x8NM/fqHTyaIojZOEmQF1+465hx56YMvW6eef/8H62uKD99/96KMPbd++RdTnecHEBq33jgxbNi74QSbTdWCg2F8GVVUFZkQkUOon6RrDiCgBsl5x+ODJE2/PB49sg/d5UbQR/U17dt2x//ZGM1XyoiViQGWAigKLGlGLYFGtEvfnz0KqKIClKiB4Q6VhF7JWma2LdyhAYBk5KIhEihESqiqRGoOA4iDExgCh8+qwktamh8d2DI9tBzvcy4RiJo7E0aWFtYOvvf297z75+sE3VamSVquVKiANNYfuu/+2Bx7ce/jwkZdffnZmZvyLX3z8rv03Nxp1RK/9KsQEyIQbSwoHcr0eDBT7y6CqImKNJTLMFIIyGUMMiN1OefTIhZdefPP06SUA9qHXy1p5uT421njooTvvv+/WShqLdoCcogIY1FglVeCN1bOkCAgqogEoEImCV3GkpTHOoOtl89n6IvpgNDZqeKNYkhW1AMFaZKbIkCiUgl5sUJuTiYa2Tm25Z3h6b6WxNdc0K9WgRTInTpz98//83eeefunE8bNFCcPD41EUq4aZ6YnHH398crL6/e//5Qsvvjg0FP/B7//mAw/tjwxJCMaANVZVAYENeh98GcgMqklcDwaK/WVAREIGIAJmZlA1bCSAKizOt3745Eunzyw4T2yjdm+hl60GyXbuuvmWm7ePj6Z5IRCAqF9BxoImoPHlNS0KAVFFgqhjBCYV8QClpcJAjr5XthddtxWjscCm31TZghgKoq7opjEwIzKASQJXcjGFWonrQxM3j87cGtdmgtbFm3piOxmcOHnhP/zHP/+Lv/hOp1tU0sb4xFhk4ziJJyZG77n3rh07Jr/1rT/78Y9/uG/vrn/yf/6nj37iHkKvoCK+LIWYLBsFKEMpKkqgwAO9XgcGiv1lQERio4oKoLIRUXFOJeDKSuvw4Tc73YxtBQhKV5QuV/ATk6P1Rt17UFUCRolAEcCAcn9EiQCAiqCIAiD9zhcEG6UrGAV9oVnHdzvoQ4IRA5h+mQdDAiq+DNC1NjCKINi4onG1KBhDHMejtaEtHA+LJsEzARdZeeFM+0c/ePHb33qy9Dw6PmNNrMhseGpq4nOf+/TM7MSPfvg3r7327O237/ra175y9923OFc4VzSbdSLbabfBi6lEqlK4zBhjjFUZCPZ6MFDsLwMCEfXbogZVAqV+IEgVOu3uwsJiltsoSgEkSAgiomFouJYkqfdqmUgjDQQAoKxKG+kYKCgBSDYWwSuhMiqSIAGSQiizvLXquh0OYDHifmcBEmAFdUoZcs9aIFCvgBQr1ZQitvVKc6Y+OmfTpkKCaosivPT8ib/+5g+efeHVXg+StClgs9IbkIfuv+dzn/vkyOjwG2+8/vzzT+3es+W3f/tr999/d6Mel2VhIyYiVDQcAwIAiWxk/yMOArLXiYFif0EUNjroAIioBFAVJgYAZijLsL7ezvIsKATwKiEIimIQqVTiKDIqypZQWYVAAbSvVgEUhAAQQEHRIjACkjKGAML9zdDLOyurrpdZZANEgIgCqAKFQFewzVHGxhhEUgNkS4nRDCWVscbItrQ+HjAGtXkeXn/tre9889knn3jh7IVLzfGxJK17DAZh15a5u+7ePzIy/MYbB3/yk6eM0c9//rFPPnb/5Pio9wUbiCjy3oOQtVG/kqMCMDNiv4cdDRR7HRgo9v149wpYvDzXVAAR0Q2zgswgAkzQ67aPHz8tAGQhYOmcC4FFWBTixNQqJrICqiBEgUABNxbFlYBuQ65gBIiAFBQFVRE9AzEolq3O8sV5KPOqseQFFZlJORR+NQ9rATu1OoGqMdU0Gs6h4V0zbWyrj21vjm0LOLSyUpw7ff7QweN/9Y3vHzl0jjCeGN2qzElcG5po7tm79Z7b9nWWV/7Nv/6TY28dGh2r/pN/8o8+89kHq9XI+26QQGhBJQRRJWtMvz44IpOR/r0Lr7QVGvABMlDs+6GA/dU5fNWi9o2VOoiCKER6uUaaK4EsrK92jx09LcFYmwiw97kIEFkSJrBRFEWWXeFBgJH7ZdVAFVAQUYFVIQQE6lciRwQh9agBVYLLu+3VLGslSIYSAYcEJiIPuSuWg3SiCkWVmvhU03FKJ33Pmmi8OXFrbXSrSYbeOHrhpZeO/uCJnzzz9MtFB0aGZqyNFTGqJzfdumvPvu17b54+fODV7/zV39Qq9rOfe/Dxxx954MHbjPXO5SI+iqz34gpXrdaJTK9bAGoUR0TkvDIzG5bB8tjrwkCx74kC9Evs9gvE8GYNFFBUQFEAAB/EAyBRJGr6pU7zolxe7hGkohbRqKiIGDaupLLQslBN0VoTXEBWJATVsvQqwGyJKIAW3jEEJCUCAEfk0Qpi6K6vtdoL1YqNyIIiGcOEUQp51vHaSipmZHQidzHX5zCd7Gl9vtsem95Sbc4B1Nvr+nffe/7f/ru/nL+0osKN5kjcSEHEh3zX7q2/81ufixJ45tkffvOv/vP2LbO/9uUvPPDAvTMzkyABBC3HHpiAY2sIgoiIeBv1J+HSnxGggoTBJPY6MVDs+4C6UcweCbRfcbL/XTa+oyAKIAKJioqABCgL6XZKVSMBgMHaiBB7WQ5KhNY5KEq1BlRDEL9RqhSDCkhQAiAyUYwCiKiEygooHtGr5GW2JqGwEbGCBo0SG0XkpJO5tok5rVQQIpGa0HgmI04q6dBIpTl3aaH35ltvHzjw1t8+8eLF86sCtlppRGnFhXJ4uLFt666HH7mryJZfeO7FF196Znpy6Gtf/ezDD9+3ZcucMVwUGXOECCLgvTBrP30aQDabwfbLW9GVhwM+eAaKfS8ul+dE3ShjtjGZvXxRKoCyQVVUFVRRZe8hy32WFaK40TcVCZAlKCEvzC+11tdGhiedC4ZRwGsIAApEvDEtBAHvfIGWCEFUGFhDQPJltt5ZvUToQL1C4AijBFWztdWLXqUxPGVNmhVRZWi3mK3tPM5dVKuPPf3M4R899drRY2ffevtc4eKx8WlAA4DNoeaOHbN37r9lenrk3Nk3v/s3PyyLzt7d2379179w3313VaqpqhRF0a+M3i+PLtKvwnz16V95s67PZzKgz0Cx78UVh/BPy+Mh4n58BxHYAPY9MOIIYyUWwLJ0RNxoDve6Ky+/euDkyUd27ZwiIiRAZNW++0oAQz8xUYKIeoMAqBogBCRgQPGul/fWGQNCsAbTFEJYX2sv9cr1WqOZpGNEqYlrlaE9b58qT51burTYXVs78L2//fHbJ+aJK2TTWr3JRGk1HZ+YuOfeO3fv2tLtrr524IU3Dr24ZW7skUc+/+AD9+zYsSWI61eNAQBjTAghhCAi/Qo4IoN0/w+fgWLfk35Z8J/RY6L/vIoigzEAAsZQFJvcKSH2V7FFNiairMfnzl88fPjUvn37ZmZqCCi6UdkfFJx3EDwxG2Nq1TRArqrAKE7QsqqXkBE4Y5EBk4jYhG7WzsuWiYnjGuCQjYaTyvjiYnjuuaOH35o/fXbp7bdPL690GkNTUVJ3AYyJ4iSem5u57fZb77vvrksXT3/ve98+cfzIJx+554/+6PenZyaq1dj5IoSgqsYYay0zl2UZQrhub/qAn4eBYn9+rkp230hyQNV++3MkAgWIYq5Wk7VWFzAi5mq1zuS73VUiUxb5T555rlqLvvjFx2ZmRnxQUSEUExkGLZxzZVE6l8QM6AgRkYMoiOSdte76ovdZHEtkKI6pLLt52bYJJtU6UpWj8aQ6DVh/+tnnv/XtZ85dbGcllo6aQzNJpYkccWTGJiYffPDBrdu2VmuVl1969oknvi1SPvDgPf/gd39jbm7KRmQNGht77733sJk4rapEhP2WeCHgoI7TR4CBYt+fa7wplzMELlc8xY1OywAiAgggUKtVt26fOXfxsIiLqFJJa8whSBmkLIvw3AuvLiwuLCws/s7Xv7pl65i1TKguSBBPFLMhBAhSIigxMZGAuKy1unBubeU8a5ZEplaxIbhOd9VDWanXKrXRKNpp7O6lVT1w8O2/+OaL5y6UAsNxEptI4yQFY+uN5o6dOx559B5j0+PHjx87drjTWfnUpx68Y/+ufTft2Do3ay0wq4h3LqiiqqrqZd1udtDRK336BnyoDBT7U6Brq0/A1ZuqIAIAyESqGgRAYXikceute197/e2iQGOQCCuVSqUy3VqPFhfLXi9/880z8/N/fnF+6fNf+OTNN+/ZumXKRArBWsuGQAB6XbGU9BewGZRed7Us1g37ZqNSr1JkoNVqu+CSylBaHbbxuE3mzl3QF15663t/++ybJ9tZGUdxJYoqKDqzde7Tn31kemY6L/zBQy8feuOQsTwzPf6lL3/5c599oNGoGUZX5iGUSZyKWu89IhoT921pfxILG0sLB3L9qDBQ7M/DVW2dLjdn7XtRkQhJAqgqAlZr8Zat45VKBGjIIBEwG2MsghRFN0hZ5N1Ll1Z/8INnell54vjFW265adv28UajGSfGGEIg75EiI0WhLqdQtFoLIeRJzNVKDJh3e1kv6zEn1dpYWhnjaGxlTV5+7e0XXzl26txagFTJcJQMj45NTE7sveWmrdtmRf35k6dfe/0Akt9/620PP3zv3XffPj6e5nlwTgnBhxAkECIRARAz9yXaj+X0h8eIOBgSf0QYKPb9uLqAOFybtKiwaXSIiMiobCyxSSs8OVUfGqoiqQ9gLbFhEV+v1wGnsrxTFGUc25WV3t9978cvPn9gbsvMQw/df8fttzWa9SSNIxvVq7YaB5evuWw9icrO6nlrOkkViaHX7a6sLIpAtTaWVifT6qTyyNsnzv/ox6+8dXxJKI2ryVh9ZHxicufOnfvv2j8y1vy773/35VdfWF9fveWWvb/1W1/Zt2/r2FidyYgogiCqYQKwEoIXAUTmyDnnve/7h621l/3D/dns9f8YBryD6/Ex5Hn+QR/iA0BxQ5z9tIGNSI9uhGoFSVVEARWQIEI0/bjl+lr+/PNvffvbT509t8ycRFHcz5UvimxtdWVtfa3VXu+0W0VRGMYojqrVtFZJkiS21gIAQ55yhtJOouyB+7d++Ut3jw6bNHYGO0W2ut5aS6La8NiuKN3W7aVvHL30V99+/uUD5wofVxsTe2/Z/4lH763Wqmtr3cNH3jh69FC3t75j59bHHn/41tt2TkxMpKk1rBKESECkvxgeVLE/8kUE3LCrqoqI/Rnsh/khfIRJkuRDOe7Axr4fl23su81sf4tUQTbqx6ghBAVCqNWTu+6+yUbJ888ffOWVgwoSxfX19fX1tba1UaMxkueh0Ug3BtYSOq328vwCIBAiEibsEmyjrIyN6tSv3zI6Gg03EwK3trLSanXjdCitjsb1ufml5MVnjz/x5CvrPfrkp780s2Xn6MRcVvjnX3r23LlT6611RPnkYw8/9PB9szNjU1NDzOS8AyhEEUlQN7to9ptTK8HGIl+AjVTp/vZArh85Bor9KeC7wrF67UPs7wWqqoKISGgMNJv21lvnEGVtbeXo0bdWVxbL0hdFECFVtDaOIwYACSH4wGSw1uxPGFUlorzGZFCmp2jr3Gi9Hom6TrfTycpKfaw2NBZHzfW2HD16/uTp1YnJPfu37Rmbme0V7uSZ48dPnDh37kStluzfv2fr1qn7H7hv956dSYIEkuWZsYQIoAHfeSfaXDiHiio6mK5+tBko9v1558Wr17QC6Deo2rRLqtI3TsSYphRHqTHbV1ZWFhbOnTp9viyCd5TnQYEraY3YgKIgIVCaxGkSq4YQvHcFK9UpHxsa3bOnPj5ejWNst7qra2ugdnhiS1wdRk0WFvPl5Zy4sXff3vHZLQvryydOHj909Mj84sU9u+fuv+/u+++7a+u2qTiOERFVnC9DKJIkBVAJV5eKuLwgCTe7WP+MpJEBHzqDeez78s5OHZudMvobtFHxEERBVRQENpfeETAoOI/drjtzZvGNw2+//NLrx0+cV4280+WVVpF7ayMVCc5ZQ8zqytL7ElEqpleFiw8/sPOLX7xr722VKC3X1rquhKGRqWpzwjkgquVF7cypcOJk+43Dp4+dPOkxn56buP3OW/fdsnvb3FgSx8w2jiNEYQKRUBY9Y5kJ+1GajY7pigj9WlOMiv0SGP1zvO7v9A3JhzWPHSj2fcENn9PluI4AiG6OJxENYn+FK4h6Ea8qgH0rRcEpszUmKkvo9qTTcafPLhw5fPzihYW1tfULFxbyvMh7ea/bY9bIIqg3hippnJr17eP5Q/dte+CBXVGlnZUtGzWSZERpKC/jJB2Oa6NvvnXxP/zb7x48dGbL1psee/zTDzx8+/hUzSQo6steSUA2snFss6ynEohAQZI4RlQR2awEjpuDYQRgUAIEhYFifwEGiv2ogaiXMyjk8uI7vZzt1O+t3PfRYL/iYd/Shn5JcAR2XotCgxiAuJdJq9V1Lif07XaWF6HX9d12CeolFAAuSWyjUTNhIZW3R5vF8JA4aKHBtDrKZkhwLKls8cGev7TyF3/9t+fPt+695xO79+yamNo2NT1crYMLhZOMgzUUMbMCdNqtKDbWGlcW3rs0iRFRpL8OaWOZvl6Wbr9zzkCxPzcDX/FHGXxXn0XUzZoxioikm/kFCiAIwJZUnLoAgABBRBExihRRQ3CNoXTUJhLIlaCh7HXXkGRoqDY3OxXBZLHUkfKsSpvBsa0gkQAYWyFunD55/qVXXj9/YeGW2+5+7DOPzM5OhoA+aF44xQwwZzag4p0ioCVjyDKSsg3eBx+YeKOB+5XzekdboQEfdQaK/WXYuO61H70EEEBSwA1XFaIQgaJGMRljSqe9rGi1u+fOzl+6tHDp0jzbZHR0NE0iw4RYrq8uRBHPzk6Ojds4aQdZBW0Z69K4IpwGJCRrbfXSxfVnnjnw6sGDu/bd9Pkvfa4+lAoGY03pxBU+rnqGIM6VhQ8O0iRJ4lRBxCmTqaS1IusBBWMMKF32qaH2TevAQXzDMBgVX8PlNH8AgA3HjG4ucL/azHK/6Y5qv7CwEgpsFJTxqgFVmQmBXQARQIrKEjodV5Ze1K+v9dbXW71uK+u1VDJfrjYaydzc+PZt063VE77zFmuHWWuNMYqHkspI0NrBg0vf+e5r7a7fs2/fpz77qdmtM4bJByfBEDIbZ0zXSw98lSBBNCgYvCMiJFQNQcRGpp9zuJlsuVEg+arhgb7L23Y9+Sl1Z65egKHv2vxwGMxjPxD60068vLURRdXL2QIbT+BVD/SyN5U2x40becXXxmevVE65XB/8yiH6HigUufIcqRpQg0gSQpGVCGJYQrFseJ24x5Sp9k6cfNMHbTZHa7Vm6XlscieqfeGFA3/8x3+x56Z7v/jFX9+ydS5KUmIEFNGggIgByQGWoIEkQbAABgRUw5Uz38gTvvJp908Z9V0xrA+Hd7TtubacgCKgbi5aFlAClM3ff2gT78E89gPifa9HBL3qYr3ySK++g1+9v+KmFdCrr7D+WHhzOth35BBu3BYCUtCNnQMiAQQAMMxRPSEQUg9xiqmAhNBdXVu9QFhE6bhQIw/1KKmfPd969pmXDr/x1o5dNz/2+Ke279xRrUTOgaqC9juyC2BQkM0Kcv1bsAD2q35vvnhE6Yv12pP6aMgVfprq+l18L+er9F/xFafgr1wA+WOv2PfgqnHVe0nz/S8BvOb6uOZv8fI3patqbW+Wd9vYSfqGQgRsROJDWWSRFfFefd7rtdfWlok4rQ0r1b2mUvCLL7z8wx89C2r/8Vd+b/9dd4KS8xtH2jwL2TA4QP2Bw+Y95ZqzuGap7w0JvtcD/VWTK3zsFbv58b6zQNGGubliYgg2R4mXpaZX/+w/vqZE2/spQC47pd7h0VFQRUHFEAIHC4qKRk3ispWsk7VaRVZyvTncbE5mhZ1fWD/w2gtHDr/9mU9/9o79d8/N7vCusDZGILkSH+7/382kJb08kr9Befe7qhvj4feex8JAsR8/3tOfgZsBG7q8DdfO6BAQVeVqyf2cXpkrl1P/jkBX3S8UABTVRIYYQ1AvapRMMkRlZmyvUoHRiVnn4xeef/XJHz4TR+k/+kd/NDYxVanUjEldKWwAVMVfvfQPNobi2nci3aByxff6pN4xSsB3PfhV5FdBse/30dJlxW66iy5vXHZAyUaG08+6PuTaC+pa20pXOUgEAJmxdE5F2VhX9oq8l2ceKW0OJb2u/uVff/Pk6YWh4Ykvf+kr27bvCkG9FyZlw2VZIhDSZjJWP8njclAJ4Kca/48yP+U1X743XbauctXHeoOe7y/Px16x7wf+lM3Ls1y8cqH8bK4M1Pquzc303c2/vvJ8VmTiMTLGGFPmyJyklWHvba+z+uLLLy8ttqcmt+y56ZZbbt1vrAUM/S7Q2Hf1ouC1BufKFPrGvnbfz8Dqz9q8oc/6F+Zjr9h3x2PgqmjkO3e+EuXpr/LemCvitU7Vd8xO38m1EsJrd0RAdc5HNiZDAspRSkLnzi+fOvH22TMnLl2af+QTn99z061Dw6Mq4pwYE/VLGRqDzNfaFsV3PsaPhzPmWvfB+8r1V0urfT7misV3ek3pik4VNkfFG7YUNyOufWsmePX8E99lx64MTa864FUe6MsvYaPC2xWXVr1eVcUQwHnptDsHD7x68PVXF5cujY0M/dY/+MeTU1uTOI3iuChzY4yIOOdUg7Vms00rwJXTwM1Mj/7/F3jXK7gRuFyn8h13nJ+S1HFVyOdXiY+5Yt/FNc4lUNjo07Eh174LSjcvFH3nzj/39aGomzmL7zYIWjrnPRg2IuHAgUPf+ua3R0eGH3jg0QceuG94eJTQIrIIGra9bhbFUZpWvC/yIqukFVXxwV99Apsv/MaNTOIVd/c17/n7jxf03TfQXxU+9oq9Jmp6OTC68YNAtV/WSKxhIgQJvnQACoxIly3mO4KB+K7fXH0gAVRUfcehr34gEqyN19dabx17++mfPPOJT35qy+zk7Mzc+PgsEYhHVZAAgMRsN0qiIRBRkHDDyvKXpP/pEDERAmA/z1KCAKAxpv+by8Uf+61GQgjGGETM85yZmfnDPom/Tz7Gin1nCESvuR9j/6MnQkBVDRKEgAiUSZQAGUVVNagqIhMxIG50yUHZWGq3+a+u9WeCggoKQn8Eu5lPd2Uei4QoIbRb7dXVtd2793zuc18YaibBS6/n0sRAX+8AAGCtBZQQAoAys8jP7Klx41ra96ZfJKAocmNsHMdZL4+iRDcyuJgJg8hGv3oR770xpigKEYnjjWJ3HzM+xoq9wmWfTJ9+JEdVJAizYYOulOAdAysTMygEVSFEEFEFImVCABIf+mUGiWjT0wNwOUX5ymFUUXWjmeXl5xABEVAVmCjLyjRJbr3l5rHRUSJypUC/nAUAYD93Sa9+1dcEWhWvOuCVc/pYKfUqEMmwNWyZLKJXJQRCBBXMS0+MAEKEIlKWpbU2SZJ+DdePZZnlXwXFvitkd3nMioDYn7IKkiARooZQujwTBJumiEi4YYVV5LILCnHTN6t6xV8LABuhHXmHxDb9Twib2RqM2KjXzLCxhvNcghdmTpNILw8IQDezmvpqxKuSf/DKAa9IFRFUP3ayVVUVjaKIyIhAFKXeBVVgJgAoSx8nHIJXFWttf1TcHxL323z1f/lhn8TfJx9jxeJVKYcIV3cp7j9NQEQKIhIAAzOhRZBQZO211RVFbI6O27RChNDfyQdEJiJExnd4MK/ZEkVEDVelZ0DfwF5O0xCRKIqMYQLodDNCoyqqGEXsnGj/pV/2+vbVu3GDgGsdTrB5TniVl/hjJdp+q65eLwsBjImMiQHIWjKMIUC1khqLzmGQEEWRtTbP87IsmZmImHlgY28cFGBz+crl6rxXP40ARKAqIgFRmRFBnMu6nfV2exWIKbJ1Y9K0qoreiYgaY4kZkd7dolGv+dlf3a5XeXGvsfOoYCwjgPdOVdggESGq9w6AcGOd7ZWKTJf/bvP75QeX/deXTe3HSq4bKDIbRGBiJgoB88wxY6UaeccbRlXQOdeXd9/zZIwBgI9fN82Pr2KvAq/UQOyj0O90Jf38ISEChOCKot1aba0voToEWFlZJGPTpELIBAEB+jduURDxhOaafweXoxFXpqIAiMpXBWA2JraIDCLOl64s0yQRCcwIikXhTGyAgmq4MlfdyBa+rFLaCEptjI0VN62rXpNi9TFBgqpK/77pytBud7//xI/PnDlvmO69987tO3Z1e6vnzp2q1tL9+/f31cvMfS+UtZue9o8RH65i3+/i+ulv8S/6VxtXvF75202PrgiREiEhSHCu7Lm8w6TNkSYYu7C0XpRFkGANM7MAAKCoiICoEv6UQ6puJGPQVb7bvvYAQBFRvEOAOImJoCwK0GCMjRMTxIN6oL69xM2hNW7OhDfdzldmz/3Zdd/L1a8m92EWkvgvQ9+51S9VKVCWHgGd84ffeOtf/cv/D6JJ0+rzz7129723Ly2fO3f+5Kc+9dj999+f5zkRGWOKPC+c+/gNieHDU+w70s3ek/d8u3/mPO0q23Rl/2udT6qIAiCAAREIFcWrlAghio2htFarANmscNayBg/ESEgKIh6AVHFTiO8oyL0pTRTsN7PpB3g2UgP6vmJFAFAhEDJETGWRozoQRUU2cQi+v+q9/49QAYEB3pkzcNWpycZX36OFV9+YbiCudt9d9rBtrL9A1Dwvkji2lhcWFkZGxj732c+PjIz9yZ/86Z99489bnYV77r3jrrvuKopybW2t0WwycxQnVjXPc2NM30f1seF6KFaofwkiKCEAqSMQRlHoX51XDRoBAECBFYyAUSDUjYVk/UoOBJ7Q9+sVbgwx+7XFhACMIqsaBSQMiIIqCB42Yne4UWp4I3NeFQRRgBTFoxSADuPAxkCwNhKgMDpiEYOFDqpHikjJeY+AhMawRemPTSkAChBg6FcPVfQM3kBAVQHjgRUIAEmBwaMGxADBgUXUgGUZkXIakAU0hCJnZMH+mYoBQWABI2oFWTZGCoigRj2rRwiAZX89kIAB4H4jL1VERAEiYCTq14vZMFibt8p+kSrZqI0uGyU2Lk+5FYmQ2QCAKgQJquGq+yxe9pkzmaur8mxobvOf98vU6MY0YWO+gESM9mpfIG6GyFRBVFR9/zT7tyFmjiIDyL4MExPTv/blr9x1152Tk6PW6oGDRwV6N9+8c2ZmCyA2Gk1CFkFiAlU2kbXRNb7idyS89EN8cvkuh4RETESbnncFERUNIJvhumv+/kPgeig2wy6hYYwEDHmXUg+L5WztArulCEtQFmVRQkZkJhNTZUQrs4TDpSP0wCSAXk1QcuRXsH0hZGtF3nNlD9SxNWmlSskIxhNqRhSHFAy6VshXQ74KxRJjYdgAYFAFREDuX6f9kodJo06V1OWdfGUeUAxDhBJCqeojECAjPFRI6iCtDO8wECGilmW52opMymkTogaa1AOACUKlw6KQNneWk06LC0fNaRrd4TwQGEIgzUjWwbV9a1lcT/JuyDqQhGjYUrWBPBTCCKWToqhaqm/nS2fUYzyynatTEsATKKEgkogJGZVrsn4ByiWKLVbGoDZbYE3BEwEAlR6Q4sXFldNnLpw/fwEVnHMEZMkw2UpcHR4aGh0bmZgeSSpsLAp4FWBgEZSAoHjuzMKBA4e8D0NDzZtv2T01NSIqIXhiJGIVdE7mLy29/tqRPC8RSRGQ2JeB2TSGqpOTzbGJsVqlGseRjUAEyCqhuuAunrt0/NiZ9VbXuQIAEQ2qUeWhZn1kdGh0fHhivJlUuSzyEEJaSVTUxtY7LUoZG59qrbtnnzuwurra62RZ6SamRqq1MYHY+4g5IQpA6ANmvWxhYenNo2fyrOynyAD4KEIfvKgaskFkbHho164tW7fNBocK4JzOzy+++PKrZ8+eK4rCGDM6Orx7z47t27cONevVSoQogMJEou46COc9uR6KDeSQUBFVSUBROqF7rnPhNdM7oexE2HkbwAKTEgJbqo9Ho7dH1V1sxwkNqQN04jvOrZZrx3X5mHSXfNGTUKoWCuLSKkSjtr4jauyMGjsgbYJfay+f6CydSspLVjvGsojkRQFsjE2CkCijSTitxjAO3CzaSyunj6q4xFDFoLoi+BzIB7IYjZdaLbkZ18fiuAHoXW+pc/aoAVsZnomGt3B9GuMYtBB0yGU3X21dOlpfno/yIt5ymx2ddUgEgj53vTO+d06z5WxxnrIeuwJdLrZXtIPGVYimTbw7HbVQraPmki3n519TB1GUcDJUCgUEAVVixIDZCqwcL8+9od2zXKvS2C62CVZiZCIkAFaPRQlH3z735JNPP/Xjp7uddnCeBBiNxTjmytjY6Mzs1D333/bgo/vnto3HST8RK4hnBM4z98zTr/6Lf/GvvfOTUxP/9P/0f5j+4sOg2HeqBy8hYHB49Mipf/kv/v3y0hoxF74wJtbAImBjnd3S3Lp1dmhoZOuWLZ/+7Cemp0YAwItXhXPnLv3Zn337zWMne92uqHiHBLExaZKYkZHG9Oz43n3bfvt3vjw8XDOWfFBrDBDNL86/cfDNF198/dmfvHzu3OL6arcsQpTA6ERl+46Zu+6865FHHrvr7jvSCrMCGejl5eEjJ/74//uNxfkWAjhfimQ2CWWZB1FrUka6e/8tv/6VL8zNbgnBHXj92Esvvf7KKwdfO3BoeWW1X05waLixY8fcrl3b7r7njk8/9vDWbVNEJMHDh+fNuh6KtcikxAAgwAoYvJa5z7uadV0MARKvRjlREO98KHqaX4jypDJs0jFj4jpooViGbCVfv9CeP0PdVRZPGMeVhqoryrwssWh3bPdStYwZU4oBuXTiSi8JJABegnNlkXXabGKuWKIYMCGoWmqgVKFkyVyZ5QDBigmQghqBSDW4wBBiR7FwIsxilCTX0CqLS2XhENrAZRQpxaMgOQkQqw3o2r2ys4a+iHyGIgaVtZRiqbd6PO+c0aLlszLRKLJVayvBJG2/2ivygCtxsmDSqaiSKDjwPSzXoFRwLQgZaUSA2m/TrBlkC2HtTGhfgHxFNEdTjxpLNhkWTkFJBQmNCnY65eLi+unTF7rd9szkuCETggRXdIr84qX5Nw6/cebccYy8Te+bnB6OiFAUQIlgfb196NDhI4ffJKb5hfkjR449/Im7qtWEEImwlKBKZLjT7pw6dWZxYSWtVhrDVUQybHwIC4uLlxaPH3rjdSKzbeuOoeHmZz77UBRbBSDi0oXTZy8ce/NkHEeNZj14IAyA7uKlhVOnj+MBee310bmtMw88eOfExEhROBVZXll97bWDT/7gqR8++fS5s5eazfHpmSlr4rXWUln2Xj/4+ttvn+x2JUkrW7dOjY5XkwhVtd3pnD515vy5laGhoWazrkDOlSGICHgQtgb6YbSgq2sr3/nO3z75g6dPnjpTrTW3b98BiK50WdY5fuLE+fNn0op94L79AKAizpXGfGieguui2DIiYkKkADYgKauQBBKtBFvhZIzjMYxqqk58Hop2tr6YL12kMoqYYHwGrELIQne+XD5frK/HphZXJ6O4FlebQGzKUnzpVlaKssT2OptTaVWw1oiGR2tq6hI4dEFb2F2mctHaSrU+RfEYUFOxKmzRJICqsqpQiQymaa1anyZTB0UgzAEDRyWyM7EmjZJcJIVIu5QlhizLWtrKNM6TynYUAo0JKmmoxmUUnHdSiioBRwSo3bw8120fz9oXQKVSmU7j6dhUDduAOfv50F0vPICCUsHsMXgKBZZd9QLSQywsBFT2QYFKE1ald8l3L0LoRMYUDl23S93FqDkGyKUHHwjJpjFWkzSyFUvx9m0jv/NbXxsdGvJFmXfLXrs8cODgm28eOXDg9eZYZXpuolavRo0aGbRkJeCFixcPv3mULDebjaLIXj/4+qnTD9122x7nXN+3zkyIiAaI0UQ0Ozf5la99rlKtGUpBaXHpwhtHXj595uSliwuvH1z7q7/+5p6bdmzbPlWpWgRWCe12N8uKm2++5bHHHq1Wq6qY5dnC/MVTp068ffytSxcvfuM//5m15rHHH2W2CwurT/346R/98Ecvv/zKysra/Q/cu3v33l07do9PTF68eG5+6fwrr7x46ODR7//giYXFS7/921999LF7k8QigbHMhlTDrl27PvWpT8YpAGWqAQAJLSONjdR37JhjI0ePnvxP/9t/6naLmZm5Rx97/P4HHmw0mhLk+IljL7/ybFlmd9115/T0pPfOlbmqs1F6HYTznlwPxSbO9n0IrMIEiARoEK1GQ9yYjEd3cmMrmBpKppqDW40vHF0/ddovn/DGQ00CJmV7NZs/5ZYXK1wbmttrhiY4SpFSQGsDqHqoXVi/dLzXWyjOHx3GTm33fdXhqbQyYzyidKBcoBVLWclpw4xuoeocROMqFQXABIE6CjGAYbJR0rBD01idBUwBowqyWnAQSpVgUhdKwoAcbEVtmYv0ur1eb2F1Iu5F1SmAGghGRVSnWmkYQcEAiqKWml8I7SO+dxK1qNbGmlM3x5XdhCkQMvlm6JisVRaZAYgrNWKGABuzCBAgBVYCtIEteJA8FAu99qm8e76eiKnN5B3wLuStC3ZslONhgwbUMJHzGnL0GfgCxobHP/vZx7fMTPrSR6QQZHnl008//fK//Ff/+vXXDz/xd09FcXr/Pfut5RB0ba37+sFDx99++9Of/tTjjz/+xBPfO/D66wcPvrHnph2KEMoiiRMm0+26PM/jJGo0q9t3zHzlq59uNmuRTSRwUebd3uOnT5//wfeffuaZ53/yk58AyO/9/u/cdfeto8M1QlNN69VK/eabb/vq174wOVlX1dKHrJt3et0zpy783/7b//bllw/cd9/D99zlKlV79szi3/3NU88++4wP7jd/8zd+/w9+t15vJEnabFbbnduzPPvilz7zZ9/45p//2bfm5y+mFbNrz/TNe7eLiPeOmbq91tatQ7/3+5+KYpMVnhiZERUJMLZQSaMsK99++/ja+or3Ojc3/Xu/91u79swajhT0rnt2PPb4Pd67ubnxeiOV4IxlY4z3ZRRdB+m8B9dDsUYj7fvdVBA9gFcNThTISlSHZIji4VIiUIqMJSNxpZKwcy7DMoEwWWZJd3khX1rCzNXnZiuz+6HSUAmhLEENGcPMlhIrQRbzsDYf2qtQIMU1tBajEtBBzwSGTAoAp5FChSDaLOFkPGipmCsWyEKmxKiE2AMqqCU1wEhGibRAAjAAMVKFKQbCajXperfWu2BX7EQaIROEBAoFULAByAE5CKWGolw9ka+9yW4tSYeHJ7ZFzR0SbS1BvHSFrI2Hqk2qe49ljqriIvUhSCKYCnqgCMgGiUBtv8RxUSyvdy6U5Wp1dAxHZwKEvLWonYW0d8GaCcbEcJWIXBbUm4grjepwszY8VG9OTtRAtMxdGkdzW0fZmKd+/MyPn33mzKlL3VZPBIJAnve++zd/992/eSJOK5987NHPfPYT662lI8feeP7Fl3bu2XbrbTfZyCIREHrRwpWlz13IOQqzsyNDw9UiF0BO4nrQkS1bt+zcsWfP7r3/j//u//nKy6899NBDu3fvrNdrWaYApnTBcNRsDDUaVTRgLfSnhxMTkzMzM8/85IUzpy4tLqxWqviXf/7dl1861GkXe2/e/fWv/+49996KCM57kbI5NOoD7NwxC0rnzi68+uor3/3udz716Qd37drey3r93JgoiuqN6ujYUKVChQM2gAjBQ8TgSpEged4BkFq9sjC/nOXdSjWtVKIoAlWs1eqTU3XvIEggUgDwzpWlxPGHpNfrFY9F3PDfC6gHdApeIABs9kYEpctTeVENXjQACXAAcsFJ2WtDWURk4nRY7VDQVEIG4nAjEGkwrcdDo1g0Q2ZJAwQCNYpGqCASIBVUJyHSABiAPRgfQhFELAhigegRPSiEkPliXTEVyAgK71ktUmIwidGypYgl9iFyJVmNosZoCCWtrLbaq8O9VVtNkKuACFgKFqqliAcNIKXLVkO2bCEkUWqrI8A1wchDWaA68RFUE04YkEKqrgxBVTgAKVohUGQF8oqkSAjiizJbd66nlqBahdoo5wGyTl6sZu0lU+mRdQgBlQiQFCGgeGDkyAICuOAB1QcxEVmLxhpELougotZQUfpLl5ZefuW1N4+9tWV2x017b2o0K1u2zjYazcNHjjz/wotbts5MTI4HAUC1FqMo8uKDeoAQJFMwioSAol5FkiTasnV23803j4+Nd7u9hYXFtbX12dkJQlRQ7z0A9FM+EQUxEDEjWctRFCEaEVLBtdX1l1860G73xsYn9+29ecuWSe8DG0UKIl7RAzASTk9N7dix4+DB1+cXLh4/fqLb7UaWmckHX63V1tez558/ODScAikziKgrZbhZm52atJaT1I5PjFtrRcPZs6e/9a1v7b/z9snJ4Vqt1hxqDjWrxoA6DEH6q23L0om8s57udeO6KLZf5wEVIAA6QK/olYTUo5YIJZGLkIEUUMB7cc4BiDUasbJKmYeyY8DFUWLjqkhcegPeGIgQUJUEkU2a1JvUrZYrrOJABIiBjRAREhADMSADUf9LGYJqUDEkoIqEBAriizzX1prvgWjK1M5KVINxrZo0R4iSyMQMiQvW58bGNW5OJ+CrBaytd7K1FcTUVKpokbhUdEGcSABERQwu0zKLOYptBWwdMAUiJRLh0pcalABRjA0IgkKlIiiqsioiEAqCgBAIQPBFp+isIEhcrXNjFKojUQlRb629crazvlIbL4gdQAmBDQEB+NL32r3gQmRBghZ5qFWisvBlgevrq+vrq3EU97tXR5bX19rHjp05/vap1dW1+++d3rNnZ5zYLVvmxicmDhx4/vnnhh955MGx8XEJAopRxJU0AUAmIsbcdVywxCkqOh+YIIosAtXrtZmZuTfeOHL+/MWFhaU7bt8dRUyIRGRtZCwTq2pwvkziOITQaq3nWVmt1JrNoWq1fv78/Nmz51VgZnp27969lTQqS0dB2QQi9a5UiDSYNK0NNYdD8IR08cKlTqdVraaEXBZlEsdnz176iz//3vBIxcYeSUIQV8r2rdt++ze/UK03mZNt27bOzc30etn8wqU//uN/c+dd9+zZs3t2dmbnzu27dm0ZGanHsRUNlomjREWc8x9SE4/ro1gpAQFYA3qkgqiAqISopLJL5aJmlcCqmvb3lN5qr93t2SpV62VzXBIr2XqQ9ZSzKK1BzOCBmJgqBq2GUlXEe2BhFkLxZe5DVi07BkrgKIA1EAFEoDFBghpDsCBGhYUiNoTkIDhUQw6Cc0Xo5X49J69grVkpco8mAh2LYoOmQZSAVkDqBoYZaxDNJqkd9w3nTq+srOS9vDLUrdSnbLRmjdNSVQgwAnSuCOAgiauxqZHGigkgGaSYDRpLSCAiQSEwUUzGaXDChWIuqIIBSJECYw+hm7fns7XFNKo0hoej5jRGzXi4WpMy657xnU7oXmKTklGRYaJKGnFiDCn5Qs6cWgnOKWh7Xdqt3pHDR5999qXjb7/VaDTu3H/H9NRMCHDyxNmnnnru+Ilz9frIffffNT2Tdrtw8y177r777udf+Mkbh489/fRzM7Nz9XotiDJxXjrvvRcPKHEUIWFwgVEJqSi9CMcRNRtJrdqIoyTPXNYrnYeyFOd8HMdZ3rl48XxexqLCRl3pXnrpwLe++bdvvf3W9PTUlrnp4eH09OnQbrfLsgeglUq1dFRvRqXPgwdjjfM+tpEESJNasz6sngzH1Uod1OaZd2VAoE6rc/b0uazbFegqdkWdKiCYfTft/eQj96dJNXi396ad/+yf/bMnn3zqhRdfevv4qUOHDr311lvMjKRzc9N37r/tkUceuPfu28VgKL21cQgf63gsMAKhGlWEoD6CAqAQyL1rlR3V0gHNF7kFMQpa+ryTd7E+Wh2fjSYnqZqG9TWvAaBEyEG67DMCi5Y1CGoADhp64J3VdcQyGBOIgTgABTCiVYWAGiNYQsPAgAY0BqkqRD6IIQBlUoiJI8NppR6PTGtlHMgQQVHkQNZWh01jyCmjEwiBAAhs8ABlRNVmPFSdlmjh9KHVxUt5e81Ot0OxbFVVYwgJSAqi3qU+VIEqhBE4AfDiNJAASxwZZkYBCgEF0ZBFFEAVQCeogIEokBHHmkNY02yRsvWkadO0gqK+s4RVjJo4XOO8l7VX3qpEVB2NKVjXtaEsCXxk+M2jb/13//d/XqmAas+H3BXl6VNnl5bWRkYnv/jFz3zlK1/YvWe2KOTAgbef+tGznXZ2++37d+y4eX6+7Leh37lzz85dey5cOPvUU8998rFHZ6ZHAaAoJARNkhRQkIwPymijpBq8caWkiWWCIoO1Nen1yqJwcZxWKqlhMIaTJDKMP/zh90+cPBSnzCSFyy5evLS+1i6LMD428wd/+A/vf/D2Wp3YUKUaiebOFd1eR1WIKea0317IGgyeVABUnRPnJM8KBKqkUfBegqRxxbul3bt2f/Vrv2YiZ6KNJFAmOzo8Mjs7UamYsuC8DHfeecvevbu//vWvHzt++s0337p48eKJEycOHHjtxPG3Dx448Prrr/9f/5v/+vZb93kvcVRx7kNbEnRdMiiQ+zUZkKgsS2KPrASCwZMvQ+j4EMoyUU2UGMhU65N2fCIanqR0OBCDGaKo6WTd9dai7jw015EMiJEyD9oB6ygKyJlfPlOunNc8s+mEYAoYKyUYRL1FMACo3okIoAGx4CPimoqgZkAZIIkvFIjjyNZHoToFbIGEXAlk0aSoFpFUHUKpWAAUlglFwCNqHFdHRkam1l0e8k62cg7UQylaWNAaSBVyX6/OtlrjWV5SUUahhEgMIgWjIQYJHPUTMR1BAEUIgJKw1m2oxMYYH2PBTAquJa1zprcQa893wqovJVos6SJEsXHrNjvDodNqCVar1aExMFWgSggZoI9js9ZZPXLkTcQcII8i1BCyXjYxPvbFL3/pa1/9wuTkqDF86uT5I4ePLS2t9Hr5yROn/vRP/8PQUANRiPHixUsL80vdbn7q1JlLF1dkP0QGHQEAiPRzECk4ZEpdSd4pIvXTQUWh2ynm5xettePj443GECASSwg+BLe6upyXawCCpKrSbnXK0tVrzS984XOf+cyD01NjClCrVXbv2fbGG4dWVhcvXjzvg0eEspAQNI4JFZlQAdZXW6vLq7GNIxOPDI9V03R9vUPIBKxBZ6dHHv/k7RwRoDArAopSEtskSaHvHQiaxBRHSaWS1Brpli2T6+vtVmvt2Wf3fPOb37508fwbhw6fO3vxtltuYWOJSMLHOoPCo1EICsESKagiIjEDErDlCEwKUIWoploFijiK40adR8e03gRTCQBsx6LKGPBCKLvQXoBiEQwBVYCCagbYYwPgl7OV08XqJS1D0mwqVwUSVcsSIBAAKaiKUxUAAiEIhjBWEQAHwIoowQkhMEJcgagJbIECGQ8mBjXgERFFHWEBmCvmZFJABGVQS3ao3pzSbqvnM9dbNwTgCYNBSAAjFFOpT2WrY1nvAmZd7K3auM1YZ0FQUgA0AUKpvlBxSAZ8hEIkljzHHLO34InYS77qVi9IZ4lDEYLPi+Com5l1RZ9Ktx5aCM4VWGQLZW/B1IbA1BUKCXmQslqtbNsxHVlBLCpVS6pxFM/ObfnyV7509123dDKHCKdOnT18+Eivl1sTra+3nnrqxwAg4on6DTRLIp6fXzxy5K37779rfLQWPCCyiIQgKsgUBc/egQS0FhGhLPX8ueUjR96cv7TQHKpNTU0NDw0BAEBwrhD1Y+NDW7fNWMsi4H148803l5eWjYluvfWW3bvnjGHnYHikceddt52/cHJ1bfHNY0cuXJifmhzpp0JLIFAwFlyA06fOHXvzGChMjE9smZ22xpS5RCYSERVo1NNtW0dtbFwAYwAAvAMiQAAJgARM2O0VhiNiHGpW6o2KKlgLk5NTZ89eeGJxodVqt1tdCUBM3gWAD63a23VRLJmgID4gh9jGzKnTGEPE2KjU5nh4RquTAE2AOkAEyMAMceSIQ2BRjqIt9WaJeY7r57PWirlwmIfXqT5KldRyS3XN91rFwun2/FnIQ5qORc0dGo17iV0BCQaAEqAEdEoBqO/6cogOxQEE0BK0ACjBiDKpluAyKDOgoCiqimIBBaS/MLZUyRUzIe9AlSzYOkgVxEHiKiOlNSbrncvbqwnFhhW4B7YFVYdxakdGe2G+lS1l5/MhqSTVNlKMzGCkzDpZZ81nXUKoDY3beATQKayXfh3ZE5bEXn3m1y+01y/5bieOh9KhMbV1B5SCB/aRlHHRdb1VE7pZ1l5eOjsc6qY+bmLxodPtrdx1733/l//mv94yNwIQRAOp1mqJjSyiFZFazeRFdujQ68fePNaoNx544P6xsdGiKIyBEJyIEGtRFBcuXHrt1Ve+992/ve/eB+6681bnILIxAATvnXPdbnnu7KLhmDBSDeutpePHLzz5g2d/8vTzAHrPPXfddtvu6ZlhayCI9yEDdJ949IF//H/8309OTIjo6krrf/6f/9enn346y7qvHzzw+KceGBmpI+Pk9MiXv/Lp5ZULTz311HPP/eTf/el/UPmD6emRJEm0Y7yXvLc+f2n5m3/97aef/rG1/KUvf/622/d6Lz54ZvLeG2vyXM+da9eb1ktgBlX0Do0hQkwTG8e8sHDpJ8+8Ojc3Ozs7ldYaaSWNYyxLjSI7NjqCSHGcRlGsAN4FX7okja+DcN6T67J2B9AH9AGYNWVLPtIiCnkKPhIzy8k2qkwLDQPWQU3ftaresXgFJY6NmUqGSEFyjtYXzun8qbS7ZutNqMZiWl7XimwtW1nRAirJeNTYRcO7MRpyYEiETUHcg5ArOSFVCkoOOEfuGCa0BKEAcMAg1jqQMs/MykWxXsECkvNAFKOJIaokYxMmUiBFg2pMiZFiCthQHgJUrFpjEq42yiUtel2CoNgztBDoXEjIkMRuKPL1Tmu+07sQll9u5Ocjm7AxAcrVzsLy+kpe+mrSnEtv5oYgqrp1X+2SwTjNIcml3e5219pZlsbDtbmddnovRCPgVX2OFgEQcufXzyyceSrLMok6SdqpVQsbS5xCUsHGULRl29C2rcMSwDsNHtIEVaWXOQWPgEePvPHC8z+JI3744fv/6T/5x7fcslsUGg1QBR+AEC5cWPjx0y+J+DNnzh47emz7trnh4YqK964IwS3ML/z5n32rXh/WEBNG3W7rlVeff+WVV9fWOrVq84tf+twf/Vd/sO/m2UrVBBFjATmUrlupRiOjzVqtwsQT47X/6o/+cHx87M///Bvf/c6377n39jvvumN8fCxJzO233/TVr33RGPjBD370jT/7xvz80k033Tw5MZ0kaVkWx986cuTI4eNvn5mZmbj9jpt//w9+a8uWrYhYqXCWdZkxsnzq9IW//usfxSl4aVmLTEaEoihu1tPdu3dNTU098cTT//z//T/MzW3Zd/Mte/fdMjM304/iPPvcs0/87feMoeZQvdms12o2eHZlIPpYZykSAQGiskhQQPAEpQWoKkIpNZYaQbWEVCQiIBYw/XEzMJGIkiJx3NDGlA0FZWWv03VZBs6Xaz5wC7mnUrLYamO0UpmNa3OYNgGJVQE8gQcCQEaM0dSAUwADxMCA6EBRpUQJEkwhCaqTXuiEtQBelZlNWYQQiGwlqg2NptUKR6gqHj1EbKqgsUrkKQVCiwEoIKvJV01lTYq2KgSEUguhmDiKKmP1oS1EUZdXO70sz89FgAwg5DpaOO+NieO0YtOaA0X1wuojC4iiAVxZ5EWncL1gTFqHZBzMKNAQqIoUqIbQglGI1KZTWb6QZ6HTyZO6C77Ii06ns9rurAQJLoB3yojEEAQQKEmsibSXd44cPnT61Imhofr09PjIaNxsggtADMGD9yCi4+Mj+/ff/PLLe06cOPHKqy9v2z79wAP7g5TOZ+322rFjx+YXzhtOGvWJsgira4vGKjEkqZ2dm/rKVz6/c9esMVG3l7Ppr5QMop4NxrFlZu8BgG6+Zev8wm2Hj7x26NBr/+7f/4ni73/2s592XonxzjvvIKJavf69737/5ZdfOnrkWBSlIShiUCnbrTWi5HOff+z3fu83du6aJdK8cHnhK9WEDXR77UOHXl9dW3S+lRUrxgAiOafMds+u7V/5tS/X648UZWYMnTx1/MzZM089/VSlVitLp6JlWbRaq41G7bd/+zf37r251/NEGsXGOW/jD2dgfD0Uy/3scjaMgmpAYuZGWpkCD2qGg6mDqXqMgxApKIBRBGREQQTQAOqBESsNhuk0aIjXgyu9d8F1NFi0VWPqSbVZa8wm6QTHk2ojhYwAAT2AAzSAFTIjUWXKJDXkJmACaERB+xMwiZBGuDJH6oBQOBUhUCVUg0HUg7BKCaCqBjVGrJl0zFTGhOsOkhItIhJXSQKgUG0uHcqps6qiHI8HrARIrFpjbVK3xFORXVlvLbmy41zuXA4G4vpwGlVtNFRNJ2w8l6tVLNEUVJsAMcKpV3YQBdPkCnFjBKrTwE3FqhIETrg/j0CkdLI2tF06tgyimngPcZJMTI3vvmn7zJYJE5t+uw+FwMy4WZujLIrW+lqnvT4+Nrxly8379u6qVtP+KltXqiiCKiGmFTM1NXLzvj3H3jzmXdFprxFqs1Hdt3f30tIiGwKQPPfOlQA0PNKcnRufnJioVhs7tu+46+59zaHYB9UgRFqtpdt3bM3zYmxsxBg2FolBBeIo2btvz6/92hcK11L13W6r2203Gg1rzdTUuLV3VipVFTp08MjaWqfb6XQ6vTjh8dHG7OzuvTfd+vkvfHrvvj3GapDAQFFkKtV469bZIhciDqFUCGzARkTEAIAIIp5Yq7V4777dv/lbXz195uz58xfOXbi4fnG9KApr7Mzs9O137Nu5Y/unP/P41PSoBC+ihuljvnbHAPSdTUQMGgFVTDxSH1YRpMqw2pozsQcWBA1ACILI/RQpFQAPGBQDmJhrYxWuULVbZh2fd+O8BVAQg4miqDGeNqZMVFNMVEC0i4gEoBoAY6AmJ6EyhHGUoB0DqilEohgUQRNEY9KZ6qgYFNRAjCoexCeWpCxLr0oxJbUoThVjQOJYKkPeJCNihzzFJSMiWooAKgjCldnqMJFdB1GpbPE0HCD2Yg00OR1OTS+JWhxfyvNFl637vE2Ga2PTcW3URsOMQ0J1h6pUmsjGQzshKMTDgatqOK7NmbRMmkNaGfdcAbDBoGCMBICADJo0akPbOEqKsiQzDBqNjo3vv/OOuFad3TaXVA2QsFEIwswqAAqikmVFkefjY6OfePTBnTtv27d3XyWtOgc+qEgwTMYikzJBmth9+3a3W4+qQqNRY6KZ6cnPf+7T6+uriMCR7XQy7ziJquOTzcnpocmJya1bt01MjKcJIQqi2AiMgZGRoQcfvH/L3Nbdu3YZQ8wax1CU2stlYmrqi1/+bKuzCKgTE2NZ1ms2G5G1zDwxMV6tNippbe/eN86eOb+wsNxpdytVOzkxvHv3jvvvf2jL3M7SixefpmQjdj4aHq7f/8Dde3bfFIKIhigWoCxOLJPxDlWhUUt37to6Ota4++79e27ac/r0mWNvvf36oUNLSysimiTJzp3b77vv3j27d41PjCYJl4V3TpxzxnxonqfrUbfK9/rF9AVMACiNeHZeSw+AwFRaLgx7NgiWhaxQ5BFAAoYAnlmJVIPv22kyGNRLmaHPMBSIBGAQTOCq2gQJCYKqABICqWAIGlsD8P9v70q6IzluNJaIyKWKm0iRst9o+mYf7Pf8/6/z/DdmRpY8LXY3u7nUkhkLgDmAzClJPskz3eK8wqFfk5UZGQs+fAAqCYi1ueUZkTiNSJ0aVwMMwYe1tpO8iQFBCqKBCUj2ChWGBEZmycabIhDJIjTZT8q9hKGEoXACtL7VZJW0sTaseyg7MGvr8914WZS5wFihIyRsILnpPcQJtFgtqEjdBfBoFq1BwS73HTJE3Xf7f8dWcPjGwleaEfMeGFvkHFkA0ThAYguoqGBixjb39oA6qwLiCGFVMBVtRaqQEEMKIXIg5YBdzaoCMRCHJjbv9rv9vg3DybgaAAgJzVprhUNAfK44pQK5VJNWqxHHYehqbSLZTNWgqTBxK4CI/cAUTM36bogxllKbli6xYW4ym8QyBxXlkIahZ0YRaa2EwIBQa9ttt12XkBCRuq4LHHOpXlERQOapTFOpVZgtBES0vourcW3GpQizETe1YobSaN4bo6maKIRoVSoiIKIpIyCCDkPq+642NSJp0lqb8ryfWohERH0Xuy75a7ZdYEIzFUBgopi+zEtPnwOxut0rWAOTgEbIAkExeOkkmCvmQtVYGQNbYI2kvWDMRM2RJ2BVSSqjQNQW1aAQtAjGMJp0qqEoqQpBDjgzo/KJQVAhq5ZYgSpRQ1YTlEZmnUEQAwEUACRDmhlzH0hKJqUAbFKbCXeEwZpoFqrxfL9v6wCrAGTVGDJgwVS5R5Wh7DqDYAEkggrABKhz6jfdKIA0S19lJAqoJtO+PnRj4NADdGA9GNeGTSvijvtxr6k1DCIncMc6iQ0GI0FHhsDQEkypNJzYJEGMsgZJDbRQRqsjBMoG1YCTpdCYqkm2bDT3kczEDHpakXUmKA3AICSRNtdWgAJx8l4JiF5yHZhJVVs1AAIjVey7TgRKqaoyjgMHEv92VbUWSXGIgRVqbXsOGDgBUGu16xjRDPKUt62msb8k5FaVGIm1tZkINtsnNR36VZf6ec4hxBQ7M5jmIqKE5KXDzYyZmNlMcplTBDDRhoQdErQ2IbWYCIEAYp4iWvD60hylth2SBY6Be0QoeQZQDoQccqmqEDhwirXpUki1lKzSVuNAYHneI8FqHEvO/XD6fw2cfyifJfPEYGZoakCGLM+1BjEYPL9fyqiooMVUREQMGmHDIMhqGBDI/xzTRKyKqQEpsCKiMEggDM/1jFQIEIDUSIy8WJEYaFMMFpjFoAkgwnP9RHPPEMEYKShyAwkQ1KJAVDYjVG1VWlUEZAhkjOp9elTFxFgImlkxa4ARIIAyNAUKQCIKJhaYKFAAIwQzE7U4jEoolU2QiTmQIigiADBqZIAGJgRxBRisoSkiMyCDNm9NgGhoomoilSwCKXIDFasRIAIhEDfxSjDYxdggV8kAhkBVqhXrUkdMtTQURUQOjBxEpJTS9wkQa2uBCAC82Q8ReYU5NSslm9kw9MQwTXtEQEIEHcfOFJsooHaJFVWtghIHBNBp2ivUwCH1AwHWIoRgpqXUEEy0jEMCeG7QQUwiUiwTBUIKnTcywyZiKkbPQROhghkhCKhoG7qOOD6XZ1JRsRAiGupz0VkkQn+LS02kCaCFwEiYyxw4KgKgqYqXujJT1RYDcerNxK3Csyb+//5LACMEXTIdCAAKIABkZogGjBBBn5vdmKK5C40KiIjkxciIkCAIqLUKxIikYtoATUMwUAUEIiZMauavrYH52Rggq2opoopNgEk9rUVI5G+7AZiRKJqxGimwEhmBIYiCARIRGnZMTGQgtRkQiBqCBlYzkyaNmMiQAZohMRChIakGIkYgQgU11abKXWfP1f5ZFEzV/xZBFZoIojEiMABGQ8OA0nCz36JCPyQ1BAFGZjATNQMxEW2gSl66jQiQDa2JKAAHZA6mXJoBQEBqKmWuXlRNQZpYYGAOQCQiRMjM9lIbvTWF52MgJFL1FgpGhMRoZqVkIoqRESAwGWBVBbDA3BRUFUyZAqiJqAEwx0DR2ywAGpioNmBEgxAiADZRaRJD1KYiaiaRg73U9fN/VRoARSZGBO+DRCZNWqvEhBhFijQ1sxhBmgAiEwEaIvmf4ouIiAT2dAeISAwdkNsBb27mZTAtMAUOtWZTY2b/AuOn5a8/q3wOxFY1AzRiAgQxQMQAANYMENiEQANABwCAbmKZgUgtgCDqc8dIIkMEUTYiZFTbbrembbUKkayWZmDGIBByKYCFiAkZEVWFmeYsDw8PABBj13cKUTkEIksMueT9fmNaEZEQV8OKugj+uo8QGkaMxNxEAwCb1pIfHp6QsLYaYhpWuhqGikkUM8g873ePT6dnJ/04EFESYUQQ2e132hqY5ZLDxOM4xJAoIICUpvtpX+vMDE12HMowDEMXa2kxMESuUm4/3c55/vbbf+2xp4aMPRNWLXOped43qf5a1/lJiExgqmbGSoQI/lVRjDoYgInt99M85VJy349dlwxAARn5/v7BDC4uLlqrrck8t9rKen2SYlRQVXK/FkDHcVC1nDMi5pxFhJlTl4gCGhICMW6edm9//PGri4vLry7rXEvOMXUhBgCrRRDqbvtYa00pcGCGLqWhlgoAiOHp6UkN0ICIhnFEopILEnapQ9APH94jY4qx77q+7wiDqRHCVPafPn06Pz8bxl4amzFTyKXc3X0KHM7Oz0IgM2jNCAEJYwxm1kQBLIbOKyo+F5QGADMECIig1rQiEHJEMDOoVZC+WNe8z/IGBT6Xnzyokvn8sz0X4/35LfhcrNY7hQIRmUkVVdUYExPv9/v3tx9D4C51KYYukZqJyJTbbrf3BmchAQACypzrPOf7+4dpmm5ubpgpRAqBVCWE8PS0/XD7Iz4Xs9bf//73wzi2Wn1iJub1VQmAEFuT3W776dN9CGGaphjjWa7DdVqNp4g45/zj+9sPd3c39frq6mpcrRIAg1WVD+/fq+o4jqWU8lhOT2UYhud5Rrj9zx+enp6ur69ba4gbOD9P4ayZxLSqtVZtYYhkdZY5SEgpkREIMNHf3/1tmqau68xss9nAv9B6vSamwIHxpbeqAAAyJhGZ5/nD+zsAqLUi4jj2zz1X1f7+9/+a5/kPf/iD78O7d++32+1f/vIXABJRZhQxj+4QkQiIsJTy+PjYWmPm09PT1bjKJQPAKq3uPnz867/99c9//vPJ+vTp6en+/v6bb75JsSciBd3tdn/77j/M7PLyMqXUxSQChN7qyh7uH5+enlprwzB8+y/fghkRphRj5E/v7r7//ruzs7NxHJ8eH9+8eYPIIk1Enp6ebm9vY4wxJsKIhCIyTfu3b39AxFKvr69viMgNzXq9fmnwgbAUYv2Jlv5S/qdG7xcsXf4KunggomsVvPRNqrVO01RKztnu7+8BYBgGevZwvdI/xRiZQ845pRRCGIah1vrx48fT09OUEiK2JmbKzGZ2dnZ2c3MjIu/evQMAEVFV77akquqMxUxEIFJrBcA3b95sNhvvU9pa82KZpnp6etp1nai21ggxhLDUy+267vLyUlU/fvzoMFutVt6quOu6YRhOTk5Wq9W7d++8L1tKSUR8Xd796fHhEQFjjL4bMcbWWtd119fXMcbHx0cAKKWkLgEDviD2cBsBrLV2cnLiE/NYzTfWO68+PDxcXV2VUlprp6enrTXvQAXgjg55g4ylz7Lf7mvJOfd9H0LwI7i6uso5397e9n2PiCkl3+0Yoy8tpbRer90ExBgBMOd5s9kAwB//+Mec83a7nfN8dn622+1aayLy3Xff/elPf3LDt9lsUkre7dkj8Kenp1IKIvpheQOey8vLeZ5Lqf50P/1aqy/ns6vzPyu/9Rl74223gX4SIrLb7Xa7nR/A4+Pjdrt1xliudIz5Lf77pXWS6593PUN8VllmHsdxHEcffxnqZ+K/NLNp2t/e3j48PCzdmcystTbPszODqc7zXGv1eMme+xNz13Xr9Xq9XrfWSimqOs+z63dr7e7u7t27d9741K936IqIP2iz2ex2uwUtvlJEdMCvViv/jTf08A08BK1PdemG7NN2yCF6y3PIOfvMfdPMzO2X3+79zh08yzSY2bO4Sy7X+9+cnZ3FGKdpenp68om11hztPj1/hLfJyTm7y9N1Xc757u7u9vb28fHR5+lor7XudrtxHIdhcId8gZybEt8uPym3R9vtdrVaDcMwz7NvdYwxxvh6O2i9Ao6FnyKwlLLb7XLOZ2dntdb9fq8v4heIyH6/r7X2fb9arbw6CQB4624RcZO/FP5AxGma3r59606jf+oasOB24RNngxCC24gYo3ukAODMv9vtXMlyzvv93q8MIcQYc8739/chhN1u54bD1cvbE/sScs4OALcdPu2cs2PSqabW6tzizaBaax8/fvRx3NN+cTfg0Gy5+LC+D8vq4AXYzvPevcaR4x/5/vvth6O5SXIXYLfb3dzc1FrdHXC0n5+fX1xcvH37tu9776kRQnAbRES+Y47GxUg5B07TtN1u/YBKKV3X+Q7/7ne/++GHH8Zx9AvmeV4mFmMcx3FZjpuV+/v7y8tL5+QPHz58++23rk5unl6j/Nbn7Zq08JiruLtewzAAwHq9Xq1W7gItTLhgYBgGV2sA6Lru7OxscVNba04afvwPDw8LWS06ulgBcO4CYOZhGK6vrz3mdPfbYUZEfd87haaUpmly2nHtPDk5ub+/f3h4cEr5+uuvHepd15VSnAe+/vprRPz48aMbBZ+5A/7q6iql5Mt0xLrR+eqrr9x+OR4uLi66rjuc8KHR8dnGGA9BSM9f4Wjf98MwXF1dTdMEACml3W4HAK7czo1uRBaP2i2Rb5Hzp68OAHwrLi4urq+v3QV1GHsQQUQXFxfTNPlavH6SOxo55/Pz88vLy91uN02TP8jNbozxzZs333///WazQcSTkxOflRu49Xp9c3Pjy19c95OTE3fC+75/fHx0olZV9+HhZyHsa5DP8QaFl1f/deK05gZ7YTn/vescEaWUFq/YEzBu+EMI4zg6bpnZ9cPh3Vpz6+6qXGv1hMRhzAYA7gTCC3U7wltrm81mGAYnYQ/bXFF8nPV67f4bEa3X61JKSmlJ0oQQ1uv1OI4LwyzIcUJ2BnbD4SDxeKzruv1+P8+zk4l/6k7HNE2llGEYxnF0BB4GqL4tviGttdvbW8+7+P4sNOvwGIbBSdj13of1VcOL83kYfXz48MEJ2T0ON6OqWmt9fHwchmG9XpuZx/lLG3U/JvdH3EV3f9WRX2t1VjQzP8HFCT9woZ99ez8XTwRut9uu605OTpz2/Xo/R2be7/eLqozj6K7Er0Zs/4UKPf3WEbto86IiSzTl3yu4o+X20m3tYjsXLnV28jBmcYlFxBkMDpAJAP5dhSuW49mHWujFzDxLvHCXZzvgBefjOIpIztnzHLVWtwILIfiDDmfoF+z3e5+Mr5GISin+kStoKcUp16l78e7cp3DY+IR/yaKLqzLPsxOdT8PDePdL/S7/yEdzGPsgS1/WJR6OMbrn77bG1xJC8FX7Ex2obmFFxKN0n7aDagkBPAxeYhzHm7v9foFH1+43OfB8Ib4EVwk3uwst+8R8KLfa7r8s2vWrNfOI2H8sC7qW0MiPbdF1P35XFzfhjh+/xjVsyRwuCVjXdcckHuRUD390EC6P9rjo8BGH7iIsLeVeIuTDnJlT5eG0PW3m03CdA4AlnHNZJuk/LsBefvTxF9Au4evi6C4LPFzUYn0Oneefef6+5ykleKHrxYK4J++QSCk5SHw5fuUhqx8GySkl517/dIHxYlAOOzU7Jzu3L0sAgFKKA3vZB8/PmVnf90uSzMUO8uTw4q85nrfbbd/3y479CvlSiH0FcSz8QreW/xyyB7wAw29cklW/vMbvXSJk+GlCdVGyQ75yr8wfvSjiohyHzpX9NNkD8PO07SFsFlDBS7Z28WYP5/DLQeDAuCwB/LItP1sLHOiuj3+I5H/oRcML4A+NiN91aBccb0u04o7xssbDhy7j+4ALix5etqQPHb2Ha7eXIMVRvbhdhxt4eEbL5i8bBS8WcDGU8M9x7JeS3zrHHuUov035Uhz7W/8+9ihHOcqhHBF7lKO8JvkcXvFRjnKU/y05cuxRjvKa5IjYoxzlNckRsUc5ymuSI2KPcpTXJEfEHuUor0mOiD3KUV6THBF7lKO8JvlvKdZFzJ/LwEIAAAAASUVORK5CYII=";
    const logoEmpresa =
        String(empresa.logo || "").trim() ||
        logoPadrao;

    const linhasItens = (o.itens || [])
        .map((item) => {
            const ehServico =
                item.tipo === "SERVICO";

            const produto =
                item.variacaoProduto?.produto;

            const servico =
                item.variacaoServico?.servico;

            const nome = ehServico
                ? (
                    servico?.nome ||
                    item.variacaoServico?.descricao ||
                    "Serviço"
                )
                : (
                    produto?.nome ||
                    "Produto"
                );

            const variacao = ehServico
                ? (
                    item.variacaoServico?.descricao ||
                    ""
                )
                : [
                    item.variacaoProduto?.saida,
                    item.variacaoProduto?.tamanho
                ]
                    .filter(Boolean)
                    .join(" / ");

            const descricaoCompleta =
                variacao
                    ? `${nome} - ${variacao}`
                    : nome;

            const ncm = ehServico
                ? "-"
                : formatarNcmPdf(
                    produto?.ncm
                );

            const unidade = ehServico
                ? (
                    servico?.unidadeMedida ||
                    "UN"
                )
                : (
                    produto?.unidadeMedida ||
                    "UN"
                );

            return `
                <tr>
                    <td class="produto">
                        ${escapar(descricaoCompleta)}
                    </td>

                    <td class="ncm">
                        ${escapar(ncm)}
                    </td>

                    <td class="quantidade">
                        ${numeroPtBrPdf(item.quantidade, 2, 3)}
                        ${escapar(unidade)}
                    </td>

                    <td class="unitario">
                        ${numeroPtBrPdf(item.valorUnitario, 4, 4)}
                    </td>

                    <td class="valor">
                        ${numeroPtBrPdf(item.total, 2, 2)}
                    </td>
                </tr>
            `;
        })
        .join("");

    const contasReceber =
        Array.isArray(o.venda?.contasReceber)
            ? o.venda.contasReceber
            : [];

    let vencimentos = [];

    if (contasReceber.length) {
        vencimentos = contasReceber.map(
            (conta, indice) => ({
                parcela:
                    conta.parcelaNumero ||
                    indice + 1,
                vencimento:
                    conta.dataVencimento,
                valor:
                    Number(
                        conta.valorOriginal ||
                        0
                    )
            })
        );
    } else {
        const qtd = Math.max(
            1,
            Number(
                o.quantidadeParcelas ||
                1
            )
        );

        const valorTotalCentavos =
            Math.round(
                Number(o.total || 0) *
                100
            );

        const base =
            Math.floor(
                valorTotalCentavos /
                qtd
            );

        const primeiroVencimento =
            o.primeiroVencimento
                ? new Date(
                    o.primeiroVencimento
                )
                : new Date(
                    o.criadoEm
                );

        for (
            let i = 0;
            i < qtd;
            i++
        ) {
            const vencimento =
                new Date(
                    primeiroVencimento
                );

            vencimento.setMonth(
                vencimento.getMonth() + i
            );

            const centavos =
                base +
                (
                    i <
                    valorTotalCentavos -
                    base * qtd
                        ? 1
                        : 0
                );

            vencimentos.push({
                parcela: i + 1,
                vencimento,
                valor: centavos / 100
            });
        }
    }

    const condicaoPagamento =
        vencimentos.length <= 1
            ? "A Vista"
            : `${vencimentos.length} Parcelas`;

    const linhasVencimentos =
        vencimentos
            .map(
                (item) => `
                    <tr>
                        <th>Parcela</th>
                        <td>${item.parcela}</td>
                    </tr>
                    <tr>
                        <th>Vencimento</th>
                        <td>${dataBrPdf(item.vencimento)}</td>
                    </tr>
                    <tr>
                        <th>Valor</th>
                        <td>${numeroPtBrPdf(item.valor, 2, 2)}</td>
                    </tr>
                `
            )
            .join(
                `<tr class="espaco-parcela"><td colspan="2"></td></tr>`
            );

    const usuarioGerador =
        o.criadoPor?.nome ||
        "Administrador";

    const previsaoFaturamento =
        o.primeiroVencimento ||
        o.dataValidade ||
        o.criadoEm;

    const janela = window.open(
        "",
        "_blank",
        "width=1000,height=900"
    );

    if (!janela) {
        return mostrarMensagem(
            "Permita pop-ups para gerar o PDF."
        );
    }

    janela.document.write(`
<!doctype html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">

    <title>
        Orçamento ${escapar(o.numero)}
    </title>

    <style>
        @page {
            size: A4 portrait;
            margin: 10mm 11mm 12mm 11mm;
        }

        * {
            box-sizing: border-box;
        }

        html,
        body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            color: #111111;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        body {
            width: 100%;
        }

        .pagina {
            min-height: 272mm;
            position: relative;
            padding-bottom: 18mm;
        }

        .cabecalho {
            display: grid;
            grid-template-columns: 34% 66%;
            align-items: start;
            min-height: 36mm;
        }

        .logo-wrap {
            display: flex;
            align-items: flex-start;
            justify-content: flex-start;
            padding-top: 0;
        }

        .logo-wrap img {
            width: 42mm;
            max-height: 24mm;
            object-fit: contain;
            object-position: left top;
        }

        .empresa {
            text-align: right;
            line-height: 1.35;
            padding-top: 1mm;
        }

        .empresa .razao {
            font-size: 15px;
            font-weight: 700;
            text-transform: uppercase;
            max-width: 128mm;
            margin-left: auto;
        }

        .empresa .site {
            font-size: 12px;
            font-weight: 700;
            margin-top: 1mm;
            margin-bottom: 3mm;
        }

        .titulo-orcamento {
            font-size: 21px;
            font-weight: 700;
            margin: 1mm 0 12mm 0;
        }

        h2 {
            margin: 0 0 3mm 0;
            font-size: 15px;
            line-height: 1.1;
        }

        .cliente-grid {
            display: grid;
            grid-template-columns: 49% 51%;
            column-gap: 6mm;
            margin-bottom: 11mm;
            min-height: 26mm;
        }

        .cliente-col {
            line-height: 1.45;
        }

        .cliente-nome {
            font-weight: 700;
            font-size: 12px;
            margin-bottom: 1mm;
        }

        .linha-info {
            display: grid;
            grid-template-columns: max-content 1fr;
            column-gap: 3mm;
            align-items: start;
            min-height: 5mm;
        }

        .linha-info .rotulo {
            font-weight: 700;
            white-space: nowrap;
        }

        .itens {
            margin-top: 1mm;
            margin-bottom: 4mm;
        }

        .tabela-itens {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
        }

        .tabela-itens th {
            background: #f9ae4b;
            color: #ffffff;
            font-size: 9px;
            font-weight: 700;
            padding: 2px 4px;
            border-right: 1px solid rgba(255,255,255,.55);
            text-align: left;
        }

        .tabela-itens th:nth-child(2),
        .tabela-itens th:nth-child(3),
        .tabela-itens th:nth-child(4),
        .tabela-itens th:nth-child(5) {
            text-align: right;
        }

        .tabela-itens td {
            background: #fff7ed;
            font-size: 8.7px;
            padding: 2px 4px;
            vertical-align: top;
            border: none;
        }

        .tabela-itens .produto {
            width: 61%;
        }

        .tabela-itens .ncm {
            width: 10%;
            text-align: right;
        }

        .tabela-itens .quantidade {
            width: 9%;
            text-align: right;
            white-space: nowrap;
        }

        .tabela-itens .unitario {
            width: 10%;
            text-align: right;
        }

        .tabela-itens .valor {
            width: 10%;
            text-align: right;
        }

        .resumo-wrap {
            width: 100%;
            display: flex;
            justify-content: flex-end;
            margin-bottom: 3mm;
        }

        .resumo {
            border-collapse: collapse;
            width: 49mm;
            font-size: 10px;
        }

        .resumo th {
            text-align: right;
            font-weight: 700;
            padding: 2px 5px;
            width: 28mm;
            background: #ffffff;
        }

        .resumo td {
            text-align: right;
            padding: 2px 4px;
            width: 21mm;
            background: #fff7ed;
        }

        .vencimentos {
            margin-top: 2mm;
            margin-bottom: 11mm;
        }

        .titulo-vencimentos {
            display: flex;
            align-items: baseline;
            gap: 1.5mm;
            margin-bottom: 4mm;
        }

        .titulo-vencimentos strong {
            font-size: 15px;
        }

        .titulo-vencimentos span {
            font-size: 14px;
        }

        .tabela-vencimentos {
            border-collapse: collapse;
            width: 39mm;
            font-size: 9px;
        }

        .tabela-vencimentos th {
            background: #fde0b9;
            text-align: right;
            font-weight: 700;
            padding: 4px 5px;
            width: 23mm;
        }

        .tabela-vencimentos td {
            background: #fff7ed;
            text-align: right;
            padding: 4px 5px;
            width: 16mm;
        }

        .espaco-parcela td {
            height: 2mm;
            background: #ffffff;
            padding: 0;
        }

        .outras-info {
            margin-top: 1mm;
            margin-bottom: 5mm;
        }

        .outras-info .linha {
            display: grid;
            grid-template-columns: max-content 1fr;
            gap: 4mm;
            max-width: 92mm;
            line-height: 1.4;
        }

        .outras-info .linha strong {
            white-space: nowrap;
        }

        .entrega {
            margin-top: 3mm;
        }

        .entrega-grid {
            width: 100%;
            margin-top: 3mm;
            border-collapse: separate;
            border-spacing: 0 5mm;
            table-layout: fixed;
            font-size: 9px;
        }

        .entrega-grid td {
            background: #f6f6f6;
            padding: 2px 4px;
            height: 4mm;
            color: #111111;
        }

        .rodape {
            position: absolute;
            left: 0;
            right: 0;
            bottom: 0;
            text-align: center;
            color: #8c8c8c;
            font-size: 8px;
            line-height: 1.4;
        }

        .sem-quebra {
            break-inside: avoid;
            page-break-inside: avoid;
        }

        @media print {
            body {
                margin: 0;
            }

            .pagina {
                min-height: 272mm;
            }
        }
    </style>
</head>

<body>
    <div class="pagina">

        <header class="cabecalho">
            <div class="logo-wrap">
                <img
                    src="${escaparHtml(logoEmpresa)}"
                    alt="Logo"
                >
            </div>

            <div class="empresa">
                <div class="razao">
                    ${escapar(
                        empresa.razaoSocial ||
                        "ELIAN ELETRIC EMPREENDIMENTOS E SERVICOS LTDA"
                    )}
                </div>

                <div class="site">
                    www.potenciapadroes.com.br
                </div>

                <div>
                    CNPJ:
                    ${escapar(
                        documentoEmpresa ||
                        empresa.cnpj
                    )}
                </div>

                <div>
                    Inscrição Estadual:
                    ${escapar(
                        empresa.inscricaoEstadual
                    )}
                </div>

                <div style="margin-top:3mm;">
                    ${escapar(enderecoEmpresa)}
                </div>

                ${
                    complementoEmpresa
                        ? `
                            <div>
                                ${escapar(complementoEmpresa)}
                            </div>
                        `
                        : ""
                }

                <div>
                    ${escapar(cidadeEmpresa)}
                    ${
                        empresa.cep
                            ? ` - CEP: ${escapar(empresa.cep)}`
                            : ""
                    }
                </div>

                <div>
                    Telefone:
                    ${escapar(
                        formatarTelefonePdf(
                            empresa.telefone ||
                            empresa.celular
                        )
                    )}
                </div>
            </div>
        </header>

        <div class="titulo-orcamento">
            ORÇAMENTO Nº
            ${escapar(o.numero)}
        </div>

        <section class="sem-quebra">
            <h2>
                Informações do Cliente
            </h2>

            <div class="cliente-grid">
                <div class="cliente-col">
                    <div class="cliente-nome">
                        ${escapar(
                            cliente.nome ||
                            "Consumidor Final"
                        )}
                    </div>

                    <div class="linha-info">
                        <span class="rotulo">
                            ${labelDocumentoCliente}:
                        </span>

                        <span>
                            ${escapar(
                                documentoCliente ||
                                "-"
                            )}
                        </span>
                    </div>

                    <div class="linha-info">
                        <span class="rotulo">
                            Email:
                        </span>

                        <span>
                            ${escapar(
                                cliente.email
                            )}
                        </span>
                    </div>
                </div>

                <div class="cliente-col">
                    <div class="linha-info">
                        <span class="rotulo">
                            Endereço:
                        </span>

                        <span>
                            ${escapar(
                                enderecoCliente
                            )}
                        </span>
                    </div>

                    <div class="linha-info">
                        <span class="rotulo">
                            Bairro:
                        </span>

                        <span>
                            ${escapar(
                                cliente.bairro
                            )}
                        </span>
                    </div>

                    <div class="linha-info">
                        <span class="rotulo">
                            Cidade:
                        </span>

                        <span>
                            ${escapar(
                                cidadeCliente
                            )}
                            ${
                                cliente.cep
                                    ? ` - <strong>CEP:</strong>&nbsp;&nbsp; ${escapar(cliente.cep)}`
                                    : ""
                            }
                        </span>
                    </div>
                </div>
            </div>
        </section>

        <section class="itens">
            <h2>
                Itens do ORÇAMENTO
            </h2>

            <table class="tabela-itens">
                <colgroup>
                    <col style="width:61%">
                    <col style="width:10%">
                    <col style="width:9%">
                    <col style="width:10%">
                    <col style="width:10%">
                </colgroup>

                <thead>
                    <tr>
                        <th>Produto</th>
                        <th>NCM</th>
                        <th>Quant.</th>
                        <th>Unit.</th>
                        <th>Valor Total</th>
                    </tr>
                </thead>

                <tbody>
                    ${
                        linhasItens ||
                        `
                            <tr>
                                <td colspan="5">
                                    Nenhum item.
                                </td>
                            </tr>
                        `
                    }
                </tbody>
            </table>
        </section>

        <div class="resumo-wrap sem-quebra">
            <table class="resumo">
                <tr>
                    <th>Subtotal:</th>
                    <td>
                        ${numeroPtBrPdf(o.subtotal, 2, 2)}
                    </td>
                </tr>

                <tr>
                    <th>IPI:</th>
                    <td>0,00</td>
                </tr>

                <tr>
                    <th>ICMS ST:</th>
                    <td>0,00</td>
                </tr>

                <tr>
                    <th>Total:</th>
                    <td>
                        ${numeroPtBrPdf(o.total, 2, 2)}
                    </td>
                </tr>
            </table>
        </div>

        <section class="vencimentos sem-quebra">
            <div class="titulo-vencimentos">
                <strong>Vencimentos</strong>
                <span>
                    ${escapar(condicaoPagamento)}
                </span>
            </div>

            <table class="tabela-vencimentos">
                ${linhasVencimentos}
            </table>
        </section>

        <section class="outras-info sem-quebra">
            <h2>
                Outras Informações
            </h2>

            <div class="linha">
                <strong>
                    ORÇAMENTO - incluído em:
                </strong>

                <span>
                    ${dataHoraBrPdf(o.criadoEm)}
                </span>
            </div>

            <div class="linha">
                <strong>
                    Previsão de Faturamento:
                </strong>

                <span>
                    ${dataBrPdf(previsaoFaturamento)}
                </span>
            </div>
        </section>

        <section class="entrega sem-quebra">
            <h2>
                Local de Entrega
            </h2>

            <table class="entrega-grid">
                <tr>
                    <td style="width:20%;">
                        CNPJ/CPF
                    </td>
                    <td style="width:55%;">
                        Nome/Razão Social
                    </td>
                    <td style="width:25%;">
                        Inscrição Estadual
                    </td>
                </tr>

                <tr>
                    <td style="width:20%;">
                        CEP
                    </td>
                    <td style="width:45%;">
                        Endereço
                    </td>
                    <td style="width:15%;">
                        Número
                    </td>
                    <td style="width:20%;">
                        Complemento
                    </td>
                </tr>

                <tr>
                    <td style="width:20%;">
                        Bairro
                    </td>
                    <td style="width:45%;">
                        Cidade
                    </td>
                    <td style="width:15%;">
                        Estado
                    </td>
                    <td style="width:20%;">
                        Telefone
                    </td>
                </tr>
            </table>
        </section>

        <footer class="rodape">
            <div>
                Gerado em
                ${dataHoraBrPdf(new Date())}
                por
                ${escapar(usuarioGerador)}
            </div>

            <div>
                Página 1 de 1
            </div>
        </footer>
    </div>

    <script>
        window.onload = () => {
            setTimeout(
                () => window.print(),
                450
            );
        };
    <\/script>
</body>
</html>
    `);

    janela.document.close();
}



modalOrcamento.addEventListener(
    "click",
    (event) => {

        if (event.target === modalOrcamento) {

            fecharModalOrcamento();

        }

    }
);

modalSelecionarProduto.addEventListener(
    "click",
    (event) => {

        if (event.target === modalSelecionarProduto) {

            fecharModalProduto();

        }

    }
);

document.addEventListener(
    "keydown",
    (event) => {

        if (event.key !== "Escape") {

            return;

        }

        if (
            modalSelecionarProduto.classList.contains(
                "active"
            )
        ) {

            fecharModalProduto();

            return;

        }

        if (
            modalOrcamento.classList.contains(
                "active"
            )
        ) {

            fecharModalOrcamento();

        }

    }
);

function escaparHtml(valor) {

    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}
