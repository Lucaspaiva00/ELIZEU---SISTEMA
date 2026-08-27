// Extensão da tela de Produtos: duplicação segura de cadastro completo.
// Carregada apenas em produtos.html pelo app.js.

function obterIdProdutoDaLinha(linha) {
    const botaoEditar = linha?.querySelector('button[onclick*="editarProduto("]');
    const onclick = botaoEditar?.getAttribute("onclick") || "";
    const match = onclick.match(/editarProduto\((\d+)\)/);
    return match ? Number(match[1]) : null;
}

async function duplicarProduto(id, botao = null) {
    if (typeof window.temPermissao === "function" && !window.temPermissao("produtos.duplicar")) {
        mostrarMensagem("Seu usuário não possui permissão para duplicar produtos.");
        return;
    }

    const produto = Array.isArray(produtos)
        ? produtos.find((item) => Number(item.id) === Number(id))
        : null;

    const nome = produto?.nome || "este produto";

    const confirmou = confirm(
        `Duplicar "${nome}"?\n\n` +
        "Serão copiados dados cadastrais, categoria, marca, descrição, composição, margem, parâmetros fiscais, preços e variações.\n\n" +
        "Por segurança, o novo produto receberá outro código e novos SKUs. Código de barras/GTIN não serão repetidos e o estoque atual começará em zero."
    );

    if (!confirmou) return;

    const htmlOriginal = botao?.innerHTML;

    try {
        if (botao) {
            botao.disabled = true;
            botao.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        }

        const resposta = await post(`/produtos/${id}/duplicar`, {});

        if (!resposta?.sucesso || !resposta?.produto) {
            throw new Error(
                resposta?.mensagem ||
                "Não foi possível duplicar o produto."
            );
        }

        fecharDetalhesProduto?.();
        await carregarProdutos();

        mostrarMensagem(
            `Produto duplicado com sucesso como ${resposta.produto.codigo}. Revise o novo cadastro e salve as alterações desejadas.`
        );

        if (typeof editarProduto === "function") {
            editarProduto(resposta.produto.id);
        }
    } catch (erro) {
        console.error(erro);
        mostrarMensagem(
            erro.message ||
            "Erro ao duplicar produto."
        );
    } finally {
        if (botao) {
            botao.disabled = false;
            botao.innerHTML = htmlOriginal || '<i class="fas fa-copy"></i>';
        }
    }
}

function instalarBotoesDuplicarProdutos() {
    const podeDuplicar = typeof window.temPermissao !== "function" ||
        window.temPermissao("produtos.duplicar");

    const tbody = document.getElementById("tabelaProdutos");

    tbody?.querySelectorAll("tr").forEach((linha) => {
        const acoes = linha.querySelector(".table-actions");
        if (!acoes || acoes.querySelector("[data-duplicar-produto]")) return;

        const id = obterIdProdutoDaLinha(linha);
        if (!id) return;

        const botaoEditar = acoes.querySelector('button[onclick*="editarProduto("]');
        const botao = document.createElement("button");

        botao.type = "button";
        botao.className = "btn btn-light";
        botao.dataset.duplicarProduto = String(id);
        botao.dataset.permission = "produtos.duplicar";
        botao.title = "Duplicar produto";
        botao.innerHTML = '<i class="fas fa-copy"></i>';
        botao.hidden = !podeDuplicar;
        botao.addEventListener("click", () => duplicarProduto(id, botao));

        if (botaoEditar) {
            acoes.insertBefore(botao, botaoEditar);
        } else {
            acoes.appendChild(botao);
        }
    });

    const footerDetalhes = document.querySelector(
        "#modalDetalhesProduto .modal-footer"
    );

    if (footerDetalhes && !document.getElementById("btnDuplicarDetalhesProduto")) {
        const botaoEditar = document.getElementById("btnEditarDetalhesProduto");
        const botao = document.createElement("button");

        botao.type = "button";
        botao.className = "btn btn-light";
        botao.id = "btnDuplicarDetalhesProduto";
        botao.dataset.permission = "produtos.duplicar";
        botao.hidden = !podeDuplicar;
        botao.innerHTML = '<i class="fas fa-copy"></i> Duplicar Produto';
        botao.addEventListener("click", () => {
            if (produtoDetalhesId) {
                duplicarProduto(produtoDetalhesId, botao);
            }
        });

        if (botaoEditar) {
            footerDetalhes.insertBefore(botao, botaoEditar);
        } else {
            footerDetalhes.appendChild(botao);
        }
    }

    if (typeof window.aplicarPermissoesAcoes === "function") {
        window.aplicarPermissoesAcoes();
    }
}

function iniciarDuplicacaoProdutos() {
    instalarBotoesDuplicarProdutos();

    const tbody = document.getElementById("tabelaProdutos");
    if (!tbody) return;

    const observador = new MutationObserver(() => {
        instalarBotoesDuplicarProdutos();
    });

    observador.observe(tbody, {
        childList: true,
        subtree: true
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciarDuplicacaoProdutos, { once: true });
} else {
    iniciarDuplicacaoProdutos();
}
