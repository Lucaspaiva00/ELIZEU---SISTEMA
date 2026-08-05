let paginaAtual = 1;
let contasPagar = [];
let contasFinanceiras = [];
let categoriasFinanceiras = [];
let centrosCusto = [];
let temporizadorBusca;

const formasPagamento = {
    "": "Não informada", DINHEIRO: "Dinheiro", PIX: "Pix",
    CARTAO_CREDITO: "Cartão de crédito", CARTAO_DEBITO: "Cartão de débito",
    BOLETO: "Boleto", TRANSFERENCIA: "Transferência", CHEQUE: "Cheque",
    CREDITO_LOJA: "Crédito da loja", OUTRO: "Outro"
};
const nomesStatus = { PENDENTE: "Pendente", PARCIAL: "Parcial", ATRASADO: "Atrasado", PAGO: "Pago", CANCELADO: "Cancelado" };

function escapar(valor) {
    return String(valor ?? "-").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function dataInput(valor = new Date()) {
    const dataValor = new Date(valor);
    return new Date(dataValor.getTime() - dataValor.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function dataSemFuso(valor) {
    const partes = String(valor || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    return partes ? `${partes[3]}/${partes[2]}/${partes[1]}` : data(valor);
}

function saldoTitulo(titulo) {
    return Math.max(0, Number(titulo.valorOriginal || 0) + Number(titulo.valorJuros || 0) + Number(titulo.valorMulta || 0) - Number(titulo.valorDesconto || 0) - Number(titulo.valorPago || 0));
}

function mostrarAviso(texto, tipo = "success") {
    const elemento = document.getElementById("mensagemPagina");
    elemento.textContent = texto;
    elemento.className = `financial-message ${tipo}`;
    clearTimeout(mostrarAviso.timeout);
    mostrarAviso.timeout = setTimeout(() => elemento.classList.add("d-none"), 5000);
}

async function inicializar() {
    const htmlFormas = Object.entries(formasPagamento).map(([valor, nome]) => `<option value="${valor}">${nome}</option>`).join("");
    document.getElementById("formaPagamento").innerHTML = htmlFormas;
    document.getElementById("formaPagamentoBaixa").innerHTML = htmlFormas;
    configurarEventos();
    await carregarContasFinanceiras();
    await carregarCadastrosFinanceiros();
    await carregarDados();
}

async function carregarCadastrosFinanceiros() {
    const [respostaCategorias, respostaCentros] = await Promise.all([get("/categorias-financeiras"), get("/centros-custo")]);
    categoriasFinanceiras = (respostaCategorias?.categoriasFinanceiras || []).filter(categoria => ["DESPESA", "AMBAS"].includes(categoria.natureza));
    centrosCusto = respostaCentros?.centrosCusto || [];
    document.getElementById("categoriaFinanceiraId").innerHTML = '<option value="">Despesas Operacionais</option>' + categoriasFinanceiras.map(categoria => `<option value="${categoria.id}">${escapar(categoria.nome)}</option>`).join("");
    document.getElementById("centroCustoId").innerHTML = '<option value="">Geral</option>' + centrosCusto.map(centro => `<option value="${centro.id}">${escapar(centro.codigo)} — ${escapar(centro.nome)}</option>`).join("");
}

function configurarEventos() {
    document.getElementById("formConta").addEventListener("submit", salvarConta);
    document.getElementById("formPagar").addEventListener("submit", registrarPagamento);
    document.getElementById("filtroStatus").addEventListener("change", atualizarFiltros);
    document.getElementById("filtroInicio").addEventListener("change", atualizarFiltros);
    document.getElementById("filtroFim").addEventListener("change", atualizarFiltros);
    document.getElementById("filtroBusca").addEventListener("input", () => {
        clearTimeout(temporizadorBusca);
        temporizadorBusca = setTimeout(atualizarFiltros, 350);
    });
    document.getElementById("gerarMultiplos").addEventListener("change", alternarGeracao);
    document.getElementById("periodicidadeParcelas").addEventListener("change", atualizarGeracao);
    document.getElementById("modoGeracao").addEventListener("change", atualizarGeracao);
    document.getElementById("quantidadeParcelas").addEventListener("input", atualizarGeracao);
    document.getElementById("valorOriginal").addEventListener("input", atualizarGeracao);
}

function atualizarFiltros() { paginaAtual = 1; carregarDados(); }

async function carregarContasFinanceiras() {
    const resposta = await get("/contas-financeiras");
    if (!resposta?.sucesso) return;
    contasFinanceiras = resposta.contasFinanceiras || [];
    document.getElementById("contaFinanceiraId").innerHTML = '<option value="">Selecione a conta</option>' + contasFinanceiras.map(conta => `<option value="${conta.id}" ${conta.padrao ? "selected" : ""}>${escapar(conta.nome)} — ${moeda(conta.saldoAtual)}</option>`).join("");
}

function montarQuery() {
    const parametros = new URLSearchParams({ pagina: paginaAtual, limite: 20 });
    const filtros = { busca: document.getElementById("filtroBusca").value.trim(), status: document.getElementById("filtroStatus").value, vencimentoInicio: document.getElementById("filtroInicio").value, vencimentoFim: document.getElementById("filtroFim").value };
    Object.entries(filtros).forEach(([chave, valor]) => { if (valor) parametros.set(chave, valor); });
    return parametros.toString();
}

async function carregarDados() {
    try {
        const resumoQuery = new URLSearchParams();
        if (document.getElementById("filtroInicio").value) resumoQuery.set("vencimentoInicio", document.getElementById("filtroInicio").value);
        if (document.getElementById("filtroFim").value) resumoQuery.set("vencimentoFim", document.getElementById("filtroFim").value);
        const [listagem, resumo] = await Promise.all([get(`/contas-pagar?${montarQuery()}`), get(`/contas-pagar/resumo?${resumoQuery}`)]);
        if (!listagem?.sucesso) throw new Error(listagem?.mensagem || "Erro ao carregar contas a pagar.");
        contasPagar = listagem.contasPagar || [];
        renderizarTabela(contasPagar);
        renderizarPaginacao(listagem.paginacao);
        if (resumo?.sucesso) preencherResumo(resumo.resumo);
    } catch (erro) { mostrarAviso(erro.message, "error"); }
}

function preencherResumo(resumo) {
    document.getElementById("resumoEmAberto").textContent = moeda(resumo.totalEmAberto);
    document.getElementById("resumoPago").textContent = moeda(resumo.totalPago);
    document.getElementById("resumoAtrasado").textContent = moeda(resumo.totalAtrasado);
    document.getElementById("resumoVencendoHoje").textContent = moeda(resumo.totalVencendoHoje);
    document.getElementById("quantidadeEmAberto").textContent = `${resumo.quantidadeEmAberto} títulos pendentes`;
    document.getElementById("quantidadePagos").textContent = `${resumo.quantidadePagos} títulos pagos`;
    document.getElementById("quantidadeAtrasados").textContent = `${resumo.quantidadeAtrasados} títulos atrasados`;
}

function renderizarTabela(lista) {
    const tbody = document.getElementById("tabelaContasPagar");
    if (!lista.length) { tbody.innerHTML = '<tr><td colspan="8" class="financial-empty"><i class="fas fa-inbox"></i>Nenhuma conta a pagar encontrada.</td></tr>'; return; }
    tbody.innerHTML = lista.map(titulo => {
        const saldo = saldoTitulo(titulo);
        const podeAlterar = !["PAGO", "CANCELADO"].includes(titulo.status) && Number(titulo.valorPago) === 0;
        const podePagar = !["PAGO", "CANCELADO"].includes(titulo.status);
        const podeCancelar = !["PAGO", "CANCELADO"].includes(titulo.status);
        const recorrente = titulo.recorrente ? '<span class="recurrence-label"><i class="fas fa-repeat"></i> recorrente</span>' : "";
        return `<tr>
            <td><div class="title-client"><strong>${escapar(titulo.fornecedorNome || "Fornecedor não informado")}</strong><span>${escapar(titulo.descricao)} ${recorrente}</span></div></td>
            <td>${escapar(titulo.numeroDocumento || "-")}</td>
            <td class="financial-date-cell ${titulo.status === "ATRASADO" ? "overdue" : ""}">${dataSemFuso(titulo.dataVencimento)}</td>
            <td class="financial-value">${moeda(titulo.valorOriginal)}</td><td class="financial-value received">${moeda(titulo.valorPago)}</td><td class="financial-value balance">${moeda(saldo)}</td>
            <td><span class="status-badge status-${titulo.status.toLowerCase()}">${nomesStatus[titulo.status] || titulo.status}</span></td>
            <td><div class="financial-actions">${podePagar ? `<button class="action-button pay" title="Registrar pagamento" onclick="abrirModalPagar(${titulo.id})"><i class="fas fa-dollar-sign"></i></button>` : ""}${podeAlterar ? `<button class="action-button" title="Editar" onclick="editarConta(${titulo.id})"><i class="fas fa-pen"></i></button>` : ""}${podeCancelar ? `<button class="action-button cancel" title="Cancelar" onclick="cancelarConta(${titulo.id})"><i class="fas fa-ban"></i></button>` : ""}</div></td>
        </tr>`;
    }).join("");
}

function renderizarPaginacao(paginacao = {}) {
    const dados = { pagina: 1, total: 0, totalPaginas: 0, ...paginacao };
    document.getElementById("textoPaginacao").textContent = `${dados.total} registros encontrados`;
    const container = document.getElementById("botoesPaginacao");
    if (dados.totalPaginas <= 1) { container.innerHTML = ""; return; }
    let html = `<button class="page-button" ${dados.pagina <= 1 ? "disabled" : ""} onclick="irParaPagina(${dados.pagina - 1})"><i class="fas fa-chevron-left"></i></button>`;
    for (let pagina = Math.max(1, dados.pagina - 2); pagina <= Math.min(dados.totalPaginas, dados.pagina + 2); pagina += 1) html += `<button class="page-button ${pagina === dados.pagina ? "active" : ""}" onclick="irParaPagina(${pagina})">${pagina}</button>`;
    html += `<button class="page-button" ${dados.pagina >= dados.totalPaginas ? "disabled" : ""} onclick="irParaPagina(${dados.pagina + 1})"><i class="fas fa-chevron-right"></i></button>`;
    container.innerHTML = html;
}

function irParaPagina(pagina) { if (pagina < 1) return; paginaAtual = pagina; carregarDados(); }
function limparFiltros() { ["filtroBusca", "filtroStatus", "filtroInicio", "filtroFim"].forEach(id => document.getElementById(id).value = ""); atualizarFiltros(); }

function abrirModalConta() {
    document.getElementById("formConta").reset();
    document.getElementById("contaId").value = "";
    document.getElementById("tituloModalConta").textContent = "Nova despesa";
    ["dataCompetencia", "dataEmissao", "dataVencimento"].forEach(id => document.getElementById(id).value = dataInput());
    document.getElementById("quantidadeParcelas").value = 2;
    document.getElementById("periodicidadeParcelas").value = "MENSAL";
    document.getElementById("blocoGeracao").classList.remove("d-none");
    alternarGeracao();
    document.getElementById("modalConta").classList.add("active");
}
function fecharModalConta() { document.getElementById("modalConta").classList.remove("active"); }

function alternarGeracao() {
    document.getElementById("camposGeracao").classList.toggle("d-none", !document.getElementById("gerarMultiplos").checked);
    atualizarGeracao();
}

function atualizarGeracao() {
    const personalizada = document.getElementById("periodicidadeParcelas").value === "PERSONALIZADA";
    document.getElementById("grupoIntervalo").classList.toggle("d-none", !personalizada);
    const quantidade = Math.max(2, Number(document.getElementById("quantidadeParcelas").value || 2));
    const valor = Number(document.getElementById("valorOriginal").value || 0);
    const modo = document.getElementById("modoGeracao").value;
    document.getElementById("textoGeracao").textContent = modo === "RECORRENCIA" ? `Serão criados ${quantidade} lançamentos de ${moeda(valor)} cada.` : `O valor total será dividido em ${quantidade} parcelas de aproximadamente ${moeda(valor / quantidade)}.`;
}

async function editarConta(id) {
    const resposta = await get(`/contas-pagar/${id}`);
    if (!resposta?.sucesso) { mostrarAviso(resposta?.mensagem || "Conta não encontrada.", "error"); return; }
    const titulo = resposta.contaPagar;
    document.getElementById("formConta").reset();
    document.getElementById("contaId").value = titulo.id;
    document.getElementById("tituloModalConta").textContent = "Editar despesa";
    ["fornecedorNome", "fornecedorDocumento", "descricao", "numeroDocumento", "observacoes"].forEach(idCampo => document.getElementById(idCampo).value = titulo[idCampo] || "");
    document.getElementById("valorOriginal").value = Number(titulo.valorOriginal);
    ["dataCompetencia", "dataEmissao", "dataVencimento"].forEach(idCampo => document.getElementById(idCampo).value = String(titulo[idCampo]).slice(0, 10));
    document.getElementById("formaPagamento").value = titulo.formaPagamento || "";
    document.getElementById("categoriaFinanceiraId").value = titulo.categoriaFinanceiraId || "";
    document.getElementById("centroCustoId").value = titulo.centroCustoId || "";
    document.getElementById("blocoGeracao").classList.add("d-none");
    document.getElementById("modalConta").classList.add("active");
}

async function salvarConta(evento) {
    evento.preventDefault();
    const botao = document.getElementById("btnSalvarConta"); botao.disabled = true;
    const id = document.getElementById("contaId").value;
    const multiplos = !id && document.getElementById("gerarMultiplos").checked;
    const payload = {
        fornecedorNome: document.getElementById("fornecedorNome").value.trim() || null,
        fornecedorDocumento: document.getElementById("fornecedorDocumento").value.trim() || null,
        descricao: document.getElementById("descricao").value.trim(), numeroDocumento: document.getElementById("numeroDocumento").value.trim() || null,
        valorOriginal: Number(document.getElementById("valorOriginal").value), dataCompetencia: document.getElementById("dataCompetencia").value,
        dataEmissao: document.getElementById("dataEmissao").value, dataVencimento: document.getElementById("dataVencimento").value,
        formaPagamento: document.getElementById("formaPagamento").value || null, observacoes: document.getElementById("observacoes").value.trim() || null,
        categoriaFinanceiraId: document.getElementById("categoriaFinanceiraId").value ? Number(document.getElementById("categoriaFinanceiraId").value) : null,
        centroCustoId: document.getElementById("centroCustoId").value ? Number(document.getElementById("centroCustoId").value) : null,
        quantidadeParcelas: multiplos ? Number(document.getElementById("quantidadeParcelas").value) : 1,
        modoGeracao: multiplos ? document.getElementById("modoGeracao").value : "PARCELAMENTO",
        periodicidadeParcelas: multiplos ? document.getElementById("periodicidadeParcelas").value : "MENSAL",
        intervaloPersonalizadoDias: multiplos && document.getElementById("periodicidadeParcelas").value === "PERSONALIZADA" ? Number(document.getElementById("intervaloPersonalizadoDias").value) : null
    };
    try {
        const resposta = id ? await put(`/contas-pagar/${id}`, payload) : await post("/contas-pagar", payload);
        if (!resposta?.sucesso) throw new Error(resposta?.mensagem || "Erro ao salvar despesa.");
        fecharModalConta(); mostrarAviso(resposta.mensagem || (id ? "Despesa atualizada." : "Despesa cadastrada.")); await carregarDados();
    } catch (erro) { mostrarAviso(erro.message, "error"); } finally { botao.disabled = false; }
}

function abrirModalPagar(id) {
    const titulo = contasPagar.find(item => item.id === id); if (!titulo) return;
    const saldo = saldoTitulo(titulo); document.getElementById("formPagar").reset();
    document.getElementById("pagarContaId").value = id; document.getElementById("saldoPendenteModal").textContent = moeda(saldo);
    document.getElementById("descricaoPagamento").textContent = `${titulo.fornecedorNome || "Fornecedor"} • ${titulo.descricao}`;
    document.getElementById("valorPagamento").value = saldo.toFixed(2);
    document.getElementById("dataPagamento").value = dataInput(); document.getElementById("formaPagamentoBaixa").value = titulo.formaPagamento || "";
    ["valorDesconto", "valorJuros", "valorMulta"].forEach(idCampo => document.getElementById(idCampo).value = 0);
    const padrao = contasFinanceiras.find(conta => conta.padrao); if (padrao) document.getElementById("contaFinanceiraId").value = padrao.id;
    document.getElementById("modalPagar").classList.add("active");
}
function fecharModalPagar() { document.getElementById("modalPagar").classList.remove("active"); }

async function registrarPagamento(evento) {
    evento.preventDefault(); const botao = document.getElementById("btnConfirmarPagamento"); botao.disabled = true;
    const id = document.getElementById("pagarContaId").value;
    const payload = { contaFinanceiraId: Number(document.getElementById("contaFinanceiraId").value), valor: Number(document.getElementById("valorPagamento").value), valorDesconto: Number(document.getElementById("valorDesconto").value || 0), valorJuros: Number(document.getElementById("valorJuros").value || 0), valorMulta: Number(document.getElementById("valorMulta").value || 0), dataPagamento: document.getElementById("dataPagamento").value, formaPagamento: document.getElementById("formaPagamentoBaixa").value || null, observacoes: document.getElementById("observacoesPagamento").value.trim() || null };
    try {
        const resposta = await post(`/contas-pagar/${id}/pagar`, payload); if (!resposta?.sucesso) throw new Error(resposta?.mensagem || "Erro ao registrar pagamento.");
        fecharModalPagar(); mostrarAviso(resposta.mensagem || "Pagamento registrado."); await Promise.all([carregarDados(), carregarContasFinanceiras()]);
    } catch (erro) { mostrarAviso(erro.message, "error"); } finally { botao.disabled = false; }
}

async function cancelarConta(id) {
    const motivo = prompt("Informe o motivo do cancelamento:"); if (!motivo?.trim()) return;
    try { const resposta = await post(`/contas-pagar/${id}/cancelar`, { motivo: motivo.trim() }); if (!resposta?.sucesso) throw new Error(resposta?.mensagem || "Erro ao cancelar despesa."); mostrarAviso(resposta.mensagem || "Despesa cancelada."); await carregarDados(); }
    catch (erro) { mostrarAviso(erro.message, "error"); }
}

document.addEventListener("DOMContentLoaded", inicializar);
