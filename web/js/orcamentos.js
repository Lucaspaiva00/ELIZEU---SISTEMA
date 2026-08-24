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

                        min="1"

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
                <input type="number" class="form-control" min="0.001" step="0.001" value="${Number(custo.quantidade || 1)}" onchange="alterarCustoInterno(${index}, 'quantidade', this.value)">
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
    if (!r?.sucesso) return mostrarMensagem(r?.mensagem || "Erro ao carregar orçamento.");
    const o = r.orcamento;
    const itens = (o.itens || []).map(item => {
        const servico = item.tipo === "SERVICO";
        const nome = servico ? item.variacaoServico?.servico?.nome : item.variacaoProduto?.produto?.nome;
        const variacao = servico
            ? (item.variacaoServico?.descricao || item.variacaoServico?.codigo || "")
            : [item.variacaoProduto?.saida, item.variacaoProduto?.tamanho].filter(Boolean).join(" / ");
        return `<tr><td>${escaparHtml(nome || "Item")}${variacao ? `<br><small>${escaparHtml(variacao)}</small>` : ""}</td><td>${Number(item.quantidade)}</td><td>${moeda(item.valorUnitario)}</td><td>${moeda(item.total)}</td></tr>`;
    }).join("");
    const janela = window.open("", "_blank", "width=1000,height=800");
    if (!janela) return mostrarMensagem("Permita pop-ups para gerar o PDF.");
    janela.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Orçamento ${o.numero}</title><style>
        body{font-family:Arial,sans-serif;color:#222;margin:40px} .top{display:flex;justify-content:space-between;border-bottom:3px solid #222;padding-bottom:18px;margin-bottom:24px}
        h1{margin:0;font-size:28px}.muted{color:#666}.box{border:1px solid #ddd;border-radius:8px;padding:16px;margin:16px 0}table{width:100%;border-collapse:collapse;margin-top:18px}th,td{padding:10px;border-bottom:1px solid #ddd;text-align:left}th{background:#f3f4f6}.total{font-size:24px;font-weight:bold;text-align:right;margin-top:24px}.footer{margin-top:50px;font-size:12px;color:#777;text-align:center}@media print{button{display:none}body{margin:15mm}}</style></head><body>
        <div class="top"><div><h1>Elian Sigs</h1><div class="muted">Proposta Comercial</div></div><div style="text-align:right"><strong>ORÇAMENTO #${String(o.numero).padStart(5,"0")}</strong><br><span class="muted">${new Date(o.criadoEm).toLocaleDateString("pt-BR")}</span></div></div>
        <div class="box"><strong>Cliente:</strong> ${escaparHtml(o.cliente?.nome || "-")}<br><strong>CPF/CNPJ:</strong> ${escaparHtml(o.cliente?.cpfCnpj || "-")}<br><strong>Telefone:</strong> ${escaparHtml(o.cliente?.telefone || o.cliente?.celular || "-")} ${o.cliente?.email ? `<br><strong>E-mail:</strong> ${escaparHtml(o.cliente.email)}` : ""}</div>
        <table><thead><tr><th>Item</th><th>Qtd.</th><th>Unitário</th><th>Total</th></tr></thead><tbody>${itens}</tbody></table>
        <div style="margin-top:20px;text-align:right">Subtotal: <strong>${moeda(o.subtotal)}</strong><br>Desconto: ${moeda(o.desconto)}<br>Frete: ${moeda(o.frete)}<br>Acréscimos: ${moeda(o.outrasDespesas)}</div>
        <div class="total">Total: ${moeda(o.total)}</div>
        ${o.observacoes ? `<div class="box"><strong>Observações</strong><br>${escaparHtml(o.observacoes).replaceAll("\n","<br>")}</div>` : ""}
        <div class="footer">Documento gerado pelo Elian Sigs.</div>
        <script>window.onload=()=>setTimeout(()=>window.print(),300);<\/script></body></html>`);
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
