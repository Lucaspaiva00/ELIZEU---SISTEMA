async function carregarDashboard() {

    const resposta = await get("/dashboard");

    if (!resposta.sucesso) return;

    const r = resposta.resumo;

    document.getElementById("kpiClientes").innerHTML = r.clientes;
    document.getElementById("kpiProdutos").innerHTML = r.produtos;
    document.getElementById("kpiCategorias").innerHTML = r.categorias;
    document.getElementById("kpiOrcamentos").innerHTML = r.orcamentos;
    document.getElementById("kpiValor").innerHTML = moeda(r.valorTotal);
    document.getElementById("kpiEstoque").innerHTML = r.estoqueBaixo;

    preencherUltimosOrcamentos(r.ultimosOrcamentos);
    preencherEstoqueBaixo(r.estoqueBaixoProdutos);

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