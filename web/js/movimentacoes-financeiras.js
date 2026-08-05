let paginaAtual = 1;
let contasFinanceiras = [];
let movimentacoes = [];
let categoriasFinanceiras = [];
let centrosCusto = [];
let temporizadorBusca;

const formasPagamento = { "": "Não informada", DINHEIRO: "Dinheiro", PIX: "Pix", CARTAO_CREDITO: "Cartão de crédito", CARTAO_DEBITO: "Cartão de débito", BOLETO: "Boleto", TRANSFERENCIA: "Transferência", CHEQUE: "Cheque", CREDITO_LOJA: "Crédito da loja", OUTRO: "Outro" };
const origens = { CONTA_RECEBER: "Conta a receber", CONTA_PAGAR: "Conta a pagar", VENDA: "Venda", LANCAMENTO_MANUAL: "Manual", TRANSFERENCIA: "Transferência", ESTORNO: "Estorno", AJUSTE: "Ajuste" };

function escapar(valor) { return String(valor ?? "-").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
function dataInput(valor = new Date()) { const d = new Date(valor); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
function dataSemFuso(valor) { const p = String(valor || "").match(/^(\d{4})-(\d{2})-(\d{2})/); return p ? `${p[3]}/${p[2]}/${p[1]}` : data(valor); }
function mostrarAviso(texto, tipo = "success") { const el = document.getElementById("mensagemPagina"); el.textContent = texto; el.className = `financial-message ${tipo}`; clearTimeout(mostrarAviso.timeout); mostrarAviso.timeout = setTimeout(() => el.classList.add("d-none"), 5000); }

async function inicializar() {
    preencherFormas(); configurarEventos(); definirPeriodoMes(); await Promise.all([carregarContas(), carregarCadastrosFinanceiros()]); await carregarDados();
}

function preencherFormas() { document.getElementById("formaLancamento").innerHTML = Object.entries(formasPagamento).map(([v,n]) => `<option value="${v}">${n}</option>`).join(""); }
function definirPeriodoMes() { const hoje = new Date(); document.getElementById("filtroInicio").value = dataInput(new Date(hoje.getFullYear(), hoje.getMonth(), 1)); document.getElementById("filtroFim").value = dataInput(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)); }

function configurarEventos() {
    document.getElementById("formLancamento").addEventListener("submit", salvarLancamento);
    document.getElementById("formTransferencia").addEventListener("submit", salvarTransferencia);
    ["filtroConta", "filtroTipo", "filtroOrigem", "filtroInicio", "filtroFim", "incluirEstornadas"].forEach(id => document.getElementById(id).addEventListener("change", atualizarFiltros));
    document.getElementById("filtroBusca").addEventListener("input", () => { clearTimeout(temporizadorBusca); temporizadorBusca = setTimeout(atualizarFiltros, 350); });
    document.querySelectorAll('input[name="tipoLancamento"]').forEach(campo => campo.addEventListener("change", preencherCategoriasLancamento));
}

async function carregarCadastrosFinanceiros() {
    const [respostaCategorias, respostaCentros] = await Promise.all([get("/categorias-financeiras"), get("/centros-custo")]);
    categoriasFinanceiras = respostaCategorias?.categoriasFinanceiras || [];
    centrosCusto = respostaCentros?.centrosCusto || [];
    const opcoesCentros = centrosCusto.map(centro => `<option value="${centro.id}">${escapar(centro.codigo)} — ${escapar(centro.nome)}</option>`).join("");
    document.getElementById("centroLancamento").innerHTML = '<option value="">Geral</option>' + opcoesCentros;
    document.getElementById("centroTransferencia").innerHTML = '<option value="">Geral</option>' + opcoesCentros;
    preencherCategoriasLancamento();
}

function preencherCategoriasLancamento() {
    const tipo = document.querySelector('input[name="tipoLancamento"]:checked')?.value || "ENTRADA";
    const permitidas = tipo === "ENTRADA" ? ["RECEITA", "AMBAS"] : ["DESPESA", "AMBAS"];
    const atual = document.getElementById("categoriaLancamento").value;
    document.getElementById("categoriaLancamento").innerHTML = '<option value="">Categoria padrão</option>'
        + categoriasFinanceiras.filter(categoria => permitidas.includes(categoria.natureza)).map(categoria => `<option value="${categoria.id}">${escapar(categoria.nome)}</option>`).join("");
    if ([...document.getElementById("categoriaLancamento").options].some(opcao => opcao.value === atual)) document.getElementById("categoriaLancamento").value = atual;
}
function atualizarFiltros() { paginaAtual = 1; carregarDados(); }

async function carregarContas() {
    const resposta = await get("/contas-financeiras"); if (!resposta?.sucesso) return;
    contasFinanceiras = resposta.contasFinanceiras || [];
    const opcoes = contasFinanceiras.map(c => `<option value="${c.id}">${escapar(c.nome)} — ${moeda(c.saldoAtual)}</option>`).join("");
    document.getElementById("filtroConta").innerHTML = '<option value="">Todas as contas</option>' + opcoes;
    document.getElementById("contaLancamento").innerHTML = '<option value="">Selecione a conta</option>' + opcoes;
    document.getElementById("contaOrigem").innerHTML = '<option value="">Selecione a origem</option>' + opcoes;
    document.getElementById("contaDestino").innerHTML = '<option value="">Selecione o destino</option>' + opcoes;
}

function montarQuery() {
    const p = new URLSearchParams({ pagina: paginaAtual, limite: 30, incluirEstornadas: document.getElementById("incluirEstornadas").checked });
    const filtros = { busca: document.getElementById("filtroBusca").value.trim(), contaFinanceiraId: document.getElementById("filtroConta").value, tipo: document.getElementById("filtroTipo").value, origem: document.getElementById("filtroOrigem").value, dataInicio: document.getElementById("filtroInicio").value, dataFim: document.getElementById("filtroFim").value };
    Object.entries(filtros).forEach(([k,v]) => { if (v) p.set(k,v); }); return p;
}

async function carregarDados() {
    try {
        const query = montarQuery(); const resumoQuery = new URLSearchParams();
        ["contaFinanceiraId", "dataInicio", "dataFim"].forEach(k => { if (query.get(k)) resumoQuery.set(k, query.get(k)); });
        const [lista,resumo] = await Promise.all([get(`/movimentacoes-financeiras?${query}`), get(`/movimentacoes-financeiras/resumo?${resumoQuery}`)]);
        if (!lista?.sucesso) throw new Error(lista?.mensagem || "Erro ao carregar movimentações.");
        movimentacoes = lista.movimentacoes || []; renderizarTabela(); renderizarPaginacao(lista.paginacao); if (resumo?.sucesso) preencherResumo(resumo.resumo);
    } catch (erro) { mostrarAviso(erro.message,"error"); }
}

function preencherResumo(r) {
    document.getElementById("saldoAtual").textContent = moeda(r.saldoAtual); document.getElementById("entradasPeriodo").textContent = moeda(r.entradasPeriodo); document.getElementById("saidasPeriodo").textContent = moeda(r.saidasPeriodo); document.getElementById("resultadoPeriodo").textContent = moeda(r.resultadoPeriodo);
    document.getElementById("quantidadeEntradas").textContent = `${r.quantidadeEntradas} movimentações`; document.getElementById("quantidadeSaidas").textContent = `${r.quantidadeSaidas} movimentações`;
}

function renderizarTabela() {
    const tbody = document.getElementById("tabelaMovimentacoes"); if (!movimentacoes.length) { tbody.innerHTML = '<tr><td colspan="7" class="financial-empty"><i class="fas fa-receipt"></i>Nenhuma movimentação encontrada.</td></tr>'; return; }
    tbody.innerHTML = movimentacoes.map(m => {
        const entrada = m.tipo === "ENTRADA", classe = entrada ? "in" : "out", sinal = entrada ? "+" : "−", icone = entrada ? "fa-arrow-down" : "fa-arrow-up";
        const complemento = [m.categoriaFinanceira?.nome, m.criadoPor?.nome].filter(Boolean).join(" • ");
        return `<tr class="${m.estornada ? "statement-row-estornada" : ""}"><td class="financial-date-cell">${dataSemFuso(m.dataMovimentacao)}</td><td><div class="statement-description"><span class="statement-direction ${classe}"><i class="fas ${icone}"></i></span><div><strong>${escapar(m.descricao)}</strong><span>${escapar(complemento || formasPagamento[m.formaPagamento] || "Sem detalhes")}</span>${m.estornada ? '<em class="estornada-label">Estornada</em>' : ""}</div></div></td><td>${escapar(m.contaFinanceira?.nome)}</td><td><span class="statement-origin">${origens[m.origem] || m.origem}</span></td><td>${escapar(m.documento || "-")}</td><td class="text-right"><strong class="statement-amount ${classe}">${sinal} ${moeda(m.valor)}</strong></td><td><div class="financial-actions">${!m.estornada && m.origem !== "ESTORNO" ? `<button class="action-button cancel" title="Estornar" onclick="estornarMovimentacao(${m.id})"><i class="fas fa-rotate-left"></i></button>` : ""}</div></td></tr>`;
    }).join("");
}

function renderizarPaginacao(d = {}) {
    d = { pagina:1,total:0,totalPaginas:0,...d }; document.getElementById("textoPaginacao").textContent = `${d.total} movimentações encontradas`; const c=document.getElementById("botoesPaginacao"); if(d.totalPaginas<=1){c.innerHTML="";return;}
    let h=`<button class="page-button" ${d.pagina<=1?"disabled":""} onclick="irParaPagina(${d.pagina-1})"><i class="fas fa-chevron-left"></i></button>`; for(let p=Math.max(1,d.pagina-2);p<=Math.min(d.totalPaginas,d.pagina+2);p++)h+=`<button class="page-button ${p===d.pagina?"active":""}" onclick="irParaPagina(${p})">${p}</button>`; h+=`<button class="page-button" ${d.pagina>=d.totalPaginas?"disabled":""} onclick="irParaPagina(${d.pagina+1})"><i class="fas fa-chevron-right"></i></button>`; c.innerHTML=h;
}
function irParaPagina(p){if(p<1)return;paginaAtual=p;carregarDados();}
function limparFiltros(){document.getElementById("filtroBusca").value="";document.getElementById("filtroConta").value="";document.getElementById("filtroTipo").value="";document.getElementById("filtroOrigem").value="";document.getElementById("incluirEstornadas").checked=true;definirPeriodoMes();atualizarFiltros();}

function abrirModalLancamento(){document.getElementById("formLancamento").reset();document.querySelector('input[name="tipoLancamento"][value="ENTRADA"]').checked=true;preencherCategoriasLancamento();document.getElementById("dataLancamento").value=dataInput();document.getElementById("competenciaLancamento").value=dataInput();const padrao=contasFinanceiras.find(c=>c.padrao);if(padrao)document.getElementById("contaLancamento").value=padrao.id;document.getElementById("modalLancamento").classList.add("active");}
function fecharModalLancamento(){document.getElementById("modalLancamento").classList.remove("active");}
async function salvarLancamento(e){e.preventDefault();const b=document.getElementById("btnSalvarLancamento");b.disabled=true;const payload={tipo:document.querySelector('input[name="tipoLancamento"]:checked').value,contaFinanceiraId:Number(document.getElementById("contaLancamento").value),categoriaFinanceiraId:document.getElementById("categoriaLancamento").value?Number(document.getElementById("categoriaLancamento").value):null,centroCustoId:document.getElementById("centroLancamento").value?Number(document.getElementById("centroLancamento").value):null,descricao:document.getElementById("descricaoLancamento").value.trim(),valor:Number(document.getElementById("valorLancamento").value),dataMovimentacao:document.getElementById("dataLancamento").value,dataCompetencia:document.getElementById("competenciaLancamento").value||null,formaPagamento:document.getElementById("formaLancamento").value||null,documento:document.getElementById("documentoLancamento").value.trim()||null,observacoes:document.getElementById("observacoesLancamento").value.trim()||null};try{const r=await post("/movimentacoes-financeiras/manual",payload);if(!r?.sucesso)throw new Error(r?.mensagem||"Erro ao lançar movimentação.");fecharModalLancamento();mostrarAviso(r.mensagem||"Lançamento registrado.");await Promise.all([carregarContas(),carregarDados()]);}catch(erro){mostrarAviso(erro.message,"error");}finally{b.disabled=false;}}

function abrirModalTransferencia(){if(contasFinanceiras.length<2){mostrarAviso("Cadastre pelo menos duas contas ativas para realizar uma transferência.","error");return;}document.getElementById("formTransferencia").reset();document.getElementById("dataTransferencia").value=dataInput();const padrao=contasFinanceiras.find(c=>c.padrao);if(padrao)document.getElementById("contaOrigem").value=padrao.id;document.getElementById("modalTransferencia").classList.add("active");}
function fecharModalTransferencia(){document.getElementById("modalTransferencia").classList.remove("active");}
async function salvarTransferencia(e){e.preventDefault();const b=document.getElementById("btnTransferir");b.disabled=true;const payload={contaOrigemId:Number(document.getElementById("contaOrigem").value),contaDestinoId:Number(document.getElementById("contaDestino").value),centroCustoId:document.getElementById("centroTransferencia").value?Number(document.getElementById("centroTransferencia").value):null,valor:Number(document.getElementById("valorTransferencia").value),dataMovimentacao:document.getElementById("dataTransferencia").value,descricao:document.getElementById("descricaoTransferencia").value.trim()||null,documento:document.getElementById("documentoTransferencia").value.trim()||null,observacoes:document.getElementById("observacoesTransferencia").value.trim()||null};try{const r=await post("/movimentacoes-financeiras/transferir",payload);if(!r?.sucesso)throw new Error(r?.mensagem||"Erro na transferência.");fecharModalTransferencia();mostrarAviso(r.mensagem||"Transferência registrada.");await Promise.all([carregarContas(),carregarDados()]);}catch(erro){mostrarAviso(erro.message,"error");}finally{b.disabled=false;}}

async function estornarMovimentacao(id){const motivo=prompt("Informe o motivo do estorno:");if(!motivo?.trim())return;if(!confirm("Confirma o estorno desta movimentação? O saldo e o título relacionado serão atualizados."))return;try{const r=await post(`/movimentacoes-financeiras/${id}/estornar`,{motivo:motivo.trim(),dataEstorno:dataInput()});if(!r?.sucesso)throw new Error(r?.mensagem||"Erro ao estornar movimentação.");mostrarAviso(r.mensagem||"Movimentação estornada.");await Promise.all([carregarContas(),carregarDados()]);}catch(erro){mostrarAviso(erro.message,"error");}}

document.addEventListener("DOMContentLoaded",inicializar);
