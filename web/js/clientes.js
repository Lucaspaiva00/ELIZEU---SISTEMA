let clientes = [];
let clienteEditandoId = null;
let paginaAtualClientes = 1;
const clientesPorPagina = 20;

const modalCliente = document.getElementById("modalCliente");
const formCliente = document.getElementById("formCliente");

document.addEventListener("DOMContentLoaded", () => {
    carregarClientes();
    configurarEventosFormulario();
});


async function importarHistoricoSacMais() {
    const botao = document.getElementById("btnSacMais");
    const htmlOriginal = botao?.innerHTML;

    let pagina = 1;
    const limite = 50;
    let totalCriados = 0;
    let totalAtualizados = 0;
    let totalIgnorados = 0;
    let ultimaAssinatura = null;

    try {
        if (botao) botao.disabled = true;

        console.log("[SacMais] Iniciando importação dos contatos históricos via tickets...");

        while (pagina <= 200) {
            if (botao) {
                botao.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Importando ${pagina}...`;
            }

            const resposta = await post("/integracoes/sacmais/contatos/importar-historico", {
                pagina,
                limite
            });

            console.log(`[SacMais] Página ${pagina}:`, resposta);

            if (!resposta || !resposta.sucesso) {
                throw new Error(resposta?.mensagem || `Erro ao importar página ${pagina}.`);
            }

            // Proteção caso a API ignore o parâmetro de página e devolva sempre o mesmo lote.
            if (resposta.assinatura && resposta.assinatura === ultimaAssinatura) {
                console.warn("[SacMais] A API repetiu a mesma página. Importação encerrada para evitar loop.");
                break;
            }
            ultimaAssinatura = resposta.assinatura || null;

            totalCriados += Number(resposta.criados || 0);
            totalAtualizados += Number(resposta.atualizados || 0);
            totalIgnorados += Number(resposta.ignorados || 0);

            await carregarClientes();

            if (!resposta.temProximaPagina || Number(resposta.ticketsRecebidos || 0) === 0) {
                break;
            }

            pagina++;
        }

        const mensagem =
            `Importação SacMais concluída. Novos: ${totalCriados}, ` +
            `atualizados: ${totalAtualizados}, ignorados: ${totalIgnorados}.`;

        console.log("[SacMais]", mensagem);
        mostrarMensagem(mensagem);
    } catch (erro) {
        console.error("[SacMais] Falha na importação histórica:", erro);
        mostrarMensagem(erro.message || "Erro ao importar contatos existentes do SacMais.");
    } finally {
        if (botao) {
            botao.disabled = false;
            botao.innerHTML = htmlOriginal;
        }
    }
}

async function carregarClientes() {
    try {
        const resposta = await get("/clientes");

        if (!resposta || !resposta.sucesso) {
            mostrarMensagem(resposta?.mensagem || "Erro ao carregar clientes.");
            return;
        }

        clientes = ordenarClientesParaTabela(resposta.clientes || []);
        renderizarTabela(clientes);
    } catch (erro) {
        console.error(erro);
        mostrarMensagem("Erro ao carregar clientes.");
    }
}

function configurarEventosFormulario() {

    const campoCep = document.getElementById("cep");

    campoCep.addEventListener("blur", buscarCep);

    campoCep.addEventListener("input", (e) => {

        const cep = e.target.value.replace(/\D/g, "");

        if (cep.length === 8) {

            buscarCep();

        }

    });

    const campoCnpj = document.getElementById("cpfCnpj");

    campoCnpj.addEventListener("blur", buscarCnpj);

    campoCnpj.addEventListener("input", (e) => {

        const cnpj = e.target.value.replace(/\D/g, "");

        if (cnpj.length === 14) {

            buscarCnpj();

        }

    });

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

        const resposta = await fetch(
            `https://viacep.com.br/ws/${cep}/json/`
        );

        const endereco = await resposta.json();

        if (endereco.erro) {

            mostrarMensagem("CEP não encontrado.");

            return;

        }

        preencherCampo(
            "endereco",
            endereco.logradouro || ""
        );

        preencherCampo(
            "bairro",
            endereco.bairro || ""
        );

        preencherCampo(
            "cidade",
            endereco.localidade || ""
        );

        preencherCampo(
            "estado",
            endereco.uf || ""
        );

    } catch (erro) {

        console.error(erro);

        mostrarMensagem("Erro ao consultar CEP.");

    }

}

async function buscarCnpj() {

    const tipoPessoa = document.getElementById("tipoPessoa").value;

    if (tipoPessoa !== "JURIDICA") {
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

        const resposta = await fetch(
            `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`
        );

        if (!resposta.ok) {

            mostrarMensagem("CNPJ não encontrado.");

            return;

        }

        const empresa = await resposta.json();

        console.log(empresa);

        preencherCampo("nome", empresa.razao_social || "");

        preencherCampo(
            "nomeFantasia",
            empresa.nome_fantasia || ""
        );

        preencherCampo(
            "telefone",
            empresa.ddd_telefone_1 || ""
        );

        preencherCampo(
            "email",
            empresa.email || ""
        );

        preencherCampo(
            "cep",
            empresa.cep || ""
        );

        preencherCampo(
            "numero",
            empresa.numero || ""
        );

        preencherCampo(
            "complemento",
            empresa.complemento || ""
        );

        if (empresa.cep) {

            await buscarCep();

        }

    } catch (erro) {

        console.error(erro);

        mostrarMensagem("Erro ao consultar CNPJ.");

    }

}

function textoLimpo(valor) {
    return String(valor ?? "").trim();
}

function somenteDigitos(valor) {
    return textoLimpo(valor).replace(/\D/g, "");
}

function nomeEhValido(nome) {
    const valor = textoLimpo(nome);

    if (!valor || valor === "-" || valor === ".") {
        return false;
    }

    // Nome composto apenas por números/telefone não é nome de cadastro.
    if (/^\+?[\d\s().-]+$/.test(valor)) {
        return false;
    }

    return /[A-Za-zÀ-ÿ]/.test(valor);
}

function nomeParaTabela(cliente) {
    if (nomeEhValido(cliente.nome)) {
        return textoLimpo(cliente.nome);
    }

    return "Contato SacMais";
}

function documentoEhTecnicoSacMais(valor) {
    return /^SACMAIS-/i.test(textoLimpo(valor));
}

function formatarDocumento(valor) {
    const original = textoLimpo(valor);

    if (!original || documentoEhTecnicoSacMais(original)) {
        return "—";
    }

    const digitos = somenteDigitos(original);

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

    return original;
}

function formatarTelefone(valor) {
    let digitos = somenteDigitos(valor);

    if (!digitos) {
        return "—";
    }

    // Remove o DDI 55 somente para aplicar a máscara brasileira.
    if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith("55")) {
        digitos = digitos.slice(2);
    }

    if (digitos.length === 11) {
        return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
    }

    if (digitos.length === 10) {
        return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
    }

    return textoLimpo(valor);
}

