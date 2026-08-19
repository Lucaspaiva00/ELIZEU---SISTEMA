let orcamentos = [];
let clientes = [];
let produtos = [];
let servicos = [];
let itensOrcamento = [];

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

function preencherSelectClientes() {
    const select = document.getElementById("clienteId");

    select.innerHTML = `
        <option value="">
            Selecione um cliente
        </option>
    `;

    clientes.forEach((cliente) => {
        const option = document.createElement("option");

        option.value = cliente.id;
        option.textContent = `${cliente.nome} - ${cliente.cpfCnpj}`;

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
    calcularTotais();

    modalOrcamento.classList.add("active");
}

function fecharModalOrcamento() {
    modalOrcamento.classList.remove("active");

    formOrcamento.reset();

    orcamentoEditandoId = null;
    itensOrcamento = [];

    renderizarItens();
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
            `${v.sku} | ${v.cor || "-"} | ${v.tamanho || "-"} | ${moeda(v.precoVenda)}`;

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

                    variacao.cor,

                    variacao.tamanho

                ]

                    .filter(Boolean)

                    .join(" | "),

            quantidade,

            valorUnitario,

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

                    item.variacaoProduto.cor,

                    item.variacaoProduto.tamanho

                ]

                    .filter(Boolean)

                    .join(" | "),

            quantidade:
                Number(item.quantidade),

            valorUnitario:
                Number(item.valorUnitario),

            total:
                Number(item.total)

        });

    });

    renderizarItens();

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
            : `${item.variacaoProduto.cor || "-"} / ${item.variacaoProduto.tamanho || "-"}`;

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
            : [item.variacaoProduto?.cor, item.variacaoProduto?.tamanho].filter(Boolean).join(" / ");
        return `<tr><td>${escaparHtml(nome || "Item")}${variacao ? `<br><small>${escaparHtml(variacao)}</small>` : ""}</td><td>${Number(item.quantidade)}</td><td>${moeda(item.valorUnitario)}</td><td>${moeda(item.total)}</td></tr>`;
    }).join("");
    const janela = window.open("", "_blank", "width=1000,height=800");
    if (!janela) return mostrarMensagem("Permita pop-ups para gerar o PDF.");
    janela.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Orçamento ${o.numero}</title><style>
        body{font-family:Arial,sans-serif;color:#222;margin:40px} .top{display:flex;justify-content:space-between;border-bottom:3px solid #222;padding-bottom:18px;margin-bottom:24px}
        h1{margin:0;font-size:28px}.muted{color:#666}.box{border:1px solid #ddd;border-radius:8px;padding:16px;margin:16px 0}table{width:100%;border-collapse:collapse;margin-top:18px}th,td{padding:10px;border-bottom:1px solid #ddd;text-align:left}th{background:#f3f4f6}.total{font-size:24px;font-weight:bold;text-align:right;margin-top:24px}.footer{margin-top:50px;font-size:12px;color:#777;text-align:center}@media print{button{display:none}body{margin:15mm}}</style></head><body>
        <div class="top"><div><h1>ERP Elizeu</h1><div class="muted">Proposta Comercial</div></div><div style="text-align:right"><strong>ORÇAMENTO #${String(o.numero).padStart(5,"0")}</strong><br><span class="muted">${new Date(o.criadoEm).toLocaleDateString("pt-BR")}</span></div></div>
        <div class="box"><strong>Cliente:</strong> ${escaparHtml(o.cliente?.nome || "-")}<br><strong>CPF/CNPJ:</strong> ${escaparHtml(o.cliente?.cpfCnpj || "-")}<br><strong>Telefone:</strong> ${escaparHtml(o.cliente?.telefone || o.cliente?.celular || "-")} ${o.cliente?.email ? `<br><strong>E-mail:</strong> ${escaparHtml(o.cliente.email)}` : ""}</div>
        <table><thead><tr><th>Item</th><th>Qtd.</th><th>Unitário</th><th>Total</th></tr></thead><tbody>${itens}</tbody></table>
        <div style="margin-top:20px;text-align:right">Subtotal: <strong>${moeda(o.subtotal)}</strong><br>Desconto: ${moeda(o.desconto)}<br>Frete: ${moeda(o.frete)}<br>Outras despesas: ${moeda(o.outrasDespesas)}</div>
        <div class="total">Total: ${moeda(o.total)}</div>
        ${o.observacoes ? `<div class="box"><strong>Observações</strong><br>${escaparHtml(o.observacoes).replaceAll("\n","<br>")}</div>` : ""}
        <div class="footer">Documento gerado pelo ERP Elizeu.</div>
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
