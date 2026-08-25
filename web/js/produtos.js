let produtos = [];
let categorias = [];
let produtoEditandoId = null;
let produtoDetalhesId = null;
let variacoes = [];
let composicao = [];

const modalProduto = document.getElementById("modalProduto");
const modalDetalhesProduto = document.getElementById(
    "modalDetalhesProduto"
);
const formProduto = document.getElementById("formProduto");

document.addEventListener("DOMContentLoaded", async () => {
    await carregarCategorias();
    await carregarProdutos();
});

async function carregarCategorias() {
    try {
        const resposta = await get("/categorias");

        if (!resposta || !resposta.sucesso) {
            mostrarMensagem(
                resposta?.mensagem ||
                "Erro ao carregar categorias."
            );

            return;
        }

        categorias = resposta.categorias || [];

        preencherCategorias();
    } catch (erro) {
        console.error(erro);
        mostrarMensagem("Erro ao carregar categorias.");
    }
}

function preencherCategorias() {
    const select = document.getElementById("categoriaId");

    select.innerHTML = `
        <option value="">
            Selecione uma categoria
        </option>
    `;

    categorias.forEach((categoria) => {
        const option = document.createElement("option");

        option.value = categoria.id;
        option.textContent = categoria.nome;

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

        renderizarTabela(produtos);
    } catch (erro) {
        console.error(erro);
        mostrarMensagem("Erro ao carregar produtos.");
    }
}

function renderizarTabela(lista) {
    const tbody = document.getElementById("tabelaProdutos");

    tbody.innerHTML = "";

    if (!lista.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    Nenhum produto cadastrado.
                </td>
            </tr>
        `;

        return;
    }

    lista.forEach((produto) => {
        const quantidadeVariacoes =
            produto.variacoes?.length || 0;

        const linha = document.createElement("tr");

        linha.innerHTML = `
            <td>
                ${escaparHtml(produto.codigo)}
            </td>

            <td>
                <button
                    type="button"
                    class="produto-link"
                    onclick="visualizarProduto(${produto.id})"
                    title="Visualizar detalhes">

                    ${escaparHtml(produto.nome)}

                </button>
            </td>

            <td>
                ${escaparHtml(produto.categoria?.nome || "-")}
            </td>

            <td>
                ${escaparHtml(produto.marca || "-")}
            </td>

            <td>
                <span class="badge badge-primary">
                    ${quantidadeVariacoes}
                    ${quantidadeVariacoes === 1
                ? "variação"
                : "variações"}
                </span>
            </td>

            <td>

                <div class="table-actions">

                    <button
                        type="button"
                        class="btn btn-light"
                        onclick="visualizarProduto(${produto.id})"
                        title="Visualizar produto">

                        <i class="fas fa-eye"></i>

                    </button>

                    <button
                        type="button"
                        class="btn btn-warning"
                        onclick="editarProduto(${produto.id})"
                        title="Editar produto">

                        <i class="fas fa-edit"></i>

                    </button>

                    <button
                        type="button"
                        class="btn btn-danger"
                        onclick="excluirProduto(${produto.id})"
                        title="Excluir produto">

                        <i class="fas fa-trash"></i>

                    </button>

                </div>

            </td>
        `;

        tbody.appendChild(linha);
    });
}

function abrirModalProduto() {
    produtoEditandoId = null;
    variacoes = [];
    composicao = [];

    formProduto.reset();

    document.getElementById("codigoAutomatico").checked = true;
    alternarCodigoAutomatico();

    document.getElementById("controlaEstoque").checked = true;
    document.getElementById(
        "permiteVendaSemEstoque"
    ).checked = false;
    preencherCampoProduto("margemLucroPadrao", 0);

    document.querySelector(
        "#modalProduto .modal-title"
    ).textContent = "Cadastro de Produto";

    adicionarVariacao();
    renderizarComposicao();

    modalProduto.classList.add("active");
}

function fecharModalProduto() {
    modalProduto.classList.remove("active");

    formProduto.reset();

    produtoEditandoId = null;
    variacoes = [];
    composicao = [];

    renderizarVariacoes();
    renderizarComposicao();
}

function adicionarVariacao() {
    variacoes.push({
        id: null,
        sku: "",
        codigoBarras: "",
        descricao: "",
        saida: "",
        tamanho: "",
        imagemPrincipal: "",
        gtin: "",
        localizacaoEstoque: "",
        peso: null,
        precoCusto: 0,
        precoVenda: 0,
        estoqueAtual: 0,
        estoqueMinimo: 0,
        ativo: true
    });

    renderizarVariacoes();
}

function renderizarVariacoes() {
    const tbody = document.getElementById("tabelaVariacoes");

    tbody.innerHTML = "";

    if (!variacoes.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center">
                    Nenhuma variação adicionada.
                </td>
            </tr>
        `;

        return;
    }

    variacoes.forEach((variacao, index) => {
        const linha = document.createElement("tr");

        linha.innerHTML = `
            <td>
                <input
                    type="text"
                    class="form-control"
                    value="${escaparAtributo(variacao.sku)}"
                    oninput="atualizarVariacao(
                        ${index},
                        'sku',
                        this.value
                    )"
                    placeholder="SKU">
            </td>

            <td>
                <input
                    type="text"
                    class="form-control"
                    value="${escaparAtributo(variacao.tamanho)}"
                    oninput="atualizarVariacao(
                        ${index},
                        'tamanho',
                        this.value
                    )"
                    placeholder="Ex.: 5m / 7m">
            </td>

            <td>
                <input
                    type="text"
                    class="form-control"
                    value="${escaparAtributo(variacao.saida)}"
                    oninput="atualizarVariacao(
                        ${index},
                        'saida',
                        this.value
                    )"
                    placeholder="Ex.: Aérea / Subterrânea">
            </td>

            <td>
                <input
                    type="text"
                    class="form-control"
                    value="${escaparAtributo(
            variacao.codigoBarras
        )}"
                    oninput="atualizarVariacao(
                        ${index},
                        'codigoBarras',
                        this.value
                    )"
                    placeholder="Código">
            </td>

            <td>
                <input
                    type="number"
                    min="0"
                    step="0.01"
                    class="form-control"
                    value="${numeroInput(variacao.precoCusto)}"
                    oninput="atualizarVariacaoNumero(
                        ${index},
                        'precoCusto',
                        this.value
                    )">
            </td>

            <td>
                <input
                    type="number"
                    min="0"
                    step="0.01"
                    class="form-control"
                    value="${numeroInput(variacao.precoVenda)}"
                    oninput="atualizarVariacaoNumero(
                        ${index},
                        'precoVenda',
                        this.value
                    )">
            </td>

            <td>
                <input
                    type="number"
                    min="0"
                    step="0.001"
                    class="form-control"
                    value="${numeroInput(variacao.estoqueAtual)}"
                    oninput="atualizarVariacaoNumero(
                        ${index},
                        'estoqueAtual',
                        this.value
                    )">
            </td>

            <td>
                <button
                    type="button"
                    class="btn btn-danger"
                    onclick="removerVariacao(${index})"
                    title="Remover variação">

                    <i class="fas fa-trash"></i>

                </button>
            </td>
        `;

        tbody.appendChild(linha);
    });
}

function atualizarVariacao(index, campo, valor) {
    if (!variacoes[index]) {
        return;
    }

    variacoes[index][campo] = valor;
}

function atualizarVariacaoNumero(index, campo, valor) {
    if (!variacoes[index]) {
        return;
    }

    const numero = Number(valor);

    variacoes[index][campo] = Number.isNaN(numero)
        ? 0
        : numero;
}

function removerVariacao(index) {
    variacoes.splice(index, 1);

    renderizarVariacoes();
}

function variacoesAtivasProdutoComposicao(produto) {
    return (produto?.variacoes || [])
        .filter((variacao) => variacao.ativo !== false)
        .sort((a, b) =>
            rotuloVariacaoComposicao(a).localeCompare(
                rotuloVariacaoComposicao(b),
                "pt-BR",
                { sensitivity: "base" }
            )
        );
}

function rotuloVariacaoComposicao(variacao) {
    if (!variacao) return "Variação";

    const partes = [
        variacao.tamanho,
        variacao.saida,
        variacao.descricao
    ]
        .map((valor) => String(valor || "").trim())
        .filter(Boolean);

    const unicas = [...new Set(partes)];

    if (unicas.length) {
        return unicas.join(" / ");
    }

    return String(variacao.sku || "Variação").trim();
}

function custoSugeridoVariacaoComposicao(variacao) {
    return Number(variacao?.precoCusto || 0);
}

function adicionarComponente() {
    composicao.push({
        produtoId: null,
        variacaoProdutoId: null,
        variacaoNome: "",
        sku: "",
        nome: "",
        quantidade: 1,
        custoUnitario: 0,
        total: 0
    });

    renderizarComposicao();
}

function produtosDisponiveisParaComposicao() {
    return [...produtos]
        .filter((produto) => Number(produto.id) !== Number(produtoEditandoId))
        .sort((a, b) =>
            String(a.nome || "").localeCompare(
                String(b.nome || ""),
                "pt-BR",
                { sensitivity: "base" }
            )
        );
}

function opcoesProdutosComposicao(produtoSelecionadoId) {
    const atual = Number(produtoSelecionadoId) || 0;

    return `
        <option value="">Item manual</option>
        ${produtosDisponiveisParaComposicao()
            .map((produto) => `
                <option
                    value="${produto.id}"
                    ${Number(produto.id) === atual ? "selected" : ""}
                >
                    ${escaparHtml(produto.nome || "Produto")}
                </option>
            `)
            .join("")}
    `;
}

function produtoDaComposicao(produtoId) {
    const id = Number(produtoId);
    if (!Number.isInteger(id) || id <= 0) return null;

    return produtos.find(
        (produto) => Number(produto.id) === id
    ) || null;
}

function variacaoDaComposicao(produtoId, variacaoProdutoId) {
    const produto = produtoDaComposicao(produtoId);
    if (!produto) return null;

    const id = Number(variacaoProdutoId);
    if (!Number.isInteger(id) || id <= 0) return null;

    return (produto.variacoes || []).find(
        (variacao) => Number(variacao.id) === id
    ) || null;
}

function opcoesVariacoesComposicao(produtoId, variacaoSelecionadaId) {
    const produto = produtoDaComposicao(produtoId);

    if (!produto) {
        return '<option value="">Selecione um produto primeiro</option>';
    }

    const variacoesProduto = variacoesAtivasProdutoComposicao(produto);
    const atual = Number(variacaoSelecionadaId) || 0;

    if (!variacoesProduto.length) {
        return '<option value="">Produto sem variações ativas</option>';
    }

    return `
        <option value="">Selecione a variação</option>
        ${variacoesProduto
            .map((variacao) => `
                <option
                    value="${variacao.id}"
                    ${Number(variacao.id) === atual ? "selected" : ""}
                >
                    ${escaparHtml(rotuloVariacaoComposicao(variacao))}
                </option>
            `)
            .join("")}
    `;
}

function renderizarComposicao() {
    const tbody = document.getElementById("tabelaComposicao");

    if (!tbody) return;

    tbody.innerHTML = "";

    if (!composicao.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">
                    Nenhum item na composição. Use esta área quando o produto for um padrão composto por materiais.
                </td>
            </tr>
        `;
        atualizarResumoComposicao();
        return;
    }

    composicao.forEach((item, index) => {
        const quantidade = Number(item.quantidade || 0);
        const custoUnitario = Number(item.custoUnitario || 0);
        item.total = quantidade * custoUnitario;

        const produtoSelecionado = produtoDaComposicao(item.produtoId);
        const usaProdutoCadastrado = Boolean(produtoSelecionado);

        const linha = document.createElement("tr");
        linha.innerHTML = `
            <td>
                <select
                    class="form-control"
                    onchange="selecionarProdutoComposicao(${index}, this.value)"
                >
                    ${opcoesProdutosComposicao(item.produtoId)}
                </select>
            </td>

            <td>
                <select
                    class="form-control"
                    ${usaProdutoCadastrado ? "" : "disabled"}
                    onchange="selecionarVariacaoComposicao(${index}, this.value)"
                    title="Escolha exatamente a variação que compõe este padrão"
                >
                    ${opcoesVariacoesComposicao(item.produtoId, item.variacaoProdutoId)}
                </select>
            </td>

            <td>
                <input
                    type="text"
                    class="form-control"
                    value="${escaparAtributo(item.nome || "")}"
                    placeholder="Ex.: Caixa, cabo, disjuntor..."
                    ${usaProdutoCadastrado ? "readonly" : ""}
                    oninput="atualizarComponente(${index}, 'nome', this.value)"
                >
            </td>

            <td>
                <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    class="form-control"
                    value="${numeroInput(item.quantidade || 1)}"
                    onchange="atualizarComponenteNumero(${index}, 'quantidade', this.value)"
                >
            </td>

            <td>
                <input
                    type="number"
                    min="0"
                    step="0.01"
                    class="form-control"
                    value="${numeroInput(item.custoUnitario || 0)}"
                    ${item.variacaoProdutoId ? "readonly" : ""}
                    onchange="atualizarComponenteNumero(${index}, 'custoUnitario', this.value)"
                    title="${item.variacaoProdutoId ? "Custo atualizado automaticamente pela variação selecionada" : "Informe o custo do item manual"}"
                >
            </td>

            <td>
                <strong>${moeda(item.total || 0)}</strong>
            </td>

            <td>
                <button
                    type="button"
                    class="btn btn-danger"
                    onclick="removerComponente(${index})"
                    title="Remover item da composição"
                >
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;

        tbody.appendChild(linha);
    });

    atualizarResumoComposicao();
}