function origemParaTabela(cliente) {
    const origem = textoLimpo(cliente.origemCadastro).toUpperCase();

    if (origem === "SACMAIS" || documentoEhTecnicoSacMais(cliente.cpfCnpj) || cliente.sacmaisId) {
        return "SACMAIS";
    }

    return "ERP";
}

function ordenarClientesParaTabela(lista) {
    return [...lista].sort((a, b) => {
        const aTemNome = nomeEhValido(a.nome) ? 1 : 0;
        const bTemNome = nomeEhValido(b.nome) ? 1 : 0;

        if (aTemNome !== bTemNome) {
            return bTemNome - aTemNome;
        }

        return nomeParaTabela(a).localeCompare(
            nomeParaTabela(b),
            "pt-BR",
            { sensitivity: "base" }
        );
    });
}

function renderizarTabela(lista) {
    const tbody = document.getElementById("tabelaClientes");

    if (!tbody) {
        return;
    }

    tbody.innerHTML = "";

    const listaOrdenada = ordenarClientesParaTabela(lista);
    const totalRegistros = listaOrdenada.length;
    const totalPaginas = Math.max(1, Math.ceil(totalRegistros / clientesPorPagina));

    if (paginaAtualClientes > totalPaginas) {
        paginaAtualClientes = totalPaginas;
    }

    if (paginaAtualClientes < 1) {
        paginaAtualClientes = 1;
    }

    if (!totalRegistros) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">
                    Nenhum cliente cadastrado.
                </td>
            </tr>
        `;
        renderizarPaginacaoClientes(0, 1);
        return;
    }

    const inicio = (paginaAtualClientes - 1) * clientesPorPagina;
    const fim = inicio + clientesPorPagina;
    const clientesDaPagina = listaOrdenada.slice(inicio, fim);

    clientesDaPagina.forEach((cliente) => {
        const linha = document.createElement("tr");

        const nome = nomeParaTabela(cliente);
        const telefone = formatarTelefone(cliente.telefone || cliente.celular);
        const documento = formatarDocumento(cliente.cpfCnpj);
        const email = textoLimpo(cliente.email) || "—";
        const origem = origemParaTabela(cliente);

        linha.innerHTML = `
            <td>
                <strong>${escaparHtml(nome)}</strong>
                ${
                    nome === "Contato SacMais" && telefone !== "—"
                        ? `<div style="font-size:12px; opacity:.65; margin-top:2px;">Cadastro sem nome informado</div>`
                        : ""
                }
            </td>
            <td>${escaparHtml(telefone)}</td>
            <td>${escaparHtml(documento)}</td>
            <td>${escaparHtml(email)}</td>
            <td>
                <span class="badge ${origem === "SACMAIS" ? "badge-info" : "badge-secondary"}">
                    ${origem === "SACMAIS" ? "SacMais" : "ERP"}
                </span>
            </td>
            <td>
                <span class="badge ${cliente.ativo ? "badge-success" : "badge-danger"}">
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

    renderizarPaginacaoClientes(totalRegistros, totalPaginas);
}

