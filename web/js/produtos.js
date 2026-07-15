let produtos = [];
let categorias = [];
let produtoEditandoId = null;
let produtoDetalhesId = null;
let variacoes = [];

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

    formProduto.reset();

    document.getElementById("controlaEstoque").checked = true;
    document.getElementById(
        "permiteVendaSemEstoque"
    ).checked = false;

    document.querySelector(
        "#modalProduto .modal-title"
    ).textContent = "Cadastro de Produto";

    adicionarVariacao();

    modalProduto.classList.add("active");
}

function fecharModalProduto() {
    modalProduto.classList.remove("active");

    formProduto.reset();

    produtoEditandoId = null;
    variacoes = [];

    renderizarVariacoes();
}

function adicionarVariacao() {
    variacoes.push({
        id: null,
        sku: "",
        codigoBarras: "",
        descricao: "",
        cor: "",
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
                    value="${escaparAtributo(variacao.cor)}"
                    oninput="atualizarVariacao(
                        ${index},
                        'cor',
                        this.value
                    )"
                    placeholder="Cor">
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
                    placeholder="Tamanho">
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
    return {
        codigo: valorCampoProduto("codigo"),
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
        origemMercadoria: null,
        ativo: true,
        variacoes: variacoes.map((variacao) => ({
            sku: String(variacao.sku || "").trim(),
            codigoBarras:
                String(variacao.codigoBarras || "").trim() ||
                null,
            descricao:
                String(variacao.descricao || "").trim() ||
                null,
            cor:
                String(variacao.cor || "").trim() || null,
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
    if (!produto.codigo) {
        throw new Error("Informe o código do produto.");
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

    preencherCampoProduto("codigo", produto.codigo);
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

    document.getElementById(
        "controlaEstoque"
    ).checked = produto.controlaEstoque !== false;

    document.getElementById(
        "permiteVendaSemEstoque"
    ).checked = Boolean(
        produto.permiteVendaSemEstoque
    );

    variacoes = (produto.variacoes || []).map(
        (variacao) => ({
            id: variacao.id,
            sku: variacao.sku || "",
            codigoBarras:
                variacao.codigoBarras || "",
            descricao:
                variacao.descricao || "",
            cor:
                variacao.cor || "",
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
                ${escaparHtml(variacao.cor || "-")}
            </td>

            <td>
                ${escaparHtml(
            variacao.tamanho || "-"
        )}
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