function selecionarProdutoComposicao(index, valor) {
    const item = composicao[index];
    if (!item) return;

    const produtoId = Number(valor);

    if (!Number.isInteger(produtoId) || produtoId <= 0) {
        item.produtoId = null;
        item.variacaoProdutoId = null;
        item.variacaoNome = "";
        item.sku = "";
        item.nome = "";
        item.custoUnitario = 0;
        item.total = 0;
        renderizarComposicao();
        return;
    }

    const produto = produtoDaComposicao(produtoId);
    if (!produto) return;

    item.produtoId = produto.id;
    item.nome = produto.nome || "";
    item.variacaoProdutoId = null;
    item.variacaoNome = "";
    item.sku = "";
    item.custoUnitario = 0;

    const variacoesProduto = variacoesAtivasProdutoComposicao(produto);

    // Se houver uma única opção, seleciona automaticamente.
    // Com duas ou mais opções (ex.: Monofásico / Trifásico), o usuário escolhe.
    if (variacoesProduto.length === 1) {
        const variacao = variacoesProduto[0];
        item.variacaoProdutoId = variacao.id;
        item.variacaoNome = rotuloVariacaoComposicao(variacao);
        item.sku = variacao.sku || "";
        item.custoUnitario = custoSugeridoVariacaoComposicao(variacao);
    }

    item.total = Number(item.quantidade || 1) * Number(item.custoUnitario || 0);

    renderizarComposicao();
}

