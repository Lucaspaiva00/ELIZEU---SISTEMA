let paginaAtual = 1;
let contasReceber = [];
let clientesDisponiveis = [];
let contasFinanceiras = [];
let temporizadorBusca;

const formasPagamento = {
    "": "Não informada",
    DINHEIRO: "Dinheiro",
    PIX: "Pix",
    CARTAO_CREDITO: "Cartão de crédito",
    CARTAO_DEBITO: "Cartão de débito",
    BOLETO: "Boleto",
    TRANSFERENCIA: "Transferência",
    CHEQUE: "Cheque",
    CREDITO_LOJA: "Crédito da loja",
    OUTRO: "Outro"
};

const nomesStatus = {
    PENDENTE: "Pendente",
    PARCIAL: "Parcial",
    ATRASADO: "Atrasado",
    PAGO: "Recebido",
    CANCELADO: "Cancelado"
};

function escapar(valor) {
    return String(valor ?? "-")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function dataInput(valor = new Date()) {
    const dataValor = new Date(valor);
    const compensacao = dataValor.getTimezoneOffset() * 60000;
    return new Date(dataValor.getTime() - compensacao).toISOString().slice(0, 10);
}

function dataSemFuso(valor) {
    const texto = String(valor || "");
    const partes = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return partes ? `${partes[3]}/${partes[2]}/${partes[1]}` : data(valor);
}

function saldoTitulo(titulo) {
    return Math.max(0,
        Number(titulo.valorOriginal || 0)
        + Number(titulo.valorJuros || 0)
        + Number(titulo.valorMulta || 0)
        - Number(titulo.valorDesconto || 0)
        - Number(titulo.valorRecebido || 0)
    );
}

function mostrarAviso(texto, tipo = "success") {
    const elemento = document.getElementById("mensagemPagina");
    elemento.textContent = texto;
    elemento.className = `financial-message ${tipo}`;
    window.clearTimeout(mostrarAviso.timeout);
    mostrarAviso.timeout = window.setTimeout(() => elemento.classList.add("d-none"), 5000);
}

async function inicializar() {
    preencherFormasPagamento();
    configurarEventos();

    await Promise.all([
        carregarClientes(),
        carregarContasFinanceiras()
    ]);

    await carregarDados();
}

function configurarEventos() {
    document.getElementById("formConta").addEventListener("submit", salvarConta);
    document.getElementById("formReceber").addEventListener("submit", registrarRecebimento);
    document.getElementById("filtroStatus").addEventListener("change", () => { paginaAtual = 1; carregarDados(); });
    document.getElementById("filtroInicio").addEventListener("change", () => { paginaAtual = 1; carregarDados(); });
    document.getElementById("filtroFim").addEventListener("change", () => { paginaAtual = 1; carregarDados(); });
    document.getElementById("filtroBusca").addEventListener("input", () => {
        window.clearTimeout(temporizadorBusca);
        temporizadorBusca = window.setTimeout(() => { paginaAtual = 1; carregarDados(); }, 350);
    });
}

function preencherFormasPagamento() {
    const html = Object.entries(formasPagamento)
        .map(([valor, nome]) => `<option value="${valor}">${nome}</option>`)
        .join("");
    document.getElementById("formaPagamento").innerHTML = html;
    document.getElementById("formaRecebimento").innerHTML = html;
}

async function carregarClientes() {
    const resposta = await get("/clientes");
    if (!resposta?.sucesso) return;
    clientesDisponiveis = (resposta.clientes || []).filter(cliente => cliente.ativo !== false);
    document.getElementById("clienteId").innerHTML = '<option value="">Selecione o cliente</option>'
        + clientesDisponiveis.map(cliente => `<option value="${cliente.id}">${escapar(cliente.nome)}</option>`).join("");
}

async function carregarContasFinanceiras() {
    const resposta = await get("/contas-financeiras");
    if (!resposta?.sucesso) return;
    contasFinanceiras = resposta.contasFinanceiras || [];
    document.getElementById("contaFinanceiraId").innerHTML = '<option value="">Selecione a conta</option>'
        + contasFinanceiras.map(conta => `<option value="${conta.id}" ${conta.padrao ? "selected" : ""}>${escapar(conta.nome)} — ${moeda(conta.saldoAtual)}</option>`).join("");
}

function montarQuery() {
    const parametros = new URLSearchParams({ pagina: paginaAtual, limite: 20 });
    const campos = {
        busca: document.getElementById("filtroBusca").value.trim(),
        status: document.getElementById("filtroStatus").value,
        vencimentoInicio: document.getElementById("filtroInicio").value,
        vencimentoFim: document.getElementById("filtroFim").value
    };
    Object.entries(campos).forEach(([chave, valor]) => { if (valor) parametros.set(chave, valor); });
    return parametros.toString();
}

async function carregarDados() {
    try {
        const filtrosResumo = new URLSearchParams();
        if (document.getElementById("filtroInicio").value) filtrosResumo.set("vencimentoInicio", document.getElementById("filtroInicio").value);
        if (document.getElementById("filtroFim").value) filtrosResumo.set("vencimentoFim", document.getElementById("filtroFim").value);

        const [listagem, resumo] = await Promise.all([
            get(`/contas-receber?${montarQuery()}`),
            get(`/contas-receber/resumo?${filtrosResumo}`)
        ]);

        if (!listagem?.sucesso) throw new Error(listagem?.mensagem || "Erro ao carregar contas a receber.");
        contasReceber = listagem.contasReceber || [];
        renderizarTabela(contasReceber);
        renderizarPaginacao(listagem.paginacao);
        if (resumo?.sucesso) preencherResumo(resumo.resumo);
    } catch (erro) {
        mostrarAviso(erro.message, "error");
    }
}

function preencherResumo(resumo) {
    document.getElementById("resumoEmAberto").textContent = moeda(resumo.totalEmAberto);
    document.getElementById("resumoRecebido").textContent = moeda(resumo.totalRecebido);
    document.getElementById("resumoAtrasado").textContent = moeda(resumo.totalAtrasado);
    document.getElementById("resumoVencendoHoje").textContent = moeda(resumo.totalVencendoHoje);
    document.getElementById("quantidadeEmAberto").textContent = `${resumo.quantidadeEmAberto} títulos pendentes`;
    document.getElementById("quantidadePagos").textContent = `${resumo.quantidadePagos} títulos recebidos`;
    document.getElementById("quantidadeAtrasados").textContent = `${resumo.quantidadeAtrasados} títulos atrasados`;
}

function renderizarTabela(lista) {
    const tbody = document.getElementById("tabelaContasReceber");
    if (!lista.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="financial-empty"><i class="fas fa-inbox"></i>Nenhuma conta a receber encontrada.</td></tr>';
        return;
    }

    tbody.innerHTML = lista.map(titulo => {
        const saldo = saldoTitulo(titulo);
        const podeAlterar = !["PAGO", "CANCELADO"].includes(titulo.status) && Number(titulo.valorRecebido) === 0;
        const podeReceber = !["PAGO", "CANCELADO"].includes(titulo.status);
        const podeCancelar = !["PAGO", "CANCELADO"].includes(titulo.status);

        return `<tr>
            <td><div class="title-client"><strong>${escapar(titulo.cliente?.nome)}</strong><span>${escapar(titulo.descricao)}</span></div></td>
            <td>${escapar(titulo.numeroDocumento || "-")}</td>
            <td class="financial-date-cell ${titulo.status === "ATRASADO" ? "overdue" : ""}">${dataSemFuso(titulo.dataVencimento)}</td>
            <td class="financial-value">${moeda(titulo.valorOriginal)}</td>
            <td class="financial-value received">${moeda(titulo.valorRecebido)}</td>
            <td class="financial-value balance">${moeda(saldo)}</td>
            <td><span class="status-badge status-${titulo.status.toLowerCase()}">${nomesStatus[titulo.status] || titulo.status}</span></td>
            <td><div class="financial-actions">
                ${podeReceber ? `<button class="action-button receive" title="Registrar recebimento" onclick="abrirModalReceber(${titulo.id})"><i class="fas fa-dollar-sign"></i></button>` : ""}
                ${podeAlterar ? `<button class="action-button" title="Editar" onclick="editarConta(${titulo.id})"><i class="fas fa-pen"></i></button>` : ""}
                ${podeCancelar ? `<button class="action-button cancel" title="Cancelar" onclick="cancelarConta(${titulo.id})"><i class="fas fa-ban"></i></button>` : ""}
            </div></td>
        </tr>`;
    }).join("");
}

function renderizarPaginacao(paginacao) {
    const dados = paginacao || { pagina: 1, total: 0, totalPaginas: 0, limite: 20 };
    document.getElementById("textoPaginacao").textContent = `${dados.total} registros encontrados`;
    const container = document.getElementById("botoesPaginacao");
    if (dados.totalPaginas <= 1) { container.innerHTML = ""; return; }

    let html = `<button class="page-button" ${dados.pagina <= 1 ? "disabled" : ""} onclick="irParaPagina(${dados.pagina - 1})"><i class="fas fa-chevron-left"></i></button>`;
    const inicio = Math.max(1, dados.pagina - 2);
    const fim = Math.min(dados.totalPaginas, dados.pagina + 2);
    for (let pagina = inicio; pagina <= fim; pagina += 1) html += `<button class="page-button ${pagina === dados.pagina ? "active" : ""}" onclick="irParaPagina(${pagina})">${pagina}</button>`;
    html += `<button class="page-button" ${dados.pagina >= dados.totalPaginas ? "disabled" : ""} onclick="irParaPagina(${dados.pagina + 1})"><i class="fas fa-chevron-right"></i></button>`;
    container.innerHTML = html;
}

function irParaPagina(pagina) { if (pagina < 1) return; paginaAtual = pagina; carregarDados(); }

function limparFiltros() {
    ["filtroBusca", "filtroStatus", "filtroInicio", "filtroFim"].forEach(id => document.getElementById(id).value = "");
    paginaAtual = 1;
    carregarDados();
}

function abrirModalConta() {
    document.getElementById("formConta").reset();
    document.getElementById("contaId").value = "";
    document.getElementById("tituloModalConta").textContent = "Nova cobrança";
    const hoje = dataInput();
    document.getElementById("dataCompetencia").value = hoje;
    document.getElementById("dataEmissao").value = hoje;
    document.getElementById("dataVencimento").value = hoje;
    document.getElementById("parcelaNumero").value = 1;
    document.getElementById("totalParcelas").value = 1;
    document.getElementById("modalConta").classList.add("active");
}

function fecharModalConta() { document.getElementById("modalConta").classList.remove("active"); }

async function editarConta(id) {
    const resposta = await get(`/contas-receber/${id}`);
    if (!resposta?.sucesso) { mostrarAviso(resposta?.mensagem || "Conta não encontrada.", "error"); return; }
    const titulo = resposta.contaReceber;
    document.getElementById("formConta").reset();
    document.getElementById("contaId").value = titulo.id;
    document.getElementById("tituloModalConta").textContent = "Editar cobrança";
    document.getElementById("clienteId").value = titulo.clienteId;
    document.getElementById("descricao").value = titulo.descricao || "";
    document.getElementById("numeroDocumento").value = titulo.numeroDocumento || "";
    document.getElementById("valorOriginal").value = Number(titulo.valorOriginal);
    document.getElementById("dataCompetencia").value = String(titulo.dataCompetencia).slice(0, 10);
    document.getElementById("dataEmissao").value = String(titulo.dataEmissao).slice(0, 10);
    document.getElementById("dataVencimento").value = String(titulo.dataVencimento).slice(0, 10);
    document.getElementById("formaPagamento").value = titulo.formaPagamento || "";
    document.getElementById("parcelaNumero").value = titulo.parcelaNumero || 1;
    document.getElementById("totalParcelas").value = titulo.totalParcelas || 1;
    document.getElementById("observacoes").value = titulo.observacoes || "";
    document.getElementById("modalConta").classList.add("active");
}

async function salvarConta(evento) {
    evento.preventDefault();
    const botao = document.getElementById("btnSalvarConta");
    botao.disabled = true;
    const id = document.getElementById("contaId").value;
    const payload = {
        clienteId: Number(document.getElementById("clienteId").value),
        descricao: document.getElementById("descricao").value.trim(),
        numeroDocumento: document.getElementById("numeroDocumento").value.trim() || null,
        valorOriginal: Number(document.getElementById("valorOriginal").value),
        dataCompetencia: document.getElementById("dataCompetencia").value,
        dataEmissao: document.getElementById("dataEmissao").value,
        dataVencimento: document.getElementById("dataVencimento").value,
        formaPagamento: document.getElementById("formaPagamento").value || null,
        parcelaNumero: Number(document.getElementById("parcelaNumero").value || 1),
        totalParcelas: Number(document.getElementById("totalParcelas").value || 1),
        observacoes: document.getElementById("observacoes").value.trim() || null
    };

    try {
        const resposta = id ? await put(`/contas-receber/${id}`, payload) : await post("/contas-receber", payload);
        if (!resposta?.sucesso) throw new Error(resposta?.mensagem || "Erro ao salvar cobrança.");
        fecharModalConta();
        mostrarAviso(id ? "Cobrança atualizada com sucesso." : "Cobrança cadastrada com sucesso.");
        await carregarDados();
    } catch (erro) { mostrarAviso(erro.message, "error"); }
    finally { botao.disabled = false; }
}

function abrirModalReceber(id) {
    const titulo = contasReceber.find(item => item.id === id);
    if (!titulo) return;
    const saldo = saldoTitulo(titulo);
    document.getElementById("formReceber").reset();
    document.getElementById("receberContaId").value = id;
    document.getElementById("saldoPendenteModal").textContent = moeda(saldo);
    document.getElementById("descricaoRecebimento").textContent = `${titulo.cliente?.nome || "Cliente"} • ${titulo.descricao}`;
    document.getElementById("valorRecebimento").value = saldo.toFixed(2);
    document.getElementById("valorRecebimento").max = saldo.toFixed(2);
    document.getElementById("dataRecebimento").value = dataInput();
    document.getElementById("formaRecebimento").value = titulo.formaPagamento || "";
    document.getElementById("valorDesconto").value = 0;
    document.getElementById("valorJuros").value = 0;
    document.getElementById("valorMulta").value = 0;
    const contaPadrao = contasFinanceiras.find(conta => conta.padrao);
    if (contaPadrao) document.getElementById("contaFinanceiraId").value = contaPadrao.id;
    document.getElementById("modalReceber").classList.add("active");
}

function fecharModalReceber() { document.getElementById("modalReceber").classList.remove("active"); }

async function registrarRecebimento(evento) {
    evento.preventDefault();
    const botao = document.getElementById("btnConfirmarRecebimento");
    botao.disabled = true;
    const id = document.getElementById("receberContaId").value;
    const payload = {
        contaFinanceiraId: Number(document.getElementById("contaFinanceiraId").value),
        valor: Number(document.getElementById("valorRecebimento").value),
        valorDesconto: Number(document.getElementById("valorDesconto").value || 0),
        valorJuros: Number(document.getElementById("valorJuros").value || 0),
        valorMulta: Number(document.getElementById("valorMulta").value || 0),
        dataRecebimento: document.getElementById("dataRecebimento").value,
        formaPagamento: document.getElementById("formaRecebimento").value || null,
        observacoes: document.getElementById("observacoesRecebimento").value.trim() || null
    };

    try {
        const resposta = await post(`/contas-receber/${id}/receber`, payload);
        if (!resposta?.sucesso) throw new Error(resposta?.mensagem || "Erro ao registrar recebimento.");
        fecharModalReceber();
        mostrarAviso(resposta.mensagem || "Recebimento registrado com sucesso.");
        await Promise.all([carregarDados(), carregarContasFinanceiras()]);
    } catch (erro) { mostrarAviso(erro.message, "error"); }
    finally { botao.disabled = false; }
}

async function cancelarConta(id) {
    const motivo = window.prompt("Informe o motivo do cancelamento:");
    if (!motivo?.trim()) return;
    try {
        const resposta = await post(`/contas-receber/${id}/cancelar`, { motivo: motivo.trim() });
        if (!resposta?.sucesso) throw new Error(resposta?.mensagem || "Erro ao cancelar cobrança.");
        mostrarAviso(resposta.mensagem || "Cobrança cancelada.");
        await carregarDados();
    } catch (erro) { mostrarAviso(erro.message, "error"); }
}

document.addEventListener("DOMContentLoaded", inicializar);
