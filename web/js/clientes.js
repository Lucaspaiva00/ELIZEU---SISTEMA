let clientes = [];
let clienteEditandoId = null;

const modalCliente = document.getElementById("modalCliente");
const formCliente = document.getElementById("formCliente");

document.addEventListener("DOMContentLoaded", () => {
    carregarClientes();
    configurarEventosFormulario();
});

async function carregarClientes() {
    try {
        const resposta = await get("/clientes");

        if (!resposta || !resposta.sucesso) {
            mostrarMensagem(resposta?.mensagem || "Erro ao carregar clientes.");
            return;
        }

        clientes = resposta.clientes || [];
        renderizarTabela(clientes);
    } catch (erro) {
        console.error(erro);
        mostrarMensagem("Erro ao carregar clientes.");
    }
}

function configurarEventosFormulario() {

    document
        .getElementById("cep")
        .addEventListener("blur", buscarCep);

    document
        .getElementById("cpfCnpj")
        .addEventListener("blur", buscarCnpj);

}

async function buscarCep() {

    const cep = document
        .getElementById("cep")
        .value
        .replace(/\D/g, "");

    if (cep.length !== 8) {

        return;

    }

    try {

        const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`);

        const endereco = await resposta.json();

        if (endereco.erro) {

            return;

        }

        preencherCampo("endereco", endereco.logradouro);

        preencherCampo("bairro", endereco.bairro);

        preencherCampo("cidade", endereco.localidade);

        preencherCampo("estado", endereco.uf);

    } catch (erro) {

        console.error(erro);

    }

}

async function buscarCnpj() {

    const tipo = document
        .getElementById("tipoPessoa")
        .value;

    if (tipo !== "JURIDICA") {

        return;

    }

    const cnpj = document
        .getElementById("cpfCnpj")
        .value
        .replace(/\D/g, "");

    if (cnpj.length !== 14) {

        return;

    }

    try {

        const resposta = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);

        if (!resposta.ok) {

            return;

        }

        const empresa = await resposta.json();

        preencherCampo("nome", empresa.razao_social);

        preencherCampo("nomeFantasia", empresa.nome_fantasia);

        preencherCampo("telefone", empresa.ddd_telefone_1);

        preencherCampo("email", empresa.email);

        preencherCampo("cep", empresa.cep);

        preencherCampo("endereco", empresa.logradouro);

        preencherCampo("numero", empresa.numero);

        preencherCampo("bairro", empresa.bairro);

        preencherCampo("cidade", empresa.municipio);

        preencherCampo("estado", empresa.uf);

    } catch (erro) {

        console.error(erro);

    }

}

function renderizarTabela(lista) {
    const tbody = document.getElementById("tabelaClientes");

    if (!tbody) {
        return;
    }

    tbody.innerHTML = "";

    if (!lista.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    Nenhum cliente cadastrado.
                </td>
            </tr>
        `;

        return;
    }

    lista.forEach((cliente) => {
        const linha = document.createElement("tr");

        linha.innerHTML = `
            <td>${escaparHtml(cliente.nome)}</td>
            <td>${escaparHtml(cliente.cpfCnpj)}</td>
            <td>${escaparHtml(cliente.telefone || cliente.celular || "-")}</td>
            <td>${escaparHtml(cliente.email || "-")}</td>
            <td>
                <span class="badge ${cliente.ativo ? "badge-success" : "badge-danger"
            }">
                    ${cliente.ativo ? "Ativo" : "Inativo"}
                </span>
            </td>
            <td>
                <div class="table-actions">
                    <button
                        type="button"
                        class="btn btn-warning"
                        onclick="editarCliente(${cliente.id})"
                        title="Editar cliente"
                    >
                        <i class="fas fa-edit"></i>
                    </button>

                    <button
                        type="button"
                        class="btn btn-danger"
                        onclick="excluirCliente(${cliente.id})"
                        title="Excluir cliente"
                    >
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;

        tbody.appendChild(linha);
    });
}

function abrirModal() {
    clienteEditandoId = null;
    formCliente.reset();

    const titulo = document.querySelector("#modalCliente .modal-title");

    if (titulo) {
        titulo.textContent = "Cadastro de Cliente";
    }

    modalCliente.classList.add("active");
}

function fecharModal() {
    modalCliente.classList.remove("active");
    formCliente.reset();
    clienteEditandoId = null;
}

async function salvarCliente() {
    const botaoSalvar = document.querySelector(
        "#modalCliente .modal-footer .btn-primary"
    );

    try {
        const dados = obterDadosFormulario();

        validarCliente(dados);

        if (botaoSalvar) {
            botaoSalvar.disabled = true;
            botaoSalvar.innerHTML = `
                <i class="fas fa-spinner fa-spin"></i>
                Salvando...
            `;
        }

        let resposta;

        if (clienteEditandoId) {
            resposta = await put(`/clientes/${clienteEditandoId}`, dados);
        } else {
            resposta = await post("/clientes", dados);
        }

        if (!resposta || !resposta.sucesso) {
            mostrarMensagem(resposta?.mensagem || "Erro ao salvar cliente.");
            return;
        }

        fecharModal();
        await carregarClientes();

        mostrarMensagem(
            clienteEditandoId
                ? "Cliente atualizado com sucesso."
                : "Cliente cadastrado com sucesso."
        );
    } catch (erro) {
        console.error(erro);
        mostrarMensagem(erro.message || "Erro ao salvar cliente.");
    } finally {
        if (botaoSalvar) {
            botaoSalvar.disabled = false;
            botaoSalvar.innerHTML = `
                <i class="fas fa-save"></i>
                Salvar Cliente
            `;
        }
    }
}

function editarCliente(id) {
    const cliente = clientes.find((item) => item.id === id);

    if (!cliente) {
        mostrarMensagem("Cliente não encontrado.");
        return;
    }

    clienteEditandoId = id;

    preencherCampo("tipoPessoa", cliente.tipoPessoa);
    preencherCampo("nome", cliente.nome);
    preencherCampo("nomeFantasia", cliente.nomeFantasia);
    preencherCampo("cpfCnpj", cliente.cpfCnpj);
    preencherCampo("inscricaoEstadual", cliente.inscricaoEstadual);
    preencherCampo("telefone", cliente.telefone);
    preencherCampo("celular", cliente.celular);
    preencherCampo("email", cliente.email);
    preencherCampo("cep", cliente.cep);
    preencherCampo("endereco", cliente.endereco);
    preencherCampo("numero", cliente.numero);
    preencherCampo("complemento", cliente.complemento);
    preencherCampo("bairro", cliente.bairro);
    preencherCampo("cidade", cliente.cidade);
    preencherCampo("estado", cliente.estado);
    preencherCampo("limiteCredito", cliente.limiteCredito);
    preencherCampo(
        "prazoPagamentoPadrao",
        cliente.prazoPagamentoPadrao
    );
    preencherCampo("observacoes", cliente.observacoes);

    const titulo = document.querySelector("#modalCliente .modal-title");

    if (titulo) {
        titulo.textContent = "Editar Cliente";
    }

    modalCliente.classList.add("active");
}

async function excluirCliente(id) {
    const cliente = clientes.find((item) => item.id === id);

    const nome = cliente?.nome || "este cliente";

    const confirmou = confirm(
        `Deseja realmente excluir ${nome}?`
    );

    if (!confirmou) {
        return;
    }

    try {
        const resposta = await del(`/clientes/${id}`);

        if (!resposta || !resposta.sucesso) {
            mostrarMensagem(resposta?.mensagem || "Erro ao excluir cliente.");
            return;
        }

        await carregarClientes();
        mostrarMensagem("Cliente removido com sucesso.");
    } catch (erro) {
        console.error(erro);
        mostrarMensagem("Erro ao excluir cliente.");
    }
}

function filtrarClientes() {
    const pesquisa = document
        .getElementById("pesquisa")
        .value
        .trim()
        .toLowerCase();

    if (!pesquisa) {
        renderizarTabela(clientes);
        return;
    }

    const filtrados = clientes.filter((cliente) => {
        const nome = String(cliente.nome || "").toLowerCase();
        const cpfCnpj = String(cliente.cpfCnpj || "").toLowerCase();
        const email = String(cliente.email || "").toLowerCase();
        const telefone = String(
            cliente.telefone || cliente.celular || ""
        ).toLowerCase();

        return (
            nome.includes(pesquisa) ||
            cpfCnpj.includes(pesquisa) ||
            email.includes(pesquisa) ||
            telefone.includes(pesquisa)
        );
    });

    renderizarTabela(filtrados);
}

function obterDadosFormulario() {
    return {
        tipoPessoa: valorCampo("tipoPessoa"),
        nome: valorCampo("nome"),
        nomeFantasia: valorOpcional("nomeFantasia"),
        cpfCnpj: valorCampo("cpfCnpj"),
        inscricaoEstadual: valorOpcional("inscricaoEstadual"),
        telefone: valorOpcional("telefone"),
        celular: valorOpcional("celular"),
        email: valorOpcional("email"),
        cep: valorOpcional("cep"),
        endereco: valorOpcional("endereco"),
        numero: valorOpcional("numero"),
        complemento: valorOpcional("complemento"),
        bairro: valorOpcional("bairro"),
        cidade: valorOpcional("cidade"),
        estado: valorOpcional("estado")?.toUpperCase(),
        limiteCredito: numeroOpcional("limiteCredito"),
        prazoPagamentoPadrao: inteiroOpcional(
            "prazoPagamentoPadrao"
        ),
        observacoes: valorOpcional("observacoes"),
        ativo: true
    };
}

function validarCliente(dados) {
    if (!dados.tipoPessoa) {
        throw new Error("Selecione o tipo de pessoa.");
    }

    if (!dados.nome) {
        throw new Error("Informe o nome do cliente.");
    }

    if (!dados.cpfCnpj) {
        throw new Error("Informe o CPF ou CNPJ.");
    }

    if (dados.estado && dados.estado.length !== 2) {
        throw new Error("O estado deve conter duas letras.");
    }

    if (
        dados.limiteCredito !== null &&
        dados.limiteCredito < 0
    ) {
        throw new Error("O limite de crédito não pode ser negativo.");
    }

    if (
        dados.prazoPagamentoPadrao !== null &&
        dados.prazoPagamentoPadrao < 0
    ) {
        throw new Error("O prazo de pagamento não pode ser negativo.");
    }
}

function preencherCampo(id, valor) {
    const campo = document.getElementById(id);

    if (campo) {
        campo.value = valor ?? "";
    }
}

function valorCampo(id) {
    const campo = document.getElementById(id);

    return campo ? campo.value.trim() : "";
}

function valorOpcional(id) {
    const valor = valorCampo(id);

    return valor === "" ? null : valor;
}

function numeroOpcional(id) {
    const valor = valorCampo(id);

    if (valor === "") {
        return null;
    }

    const numero = Number(valor);

    if (Number.isNaN(numero)) {
        throw new Error("Informe um valor numérico válido.");
    }

    return numero;
}

function inteiroOpcional(id) {
    const valor = valorCampo(id);

    if (valor === "") {
        return null;
    }

    const numero = Number.parseInt(valor, 10);

    if (Number.isNaN(numero)) {
        throw new Error("Informe um prazo válido.");
    }

    return numero;
}

function escaparHtml(valor) {
    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

modalCliente.addEventListener("click", (event) => {
    if (event.target === modalCliente) {
        fecharModal();
    }
});

document.addEventListener("keydown", (event) => {
    if (
        event.key === "Escape" &&
        modalCliente.classList.contains("active")
    ) {
        fecharModal();
    }
});