function selecionarVariacaoComposicao(index, valor) {
    const item = composicao[index];
    if (!item) return;

    const variacaoId = Number(valor);

    if (!Number.isInteger(variacaoId) || variacaoId <= 0) {
        item.variacaoProdutoId = null;
        item.variacaoNome = "";
        item.sku = "";
        item.custoUnitario = 0;
        item.total = 0;
        renderizarComposicao();
        return;
    }

    const variacao = variacaoDaComposicao(item.produtoId, variacaoId);

    if (!variacao) {
        mostrarMensagem("A variação selecionada não pertence ao produto escolhido.");
        return;
    }

    item.variacaoProdutoId = variacao.id;
    item.variacaoNome = rotuloVariacaoComposicao(variacao);
    item.sku = variacao.sku || "";
    item.custoUnitario = custoSugeridoVariacaoComposicao(variacao);
    item.total = Number(item.quantidade || 1) * Number(item.custoUnitario || 0);

    renderizarComposicao();
}

function atualizarComponente(index, campo, valor) {
    if (!composicao[index]) return;
    composicao[index][campo] = valor;
}

function atualizarComponenteNumero(index, campo, valor) {
    if (!composicao[index]) return;

    const numero = Number(valor);
    composicao[index][campo] = Number.isFinite(numero) ? numero : 0;
    composicao[index].total =
        Number(composicao[index].quantidade || 0) *
        Number(composicao[index].custoUnitario || 0);

    renderizarComposicao();
}

