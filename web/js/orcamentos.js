let orcamentos = [];
let clientes = [];
let produtos = [];
let servicos = [];
let itensOrcamento = [];

let orcamentoEditandoId = null;

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

function renderizarTabelaOrcamentos(lista) {
    const tbody = document.getElementById("tabelaOrcamentos");

    tbody.innerHTML = "";

    if (!lista.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    Nenhum orçamento cadastrado.
                </td>
            </tr>
        `;

        return;
    }

    lista.forEach((orcamento) => {
        const linha = document.createElement("tr");

        linha.innerHTML = `
            <td>
                <strong>
                    #${String(orcamento.numero).padStart(5, "0")}
                </strong>
            </td>

            <td>
                ${escaparHtml(
            orcamento.cliente?.nome || "-"
        )}
            </td>

            <td>
                ${data(orcamento.criadoEm)}
            </td>

            <td>
                <strong>
                    ${moeda(orcamento.total)}
                </strong>
            </td>

            <td>
                <span class="badge badge-warning">
                    Em elaboração
                </span>
            </td>

            <td>
                <div class="table-actions">

                    <button
                        type="button"
                        class="btn btn-light"
                        onclick="visualizarOrcamento(${orcamento.id})"
                        title="Visualizar orçamento">

                        <i class="fas fa-eye"></i>

                    </button>

                    <button
                        type="button"
                        class="btn btn-warning"
                        onclick="editarOrcamento(${orcamento.id})"
                        title="Editar orçamento">

                        <i class="fas fa-edit"></i>

                    </button>

                    <button
                        type="button"
                        class="btn btn-danger"
                        onclick="excluirOrcamento(${orcamento.id})"
                        title="Excluir orçamento">

                        <i class="fas fa-trash"></i>

                    </button>

                </div>
            </td>
        `;

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

    document.getElementById("viewStatus").value =
        "Em elaboração";

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

    document
        .getElementById("modalVisualizarOrcamento")
        .classList
        .add("active");

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
