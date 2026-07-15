let categorias = [];
let categoriaEditandoId = null;

const modalCategoria = document.getElementById("modalCategoria");
const formCategoria = document.getElementById("formCategoria");

document.addEventListener("DOMContentLoaded", () => {

    carregarCategorias();

});

async function carregarCategorias() {

    try {

        const resposta = await get("/categorias");

        if (!resposta.sucesso) {

            mostrarMensagem(resposta.mensagem);

            return;

        }

        categorias = resposta.categorias || [];

        renderizarTabela(categorias);

    } catch (erro) {

        console.error(erro);

        mostrarMensagem("Erro ao carregar categorias.");

    }

}

function renderizarTabela(lista) {

    const tbody = document.getElementById("tabelaCategorias");

    tbody.innerHTML = "";

    if (lista.length === 0) {

        tbody.innerHTML = `

            <tr>

                <td colspan="4" class="text-center">

                    Nenhuma categoria cadastrada.

                </td>

            </tr>

        `;

        return;

    }

    lista.forEach(categoria => {

        tbody.innerHTML += `

            <tr>

                <td>${categoria.nome}</td>

                <td>${categoria.descricao || "-"}</td>

                <td>

                    <span class="badge ${categoria.ativo ? "badge-success" : "badge-danger"}">

                        ${categoria.ativo ? "Ativa" : "Inativa"}

                    </span>

                </td>

                <td>

                    <div class="table-actions">

                        <button
                            class="btn btn-warning"
                            onclick="editarCategoria(${categoria.id})">

                            <i class="fas fa-edit"></i>

                        </button>

                        <button
                            class="btn btn-danger"
                            onclick="excluirCategoria(${categoria.id})">

                            <i class="fas fa-trash"></i>

                        </button>

                    </div>

                </td>

            </tr>

        `;

    });

}

function abrirModalCategoria() {

    categoriaEditandoId = null;

    formCategoria.reset();

    document.querySelector(
        "#modalCategoria .modal-title"
    ).innerHTML = "Cadastro de Categoria";

    modalCategoria.classList.add("active");

}

function fecharModalCategoria() {

    modalCategoria.classList.remove("active");

    formCategoria.reset();

    categoriaEditandoId = null;

}

async function salvarCategoria() {

    const botao = document.querySelector(
        "#modalCategoria .modal-footer .btn-primary"
    );

    try {

        const dados = obterDadosFormulario();

        validarCategoria(dados);

        botao.disabled = true;

        botao.innerHTML = `
            <i class="fas fa-spinner fa-spin"></i>
            Salvando...
        `;

        let resposta;

        if (categoriaEditandoId) {

            resposta = await put(
                `/categorias/${categoriaEditandoId}`,
                dados
            );

        } else {

            resposta = await post(
                "/categorias",
                dados
            );

        }

        if (!resposta.sucesso) {

            mostrarMensagem(resposta.mensagem);

            return;

        }

        fecharModalCategoria();

        await carregarCategorias();

        mostrarMensagem(

            categoriaEditandoId
                ? "Categoria atualizada com sucesso."
                : "Categoria cadastrada com sucesso."

        );

    } catch (erro) {

        console.error(erro);

        mostrarMensagem(
            erro.message || "Erro ao salvar categoria."
        );

    } finally {

        botao.disabled = false;

        botao.innerHTML = `
            <i class="fas fa-save"></i>
            Salvar Categoria
        `;

    }

}

function editarCategoria(id) {

    const categoria = categorias.find(c => c.id === id);

    if (!categoria) {

        mostrarMensagem("Categoria não encontrada.");

        return;

    }

    categoriaEditandoId = id;

    document.getElementById("nome").value =
        categoria.nome || "";

    document.getElementById("descricao").value =
        categoria.descricao || "";

    document.querySelector(
        "#modalCategoria .modal-title"
    ).innerHTML = "Editar Categoria";

    modalCategoria.classList.add("active");

}

async function excluirCategoria(id) {

    if (!confirm("Deseja realmente excluir esta categoria?")) {

        return;

    }

    try {

        const resposta = await del(`/categorias/${id}`);

        if (!resposta.sucesso) {

            mostrarMensagem(resposta.mensagem);

            return;

        }

        await carregarCategorias();

        mostrarMensagem(
            "Categoria removida com sucesso."
        );

    } catch (erro) {

        console.error(erro);

        mostrarMensagem(
            "Erro ao excluir categoria."
        );

    }

}

function filtrarCategorias() {

    const pesquisa = document
        .getElementById("pesquisa")
        .value
        .trim()
        .toLowerCase();

    if (!pesquisa) {

        renderizarTabela(categorias);

        return;

    }

    const lista = categorias.filter(categoria =>

        categoria.nome.toLowerCase().includes(pesquisa)

        ||

        (categoria.descricao || "")
            .toLowerCase()
            .includes(pesquisa)

    );

    renderizarTabela(lista);

}

function obterDadosFormulario() {

    return {

        nome: document
            .getElementById("nome")
            .value
            .trim(),

        descricao: document
            .getElementById("descricao")
            .value
            .trim(),

        ativo: true

    };

}

function validarCategoria(categoria) {

    if (!categoria.nome) {

        throw new Error(
            "Informe o nome da categoria."
        );

    }

}

modalCategoria.addEventListener("click", (event) => {

    if (event.target === modalCategoria) {

        fecharModalCategoria();

    }

});

document.addEventListener("keydown", (event) => {

    if (
        event.key === "Escape"
        &&
        modalCategoria.classList.contains("active")
    ) {

        fecharModalCategoria();

    }

});