function removerComponente(index) {
    composicao.splice(index, 1);
    renderizarComposicao();
}

function calcularCustoComposicao() {
    return composicao.reduce(
        (total, item) =>
            total +
            Number(item.quantidade || 0) *
            Number(item.custoUnitario || 0),
        0
    );
}

function margemDesejadaComposicao() {
    const campo = document.getElementById("margemLucroPadrao");
    const margem = Number(campo?.value || 0);
    return Number.isFinite(margem) ? Math.max(0, Math.min(margem, 99.99)) : 0;
}

function calcularPrecoVendaSugerido(custoBase, margem = margemDesejadaComposicao()) {
    const custo = Number(custoBase || 0);
    if (!Number.isFinite(custo) || custo <= 0) return 0;
    if (!Number.isFinite(margem) || margem <= 0) return custo;
    if (margem >= 100) return 0;

    return Math.round(((custo / (1 - margem / 100)) + Number.EPSILON) * 100) / 100;
}

function atualizarResumoComposicao() {
    const custoBase = calcularCustoComposicao();
    const precoSugerido = calcularPrecoVendaSugerido(custoBase);
    const elemento = document.getElementById("custoComposicaoResumo");
    const preco = document.getElementById("precoVendaSugeridoResumo");

    if (elemento) elemento.textContent = moeda(custoBase);
    if (preco) preco.textContent = moeda(precoSugerido);
}

function aplicarCustoComposicaoNasVariacoes() {
    const custoBase = calcularCustoComposicao();
    const margem = margemDesejadaComposicao();
    const precoSugerido = calcularPrecoVendaSugerido(custoBase, margem);

    if (!composicao.length) {
        mostrarMensagem("Adicione os itens que compõem o padrão antes de calcular o custo base.");
        return;
    }

    if (!variacoes.length) {
        mostrarMensagem("Cadastre ao menos uma variação antes de aplicar o custo base.");
        return;
    }

    variacoes.forEach((variacao) => {
        variacao.precoCusto = custoBase;
        if (margem > 0) variacao.precoVenda = precoSugerido;
    });

    renderizarVariacoes();
    mostrarMensagem(
        margem > 0
            ? `Custo ${moeda(custoBase)} e preço sugerido ${moeda(precoSugerido)} aplicados às variações.`
            : `Custo base de ${moeda(custoBase)} aplicado às variações. Informe uma margem para calcular o preço de venda.`
    );
}

