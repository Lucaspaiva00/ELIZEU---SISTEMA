let vendas = [];
let vendaAtualId = null;

const statusVenda = {
    CONFIRMADA: { texto: "Aguardando faturamento", classe: "badge-warning" },
    FATURADA: { texto: "Faturada", classe: "badge-success" },
    CANCELADA: { texto: "Cancelada", classe: "badge-danger" }
};


const statusNfe = {
    PENDENTE_CONFIGURACAO: { texto: "Pendente", classe: "badge-warning" },
    PRONTA_TRANSMISSAO: { texto: "Pronta para transmissão", classe: "badge-info" },
    TRANSMITINDO: { texto: "Transmitindo", classe: "badge-info" },
    AUTORIZADA: { texto: "NF-e autorizada", classe: "badge-success" },
    REJEITADA: { texto: "Rejeitada", classe: "badge-danger" },
    ERRO: { texto: "Erro", classe: "badge-danger" },
    CANCELADA: { texto: "Cancelada", classe: "badge-secondary" }
};

function fiscalVenda(venda) {
    if (venda.notaFiscal) {
        return statusNfe[venda.notaFiscal.status] || {
            texto: venda.notaFiscal.status,
            classe: "badge-secondary"
        };
    }

    if (venda.status === "FATURADA") {
        return { texto: "Não emitida", classe: "badge-warning" };
    }

    return { texto: "—", classe: "badge-secondary" };
}

function htmlPendenciasFiscal(pendencias) {
    if (!pendencias?.length) return "";

    const itens = pendencias.map(p => `<li style="margin-bottom:6px;">${esc(p.mensagem)}</li>`).join("");
    return `
        <div class="alert alert-warning" style="margin:0;">
            <strong>Antes de emitir:</strong>
            <ul style="margin:8px 0 0 20px;">${itens}</ul>
            <div style="margin-top:10px;">
                <a href="empresas.html" class="btn btn-light btn-sm">
                    <i class="fas fa-building"></i> Configuração da empresa
                </a>
                <a href="produtos.html" class="btn btn-light btn-sm">
                    <i class="fas fa-box"></i> Produtos
                </a>
                <a href="clientes.html" class="btn btn-light btn-sm">
                    <i class="fas fa-user"></i> Clientes
                </a>
            </div>
        </div>
    `;
}

const formasPagamento = {
    DINHEIRO: "Dinheiro", PIX: "PIX", CARTAO_CREDITO: "Cartão de crédito",
    CARTAO_DEBITO: "Cartão de débito", BOLETO: "Boleto", TRANSFERENCIA: "Transferência",
    CHEQUE: "Cheque", CREDITO_LOJA: "Crédito loja", OUTRO: "Outro"
};