function renderizarPaginacaoClientes(totalRegistros, totalPaginas) {
    const container = document.getElementById("paginacaoClientes");

    if (!container) {
        return;
    }

    if (!totalRegistros) {
        container.innerHTML = "";
        return;
    }

    const inicio = (paginaAtualClientes - 1) * clientesPorPagina + 1;
    const fim = Math.min(paginaAtualClientes * clientesPorPagina, totalRegistros);

    let primeiraPagina = Math.max(1, paginaAtualClientes - 2);
    let ultimaPagina = Math.min(totalPaginas, paginaAtualClientes + 2);

    if (paginaAtualClientes <= 3) {
        ultimaPagina = Math.min(totalPaginas, 5);
    }

    if (paginaAtualClientes >= totalPaginas - 2) {
        primeiraPagina = Math.max(1, totalPaginas - 4);
    }

    let botoesPaginas = "";

    if (primeiraPagina > 1) {
        botoesPaginas += `
            <button
                type="button"
                class="btn btn-light"
                onclick="irParaPaginaClientes(1)"
                style="min-width:42px;"
            >
                1
            </button>
        `;

        if (primeiraPagina > 2) {
            botoesPaginas += `<span class="paginacao-reticencias">...</span>`;
        }
    }

    for (let pagina = primeiraPagina; pagina <= ultimaPagina; pagina++) {
        botoesPaginas += `
            <button
                type="button"
                class="btn ${pagina === paginaAtualClientes ? "btn-primary" : "btn-light"}"
                onclick="irParaPaginaClientes(${pagina})"
                style="min-width:42px;"
                ${pagina === paginaAtualClientes ? 'aria-current="page"' : ""}
            >
                ${pagina}
            </button>
        `;
    }

    if (ultimaPagina < totalPaginas) {
        if (ultimaPagina < totalPaginas - 1) {
            botoesPaginas += `<span class="paginacao-reticencias">...</span>`;
        }

        botoesPaginas += `
            <button
                type="button"
                class="btn btn-light"
                onclick="irParaPaginaClientes(${totalPaginas})"
                style="min-width:42px;"
            >
                ${totalPaginas}
            </button>
        `;
    }

    container.innerHTML = `
        <div class="paginacao-clientes-info">
            Mostrando <strong>${inicio}</strong> até <strong>${fim}</strong>
            de <strong>${totalRegistros}</strong> clientes
        </div>

        <div class="paginacao-clientes-botoes">
            <button
                type="button"
                class="btn btn-light"
                onclick="paginaAnteriorClientes()"
                ${paginaAtualClientes <= 1 ? "disabled" : ""}
            >
                <i class="fas fa-chevron-left"></i>
                Anterior
            </button>

            ${botoesPaginas}

            <button
                type="button"
                class="btn btn-light"
                onclick="proximaPaginaClientes()"
                ${paginaAtualClientes >= totalPaginas ? "disabled" : ""}
            >
                Próxima
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    `;
}

function obterClientesFiltrados() {
    const pesquisa = document
        .getElementById("pesquisa")
        ?.value
        ?.trim()
        ?.toLowerCase() || "";

    if (!pesquisa) {
        return clientes;
    }

    return clientes.filter((cliente) => {
        const nome = nomeParaTabela(cliente).toLowerCase();
        const cpfCnpj = formatarDocumento(cliente.cpfCnpj).toLowerCase();
        const email = textoLimpo(cliente.email).toLowerCase();
        const telefone = formatarTelefone(
            cliente.telefone || cliente.celular || ""
        ).toLowerCase();
        const origem = origemParaTabela(cliente).toLowerCase();

        return (
            nome.includes(pesquisa) ||
            cpfCnpj.includes(pesquisa) ||
            email.includes(pesquisa) ||
            telefone.includes(pesquisa) ||
            origem.includes(pesquisa)
        );
    });
}

function irParaPaginaClientes(pagina) {
    const lista = obterClientesFiltrados();
    const totalPaginas = Math.max(1, Math.ceil(lista.length / clientesPorPagina));

    paginaAtualClientes = Math.min(Math.max(1, pagina), totalPaginas);
    renderizarTabela(lista);

    const tabela = document.querySelector(".table-responsive");

    if (tabela) {
        tabela.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }
}

function paginaAnteriorClientes() {
    if (paginaAtualClientes <= 1) {
        return;
    }

    irParaPaginaClientes(paginaAtualClientes - 1);
}

function proximaPaginaClientes() {
    const lista = obterClientesFiltrados();
    const totalPaginas = Math.max(1, Math.ceil(lista.length / clientesPorPagina));

    if (paginaAtualClientes >= totalPaginas) {
        return;
    }

    irParaPaginaClientes(paginaAtualClientes + 1);
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
    preencherCampo("cpfCnpj", documentoEhTecnicoSacMais(cliente.cpfCnpj) ? "" : cliente.cpfCnpj);
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
        mostrarMensagem(
            resposta.mensagem ||
            (resposta.inativado
                ? "Cliente possui histórico e foi inativado para preservar os registros."
                : "Cliente removido com sucesso.")
        );
    } catch (erro) {
        console.error(erro);
        mostrarMensagem("Erro ao excluir cliente.");
    }
}

function filtrarClientes() {
    paginaAtualClientes = 1;
    renderizarTabela(obterClientesFiltrados());
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