function alternarCodigoAutomatico() {
    const checkbox = document.getElementById("codigoAutomatico");
    const campo = document.getElementById("codigo");

    if (!checkbox || !campo) return;

    campo.readOnly = checkbox.checked;
    campo.placeholder = checkbox.checked
        ? "Gerado automaticamente ao salvar"
        : "Digite o código do produto";

    if (checkbox.checked && !produtoEditandoId) {
        campo.value = "";
    }
}

async function salvarProduto() {
    const botaoSalvar = document.querySelector(
        "#modalProduto .modal-footer .btn-primary"
    );

    const estavaEditando = Boolean(produtoEditandoId);

    try {
        const dados = obterDadosFormulario();

        validarProduto(dados);

        if (botaoSalvar) {
            botaoSalvar.disabled = true;
            botaoSalvar.innerHTML = `
                <i class="fas fa-spinner fa-spin"></i>
                Salvando...
            `;
        }

        let resposta;

        if (produtoEditandoId) {
            resposta = await put(
                `/produtos/${produtoEditandoId}`,
                dados
            );
        } else {
            resposta = await post("/produtos", dados);
        }

        if (!resposta || !resposta.sucesso) {
            mostrarMensagem(
                resposta?.mensagem ||
                "Erro ao salvar produto."
            );

            return;
        }

        fecharModalProduto();

        await carregarProdutos();

        mostrarMensagem(
            estavaEditando
                ? "Produto atualizado com sucesso."
                : "Produto cadastrado com sucesso."
        );
    } catch (erro) {
        console.error(erro);

        mostrarMensagem(
            erro.message || "Erro ao salvar produto."
        );
    } finally {
        if (botaoSalvar) {
            botaoSalvar.disabled = false;
            botaoSalvar.innerHTML = `
                <i class="fas fa-save"></i>
                Salvar Produto
            `;
        }
    }
}

function obterDadosFormulario() {
    const codigoAutomatico = document.getElementById("codigoAutomatico").checked;

    return {
        codigo: codigoAutomatico ? null : valorCampoProduto("codigo"),
        codigoAutomatico,
        nome: valorCampoProduto("nome"),
        categoriaId: Number(
            document.getElementById("categoriaId").value
        ),
        descricao:
            valorCampoProduto("descricao") || null,
        marca:
            valorCampoProduto("marca") || null,
        unidadeMedida:
            document.getElementById("unidadeMedida").value,
        controlaEstoque:
            document.getElementById("controlaEstoque").checked,
        permiteVendaSemEstoque:
            document.getElementById(
                "permiteVendaSemEstoque"
            ).checked,
        ncm:
            valorCampoProduto("ncm") || null,
        cfopPadrao:
            valorCampoProduto("cfopPadrao") || null,
        origemMercadoria:
            valorCampoProduto("origemMercadoria") || null,
        margemLucroPadrao: Number(document.getElementById("margemLucroPadrao")?.value || 0),
        ativo: true,
        composicao: composicao
            .map((item) => ({
                produtoId: item.produtoId || null,
                variacaoProdutoId: item.variacaoProdutoId || null,
                variacaoNome: String(item.variacaoNome || "").trim() || null,
                sku: String(item.sku || "").trim() || null,
                nome: String(item.nome || "").trim(),
                quantidade: Number(item.quantidade || 0),
                custoUnitario: Number(item.custoUnitario || 0),
                total: Number(item.quantidade || 0) * Number(item.custoUnitario || 0)
            }))
            .filter((item) =>
                item.produtoId ||
                item.nome ||
                item.custoUnitario > 0
            ),
        variacoes: variacoes.map((variacao) => ({
            id: variacao.id || null,
            sku: String(variacao.sku || "").trim(),
            codigoBarras:
                String(variacao.codigoBarras || "").trim() ||
                null,
            descricao:
                String(variacao.descricao || "").trim() ||
                null,
            saida:
                String(variacao.saida || "").trim() || null,
            tamanho:
                String(variacao.tamanho || "").trim() ||
                null,
            imagemPrincipal:
                variacao.imagemPrincipal || null,
            gtin:
                variacao.gtin || null,
            localizacaoEstoque:
                variacao.localizacaoEstoque || null,
            peso:
                variacao.peso === "" ||
                    variacao.peso === null
                    ? null
                    : Number(variacao.peso),
            precoCusto:
                Number(variacao.precoCusto) || 0,
            precoVenda:
                Number(variacao.precoVenda) || 0,
            estoqueAtual:
                Number(variacao.estoqueAtual) || 0,
            estoqueMinimo:
                Number(variacao.estoqueMinimo) || 0,
            ativo:
                variacao.ativo !== false
        }))
    };
}

