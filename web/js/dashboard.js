async function carregarDashboard() {

    try {

        const resposta = await get("/dashboard");

        if (!resposta.sucesso) {
            throw new Error("Erro ao carregar dashboard.");
        }

        const resumo = resposta.resumo;

        document.getElementById("kpiClientes").innerText =
            resumo.clientes;

        document.getElementById("kpiProdutos").innerText =
            resumo.produtos;

        document.getElementById("kpiCategorias").innerText =
            resumo.categorias;

        document.getElementById("kpiOrcamentos").innerText =
            resumo.orcamentos;

        document.getElementById("kpiValor").innerText =
            moeda(resumo.valorOrcamentos);

        document.getElementById("kpiEstoque").innerText =
            resumo.estoqueBaixo;

        preencherUltimosOrcamentos(resumo.ultimosOrcamentos);

        preencherEstoqueBaixo(resumo.produtosEstoqueBaixo);

    } catch (erro) {

        console.error(erro);

        mostrarMensagem("Erro ao carregar dashboard.");

    }

}

function preencherUltimosOrcamentos(lista) {

    const tbody = document.getElementById("tabelaOrcamentos");

    tbody.innerHTML = "";

    if (!lista.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center">
                    Nenhum orçamento encontrado.
                </td>
            </tr>
        `;

        return;

    }

    lista.forEach(orcamento => {

        tbody.innerHTML += `

            <tr>

                <td>#${orcamento.numero}</td>

                <td>${orcamento.cliente.nome}</td>

                <td>${moeda(orcamento.total)}</td>

                <td>${data(orcamento.criadoEm)}</td>

            </tr>

        `;

    });

}

function preencherEstoqueBaixo(lista) {

    const tbody = document.getElementById("tabelaEstoqueBaixo");

    tbody.innerHTML = "";

    if (!lista.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center">
                    Nenhum produto com estoque baixo.
                </td>
            </tr>
        `;

        return;

    }

    lista.forEach(item => {

        tbody.innerHTML += `

            <tr>

                <td>${item.produto.nome}</td>

                <td>${item.sku}</td>

                <td>${item.estoqueAtual}</td>

                <td>${item.estoqueMinimo}</td>

            </tr>

        `;

    });

}

document.addEventListener("DOMContentLoaded", () => {

    carregarDashboard();

});