function esc(v) {
    return String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function fmtData(v) {
    if (!v) return "—";
    return new Date(v).toLocaleDateString("pt-BR");
}

function fmtMoeda(v) {
    return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

document.addEventListener("DOMContentLoaded", carregarVendas);

async function carregarVendas() {
    try {
        const r = await get("/vendas");
        if (!r?.sucesso) return mostrarMensagem(r?.mensagem || "Erro ao carregar vendas.");
        vendas = r.vendas || [];
        renderizarVendas(vendas);
    } catch (e) {
        console.error(e);
        mostrarMensagem(e.message || "Erro ao carregar vendas.");
    }
}

function renderizarVendas(lista) {
    const tbody = document.getElementById("tabelaVendas");
    tbody.innerHTML = "";
    if (!lista.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">Nenhuma venda gerada.</td></tr>';
        return;
    }
    for (const v of lista) {
        const st = statusVenda[v.status] || { texto: v.status, classe: "badge-secondary" };
        const fiscal = fiscalVenda(v);
        tbody.innerHTML += `<tr>
            <td><strong>#${String(v.numero).padStart(5, "0")}</strong></td>
            <td>${v.orcamento?.numero ? `#${String(v.orcamento.numero).padStart(5, "0")}` : "—"}</td>
            <td>${esc(v.cliente?.nome || "—")}</td>
            <td>${fmtData(v.dataVenda)}</td>
            <td><strong>${fmtMoeda(v.total)}</strong></td>
            <td><span class="badge ${st.classe}">${st.texto}</span></td>
            <td><span class="badge ${fiscal.classe}">${fiscal.texto}</span></td>
            <td><div class="table-actions">
                <button class="btn btn-light" onclick="visualizarVenda(${v.id})" title="Visualizar"><i class="fas fa-eye"></i></button>
                ${v.status === "CONFIRMADA" ? `<button class="btn btn-success" onclick="faturarVenda(${v.id})" title="Faturar"><i class="fas fa-file-invoice-dollar"></i></button>` : ""}
                ${v.status === "FATURADA" && !v.notaFiscal ? `<button class="btn btn-primary" onclick="emitirNfe(${v.id})" title="Emitir NF-e"><i class="fas fa-file-invoice"></i></button>` : ""}
            </div></td>
        </tr>`;
    }
}

function filtrarVendas() {
    const q = document.getElementById("pesquisaVenda").value.trim().toLowerCase();
    if (!q) return renderizarVendas(vendas);
    renderizarVendas(vendas.filter(v => String(v.numero).includes(q) || String(v.orcamento?.numero || "").includes(q) || String(v.cliente?.nome || "").toLowerCase().includes(q)));
}

async function visualizarVenda(id) {
    const r = await get(`/vendas/${id}`);
    if (!r?.sucesso) return mostrarMensagem(r?.mensagem || "Venda não encontrada.");
    const v = r.venda;
    vendaAtualId = v.id;
    const st = statusVenda[v.status] || { texto: v.status };
    document.getElementById("tituloVenda").textContent = `Venda #${String(v.numero).padStart(5, "0")}`;
    document.getElementById("viewVendaNumero").value = `#${String(v.numero).padStart(5, "0")}`;
    document.getElementById("viewVendaOrcamento").value = v.orcamento?.numero ? `#${String(v.orcamento.numero).padStart(5, "0")}` : "—";
    document.getElementById("viewVendaCliente").value = v.cliente?.nome || "—";
    document.getElementById("viewVendaStatus").value = st.texto;
    document.getElementById("viewVendaPagamento").value = formasPagamento[v.formaPagamento] || v.formaPagamento;
    document.getElementById("viewVendaParcelas").value = `${v.quantidadeParcelas}x`;
    document.getElementById("viewVendaVencimento").value = fmtData(v.primeiroVencimento);
    document.getElementById("viewVendaTotal").value = fmtMoeda(v.total);
    document.getElementById("viewVendaItens").innerHTML = (v.itens || []).map(i => `<tr><td>${esc(i.descricao)}</td><td>${Number(i.quantidade)}</td><td>${fmtMoeda(i.valorUnitario)}</td><td>${fmtMoeda(i.total)}</td></tr>`).join("") || '<tr><td colspan="4">Sem itens.</td></tr>';

    document.getElementById("viewVendaCustoItens").value = fmtMoeda(v.custoItensTotal || 0);
    document.getElementById("viewVendaCustoInterno").value = fmtMoeda(v.custoInternoTotal || 0);
    document.getElementById("viewVendaLucro").value = fmtMoeda(v.lucroEstimado || 0);

    const realizado = v.rentabilidadeRealizada || {};
    document.getElementById("viewVendaValorRecebido").textContent = fmtMoeda(realizado.valorRecebido || 0);
    document.getElementById("viewVendaCustosPagos").textContent = fmtMoeda(realizado.custosInternosPagos || 0);
    document.getElementById("viewVendaLucroRealizado").textContent = fmtMoeda(realizado.lucroRealizado || 0);
    document.getElementById("viewVendaMargemRealizada").textContent = `${Number(realizado.margemRealizada || 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;

    document.getElementById("viewVendaCustosInternos").innerHTML = Array.isArray(v.custosInternos) && v.custosInternos.length
        ? v.custosInternos.map(c => `<tr><td>${esc(c.categoria || "OUTRO")}</td><td>${esc(c.descricao || "-")}</td><td>${Number(c.quantidade || 0)}</td><td>${fmtMoeda(c.valorUnitario || 0)}</td><td>${fmtMoeda(c.total || 0)}</td></tr>`).join("")
        : '<tr><td colspan="5" class="text-center">Nenhuma despesa interna lançada.</td></tr>';

    document.getElementById("viewVendaParcelasTabela").innerHTML = (v.contasReceber || []).map(c => `<tr><td>${c.parcelaNumero}/${c.totalParcelas}</td><td>${fmtData(c.dataVencimento)}</td><td>${fmtMoeda(c.valorOriginal)}</td><td>${fmtMoeda(c.valorRecebido || 0)}</td><td>${esc(c.status)}</td></tr>`).join("") || '<tr><td colspan="5">As contas a receber serão geradas no faturamento.</td></tr>';

    document.getElementById("viewVendaContasPagar").innerHTML = (v.contasPagar || []).map(c => `<tr><td>${esc(c.descricao || "Custo interno")}</td><td>${fmtData(c.dataVencimento)}</td><td>${fmtMoeda(c.valorOriginal)}</td><td>${fmtMoeda(c.valorPago || 0)}</td><td>${esc(c.status)}</td></tr>`).join("") || '<tr><td colspan="5" class="text-center">Os custos internos serão lançados em Contas a Pagar no faturamento.</td></tr>';
    const fiscal = fiscalVenda(v);
    const fiscalStatus = document.getElementById("viewVendaFiscalStatus");
    const fiscalPendencias = document.getElementById("viewVendaFiscalPendencias");

    if (v.notaFiscal) {
        const nfe = v.notaFiscal;
        const detalhes = [];
        detalhes.push(`NF-e modelo 55 • Série ${nfe.serie} • Nº ${nfe.numero}`);
        detalhes.push(`Ambiente ${nfe.ambiente === "PRODUCAO" ? "Produção" : "Homologação"}`);
        if (nfe.chaveAcesso) detalhes.push(`Chave: ${esc(nfe.chaveAcesso)}`);
        if (nfe.protocolo) detalhes.push(`Protocolo: ${esc(nfe.protocolo)}`);

        fiscalStatus.innerHTML = `
            <strong>${esc(fiscal.texto)}</strong>
            <div style="margin-top:8px;line-height:1.65;">${detalhes.join("<br>")}</div>
            ${nfe.motivoStatus ? `<div class="alert alert-warning" style="margin-top:10px;">${esc(nfe.motivoStatus)}</div>` : ""}
        `;
        fiscalPendencias.style.display = "none";
        fiscalPendencias.innerHTML = "";
    } else if (v.status === "FATURADA") {
        fiscalStatus.innerHTML = '<strong>NF-e ainda não emitida.</strong><div class="text-muted" style="margin-top:6px;">Ao emitir, o ERP valida cadastro, tributação e token Focus antes de transmitir.</div>';
        fiscalPendencias.style.display = "none";
        fiscalPendencias.innerHTML = "";
    } else {
        fiscalStatus.innerHTML = '<span class="text-muted">A NF-e fica disponível depois do faturamento.</span>';
        fiscalPendencias.style.display = "none";
        fiscalPendencias.innerHTML = "";
    }

    const nfe = v.notaFiscal;
    document.getElementById("btnEmitirNfe").style.display =
        v.status === "FATURADA" && (!nfe || ["PRONTA_TRANSMISSAO", "REJEITADA", "ERRO"].includes(nfe.status)) ? "inline-flex" : "none";
    document.getElementById("btnConsultarNfe").style.display =
        nfe?.referenciaFocus && !["CANCELADA"].includes(nfe.status) ? "inline-flex" : "none";
    document.getElementById("btnDanfeNfe").style.display = nfe?.caminhoDanfe ? "inline-flex" : "none";
    document.getElementById("btnXmlNfe").style.display = nfe?.caminhoXml ? "inline-flex" : "none";
    document.getElementById("btnCancelarNfe").style.display = nfe?.status === "AUTORIZADA" ? "inline-flex" : "none";

    document.getElementById("btnFaturarVenda").style.display = v.status === "CONFIRMADA" ? "inline-flex" : "none";
    document.getElementById("btnCancelarVenda").style.display = v.status === "CONFIRMADA" ? "inline-flex" : "none";
    document.getElementById("modalVenda").classList.add("active");
}

function fecharVenda() {
    document.getElementById("modalVenda").classList.remove("active");
    vendaAtualId = null;
}

async function faturarVenda(id) {
    if (!confirm("Faturar esta venda? Isso fará a baixa de estoque, gerará as contas a receber e lançará os custos internos em Contas a Pagar.")) return;
    const r = await put(`/vendas/${id}/faturar`, {});
    if (!r?.sucesso) return mostrarMensagem(r?.mensagem || "Erro ao faturar venda.");
    mostrarMensagem(r.mensagem || "Venda faturada. Contas a receber, custos internos em Contas a Pagar e estoque atualizados.");
    await carregarVendas();
    if (vendaAtualId === id) await visualizarVenda(id);
}

function faturarVendaAtual() {
    if (vendaAtualId) faturarVenda(vendaAtualId);
}

async function cancelarVendaAtual() {
    if (!vendaAtualId) return;
    const motivo = prompt("Motivo do cancelamento (opcional):") ?? null;
    if (motivo === null) return;
    const r = await put(`/vendas/${vendaAtualId}/cancelar`, { motivo });
    if (!r?.sucesso) return mostrarMensagem(r?.mensagem || "Erro ao cancelar venda.");
    fecharVenda();
    mostrarMensagem("Venda cancelada.");
    carregarVendas();
}


async function emitirNfe(id) {
    if (!confirm("Emitir esta NF-e pela Focus NFe? Em homologação ela não possui valor fiscal. Em produção, confirme antes a numeração atual e os CST/CSOSN com o contador.")) return;

    const resposta = await post(`/vendas/${id}/nfe/emitir`, {});

    if (!resposta?.sucesso) {
        const pendencias = resposta?.pendencias || [];
        if (vendaAtualId === id && pendencias.length) {
            const area = document.getElementById("viewVendaFiscalPendencias");
            area.innerHTML = htmlPendenciasFiscal(pendencias);
            area.style.display = "block";
        }
        if (pendencias.length) {
            const resumo = pendencias.slice(0, 7).map(p => `• ${p.mensagem}`).join("\n");
            const restante = pendencias.length > 7 ? `\n• +${pendencias.length - 7} pendência(s)` : "";
            return mostrarMensagem(`NF-e bloqueada até corrigir:\n${resumo}${restante}`);
        }
        return mostrarMensagem(resposta?.mensagem || "Erro ao emitir NF-e.");
    }

    const nfe = resposta.notaFiscal;
    mostrarMensagem(nfe?.status === "AUTORIZADA"
        ? `NF-e nº ${nfe.numero} autorizada pela SEFAZ.`
        : `NF-e nº ${nfe?.numero || ""} enviada. Status: ${nfe?.status || "processando"}.`);

    await carregarVendas();
    if (vendaAtualId === id) await visualizarVenda(id);
}

function emitirNfeAtual() { if (vendaAtualId) emitirNfe(vendaAtualId); }

async function consultarNfe(id) {
    const resposta = await post(`/vendas/${id}/nfe/consultar`, {});
    if (!resposta?.sucesso) return mostrarMensagem(resposta?.mensagem || "Erro ao consultar NF-e.");
    mostrarMensagem(`NF-e atualizada: ${resposta.notaFiscal?.status || "sem status"}.`);
    await carregarVendas();
    if (vendaAtualId === id) await visualizarVenda(id);
}

function consultarNfeAtual() { if (vendaAtualId) consultarNfe(vendaAtualId); }

function notaAtual() { return vendas.find(item => item.id === vendaAtualId)?.notaFiscal || null; }
function abrirDanfeAtual() {
    const url = notaAtual()?.caminhoDanfe;
    if (!url) return mostrarMensagem("DANFE ainda não disponível.");
    window.open(url, "_blank", "noopener,noreferrer");
}
function abrirXmlAtual() {
    const url = notaAtual()?.caminhoXml;
    if (!url) return mostrarMensagem("XML ainda não disponível.");
    window.open(url, "_blank", "noopener,noreferrer");
}

async function cancelarNfeAtual() {
    if (!vendaAtualId) return;
    const justificativa = prompt("Justificativa do cancelamento da NF-e (mínimo 15 caracteres):");
    if (justificativa === null) return;
    if (justificativa.trim().length < 15) return mostrarMensagem("A justificativa precisa ter pelo menos 15 caracteres.");
    if (!confirm("Confirma o cancelamento desta NF-e autorizada?")) return;
    const resposta = await post(`/vendas/${vendaAtualId}/nfe/cancelar`, { justificativa: justificativa.trim() });
    if (!resposta?.sucesso) return mostrarMensagem(resposta?.mensagem || "Erro ao cancelar NF-e.");
    mostrarMensagem(resposta.mensagem || "Solicitação de cancelamento enviada.");
    await carregarVendas();
    await visualizarVenda(vendaAtualId);
}