function validarProduto(produto) {
    if (!produto.codigoAutomatico && !produto.codigo) {
        throw new Error("Informe o código do produto ou marque a geração automática.");
    }

    if (!produto.nome) {
        throw new Error("Informe o nome do produto.");
    }

    if (!produto.categoriaId) {
        throw new Error("Selecione uma categoria.");
    }

    if (!produto.variacoes.length) {
        throw new Error(
            "Cadastre ao menos uma variação."
        );
    }

    if (!Number.isFinite(produto.margemLucroPadrao) || produto.margemLucroPadrao < 0 || produto.margemLucroPadrao >= 100) {
        throw new Error("A margem desejada deve estar entre 0% e 99,99%.");
    }

    produto.composicao.forEach((item, index) => {
        if (!item.nome) {
            throw new Error(`Informe o item/material da composição ${index + 1}.`);
        }

        if (item.produtoId && !item.variacaoProdutoId) {
            const produtoComponente = produtoDaComposicao(item.produtoId);
            const quantidadeVariacoes = variacoesAtivasProdutoComposicao(produtoComponente).length;

            if (quantidadeVariacoes > 0) {
                throw new Error(
                    `Selecione a variação do item ${item.nome} na composição ${index + 1}.`
                );
            }
        }

        if (!Number.isFinite(item.quantidade) || item.quantidade <= 0) {
            throw new Error(`Informe uma quantidade válida na composição ${index + 1}.`);
        }

        if (!Number.isFinite(item.custoUnitario) || item.custoUnitario < 0) {
            throw new Error(`Informe um custo válido na composição ${index + 1}.`);
        }
    });

    const skus = new Set();

    produto.variacoes.forEach((variacao, index) => {
        const numeroVariacao = index + 1;

        if (!variacao.sku) {
            throw new Error(
                `Informe o SKU da variação ${numeroVariacao}.`
            );
        }

        const skuNormalizado =
            variacao.sku.toLowerCase();

        if (skus.has(skuNormalizado)) {
            throw new Error(
                `O SKU ${variacao.sku} está repetido.`
            );
        }

        skus.add(skuNormalizado);

        if (variacao.precoCusto < 0) {
            throw new Error(
                `O custo da variação ${numeroVariacao} é inválido.`
            );
        }

        if (variacao.precoVenda <= 0) {
            throw new Error(
                `Informe o preço de venda da variação ${numeroVariacao}.`
            );
        }

        if (variacao.estoqueAtual < 0) {
            throw new Error(
                `O estoque da variação ${numeroVariacao} é inválido.`
            );
        }
    });
}

function editarProduto(id) {
    const produto = produtos.find(
        (item) => item.id === id
    );

    if (!produto) {
        mostrarMensagem("Produto não encontrado.");
        return;
    }

    produtoEditandoId = produto.id;

    document.getElementById("codigoAutomatico").checked = false;
    preencherCampoProduto("codigo", produto.codigo);
    alternarCodigoAutomatico();
    preencherCampoProduto("nome", produto.nome);
    preencherCampoProduto(
        "categoriaId",
        produto.categoriaId
    );
    preencherCampoProduto(
        "descricao",
        produto.descricao
    );
    preencherCampoProduto("marca", produto.marca);
    preencherCampoProduto(
        "unidadeMedida",
        produto.unidadeMedida || "UN"
    );
    preencherCampoProduto("ncm", produto.ncm);
    preencherCampoProduto(
        "cfopPadrao",
        produto.cfopPadrao
    );
    preencherCampoProduto(
        "origemMercadoria",
        produto.origemMercadoria
    );
    preencherCampoProduto(
        "margemLucroPadrao",
        Number(produto.margemLucroPadrao || 0)
    );

    document.getElementById(
        "controlaEstoque"
    ).checked = produto.controlaEstoque !== false;

    document.getElementById(
        "permiteVendaSemEstoque"
    ).checked = Boolean(
        produto.permiteVendaSemEstoque
    );

    composicao = Array.isArray(produto.composicao)
        ? produto.composicao.map((item) => {
            const produtoComponente = produtoDaComposicao(item?.produtoId);
            let variacaoProdutoId = item?.variacaoProdutoId || null;
            let variacaoNome = item?.variacaoNome || "";
            let sku = item?.sku || "";

            // Compatibilidade com composições antigas, gravadas antes da escolha de variação.
            // Se o produto possui uma única variação, ela é assumida automaticamente.
            if (produtoComponente && !variacaoProdutoId) {
                const opcoes = variacoesAtivasProdutoComposicao(produtoComponente);
                if (opcoes.length === 1) {
                    variacaoProdutoId = opcoes[0].id;
                    variacaoNome = rotuloVariacaoComposicao(opcoes[0]);
                    sku = opcoes[0].sku || "";
                }
            }

            const variacaoAtual = variacaoProdutoId
                ? variacaoDaComposicao(item?.produtoId, variacaoProdutoId)
                : null;
            const custoAtual = variacaoAtual
                ? custoSugeridoVariacaoComposicao(variacaoAtual)
                : Number(item?.custoUnitario || 0);

            return {
                produtoId: item?.produtoId || null,
                variacaoProdutoId,
                variacaoNome: variacaoAtual ? rotuloVariacaoComposicao(variacaoAtual) : variacaoNome,
                sku: variacaoAtual?.sku || sku,
                nome: item?.nome || "",
                quantidade: Number(item?.quantidade || 1),
                custoUnitario: custoAtual,
                total: Number(item?.quantidade || 1) * custoAtual
            };
        })
        : [];

    renderizarComposicao();

    variacoes = (produto.variacoes || []).map(
        (variacao) => ({
            id: variacao.id,
            sku: variacao.sku || "",
            codigoBarras:
                variacao.codigoBarras || "",
            descricao:
                variacao.descricao || "",
            saida:
                variacao.saida || "",
            tamanho:
                variacao.tamanho || "",
            imagemPrincipal:
                variacao.imagemPrincipal || "",
            gtin:
                variacao.gtin || "",
            localizacaoEstoque:
                variacao.localizacaoEstoque || "",
            peso:
                variacao.peso ?? null,
            precoCusto:
                Number(variacao.precoCusto) || 0,
            precoVenda:
                Number(variacao.precoVenda) || 0,
            estoqueAtual:
                Number(variacao.estoqueAtual) || 0,
            estoqueMinimo:
                Number(variacao.estoqueMinimo) || 0,
            ativo:
                variacao.ativo !== false
        })
    );

    if (!variacoes.length) {
        adicionarVariacao();
    } else {
        renderizarVariacoes();
    }

    document.querySelector(
        "#modalProduto .modal-title"
    ).textContent = "Editar Produto";

    fecharDetalhesProduto();

    modalProduto.classList.add("active");
}

function visualizarProduto(id) {
    const produto = produtos.find(
        (item) => item.id === id
    );

    if (!produto) {
        mostrarMensagem("Produto não encontrado.");
        return;
    }

    produtoDetalhesId = produto.id;

    definirTexto(
        "detalheCodigo",
        produto.codigo
    );

    definirTexto(
        "detalheNome",
        produto.nome
    );

    definirTexto(
        "detalheCategoria",
        produto.categoria?.nome || "-"
    );

    definirTexto(
        "detalheMarca",
        produto.marca || "-"
    );

    definirTexto(
        "detalheUnidade",
        produto.unidadeMedida || "-"
    );

    definirTexto(
        "detalheDescricao",
        produto.descricao || "Sem descrição."
    );

    definirTexto(
        "detalheNcm",
        produto.ncm || "-"
    );

    definirTexto(
        "detalheCfop",
        produto.cfopPadrao || "-"
    );

    document.getElementById(
        "detalheStatus"
    ).innerHTML = `
        <span class="badge ${produto.ativo
            ? "badge-success"
            : "badge-danger"
        }">
            ${produto.ativo ? "Ativo" : "Inativo"}
        </span>
    `;

    const quantidade =
        produto.variacoes?.length || 0;

    definirTexto(
        "detalheQuantidadeVariacoes",
        `${quantidade} ${quantidade === 1
            ? "variação"
            : "variações"
        }`
    );

    renderizarDetalhesComposicao(
        Array.isArray(produto.composicao) ? produto.composicao : [],
        Number(produto.custoComposicao || 0),
        Number(produto.margemLucroPadrao || 0)
    );

    renderizarDetalhesVariacoes(
        produto.variacoes || []
    );

    const botaoEditar = document.getElementById(
        "btnEditarDetalhesProduto"
    );

    botaoEditar.onclick = () => {
        editarProduto(produto.id);
    };

    modalDetalhesProduto.classList.add("active");
}

function renderizarDetalhesComposicao(lista, custoTotal, margem = 0) {
    const tbody = document.getElementById("tabelaDetalhesComposicao");
    const custo = document.getElementById("detalheCustoComposicao");
    const margemElemento = document.getElementById("detalheMargemComposicao");
    const precoElemento = document.getElementById("detalhePrecoSugeridoComposicao");
    const precoSugerido = calcularPrecoVendaSugerido(custoTotal, margem);

    if (custo) custo.textContent = moeda(custoTotal || 0);
    if (margemElemento) margemElemento.textContent = `${Number(margem || 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
    if (precoElemento) precoElemento.textContent = moeda(precoSugerido);
    if (!tbody) return;

    tbody.innerHTML = "";

    if (!lista.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">
                    Nenhum item de composição cadastrado.
                </td>
            </tr>
        `;
        return;
    }

    lista.forEach((item) => {
        const total =
            Number(item.quantidade || 0) *
            Number(item.custoUnitario || 0);

        const linha = document.createElement("tr");
        const variacao = item.variacaoNome || item.sku || "-";

        linha.innerHTML = `
            <td>${escaparHtml(item.nome || "-")}</td>
            <td>${escaparHtml(variacao)}</td>
            <td>${numero(item.quantidade || 0)}</td>
            <td>${moeda(item.custoUnitario || 0)}</td>
            <td><strong>${moeda(item.total ?? total)}</strong></td>
        `;
        tbody.appendChild(linha);
    });
}

function renderizarDetalhesVariacoes(lista) {
    const tbody = document.getElementById(
        "tabelaDetalhesVariacoes"
    );

    tbody.innerHTML = "";

    if (!lista.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center">
                    Nenhuma variação cadastrada.
                </td>
            </tr>
        `;

        return;
    }

    lista.forEach((variacao) => {
        const linha = document.createElement("tr");

        linha.innerHTML = `
            <td>
                <strong>
                    ${escaparHtml(variacao.sku)}
                </strong>
            </td>

            <td>
                ${escaparHtml(
            variacao.descricao || "-"
        )}
            </td>

            <td>
                ${escaparHtml(
            variacao.tamanho || "-"
        )}
            </td>

            <td>
                ${escaparHtml(variacao.saida || "-")}
            </td>

            <td>
                ${escaparHtml(
            variacao.codigoBarras || "-"
        )}
            </td>

            <td>
                ${moeda(variacao.precoCusto)}
            </td>

            <td>
                <strong>
                    ${moeda(variacao.precoVenda)}
                </strong>
            </td>

            <td>
                <span class="badge ${Number(variacao.estoqueAtual) <=
                Number(variacao.estoqueMinimo)
                ? "badge-warning"
                : "badge-success"
            }">
                    ${numero(variacao.estoqueAtual)}
                </span>
            </td>
        `;

        tbody.appendChild(linha);
    });
}

function fecharDetalhesProduto() {
    modalDetalhesProduto.classList.remove("active");
    produtoDetalhesId = null;
}

async function excluirProduto(id) {
    const produto = produtos.find(
        (item) => item.id === id
    );

    const nome = produto?.nome || "este produto";

    const confirmou = confirm(
        `Deseja realmente excluir ${nome}?`
    );

    if (!confirmou) {
        return;
    }

    try {
        const resposta = await del(
            `/produtos/${id}`
        );

        if (!resposta || !resposta.sucesso) {
            mostrarMensagem(
                resposta?.mensagem ||
                "Erro ao excluir produto."
            );

            return;
        }

        fecharDetalhesProduto();

        await carregarProdutos();

        mostrarMensagem(
            "Produto removido com sucesso."
        );
    } catch (erro) {
        console.error(erro);
        mostrarMensagem("Erro ao excluir produto.");
    }
}

function filtrarProdutos() {
    const pesquisa = document
        .getElementById("pesquisa")
        .value
        .trim()
        .toLowerCase();

    if (!pesquisa) {
        renderizarTabela(produtos);
        return;
    }

    const filtrados = produtos.filter((produto) => {
        const codigo = String(
            produto.codigo || ""
        ).toLowerCase();

        const nome = String(
            produto.nome || ""
        ).toLowerCase();

        const marca = String(
            produto.marca || ""
        ).toLowerCase();

        const categoria = String(
            produto.categoria?.nome || ""
        ).toLowerCase();

        const possuiSku = (
            produto.variacoes || []
        ).some((variacao) =>
            String(variacao.sku || "")
                .toLowerCase()
                .includes(pesquisa)
        );

        return (
            codigo.includes(pesquisa) ||
            nome.includes(pesquisa) ||
            marca.includes(pesquisa) ||
            categoria.includes(pesquisa) ||
            possuiSku
        );
    });

    renderizarTabela(filtrados);
}

function preencherCampoProduto(id, valor) {
    const campo = document.getElementById(id);

    if (campo) {
        campo.value = valor ?? "";
    }
}

function valorCampoProduto(id) {
    const campo = document.getElementById(id);

    return campo
        ? String(campo.value || "").trim()
        : "";
}

function definirTexto(id, valor) {
    const elemento = document.getElementById(id);

    if (elemento) {
        elemento.textContent = valor ?? "-";
    }
}

function numeroInput(valor) {
    const numeroConvertido = Number(valor);

    return Number.isNaN(numeroConvertido)
        ? 0
        : numeroConvertido;
}

function escaparHtml(valor) {
    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function escaparAtributo(valor) {
    return escaparHtml(valor);
}

modalProduto.addEventListener("click", (event) => {
    if (event.target === modalProduto) {
        fecharModalProduto();
    }
});

modalDetalhesProduto.addEventListener(
    "click",
    (event) => {
        if (event.target === modalDetalhesProduto) {
            fecharDetalhesProduto();
        }
    }
);

document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
        return;
    }

    if (
        modalDetalhesProduto.classList.contains(
            "active"
        )
    ) {
        fecharDetalhesProduto();
        return;
    }

    if (modalProduto.classList.contains("active")) {
        fecharModalProduto();
    }
});