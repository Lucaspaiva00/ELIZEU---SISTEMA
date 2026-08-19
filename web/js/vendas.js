let vendas = [];
let vendaAtualId = null;

const statusVenda = {
    CONFIRMADA: { texto: "Aguardando faturamento", classe: "badge-warning" },
    FATURADA: { texto: "Faturada", classe: "badge-success" },
    CANCELADA: { texto: "Cancelada", classe: "badge-danger" }
};

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
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Nenhuma venda gerada.</td></tr>';
        return;
    }
    for (const v of lista) {
        const st = statusVenda[v.status] || { texto: v.status, classe: "badge-secondary" };
        tbody.innerHTML += `<tr>
            <td><strong>#${String(v.numero).padStart(5, "0")}</strong></td>
            <td>${v.orcamento?.numero ? `#${String(v.orcamento.numero).padStart(5, "0")}` : "—"}</td>
            <td>${esc(v.cliente?.nome || "—")}</td>
            <td>${fmtData(v.dataVenda)}</td>
            <td><strong>${fmtMoeda(v.total)}</strong></td>
            <td><span class="badge ${st.classe}">${st.texto}</span></td>
            <td><div class="table-actions">
                <button class="btn btn-light" onclick="visualizarVenda(${v.id})" title="Visualizar"><i class="fas fa-eye"></i></button>
                ${v.status === "CONFIRMADA" ? `<button class="btn btn-success" onclick="faturarVenda(${v.id})" title="Faturar"><i class="fas fa-file-invoice-dollar"></i></button>` : ""}
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
    document.getElementById("viewVendaParcelasTabela").innerHTML = (v.contasReceber || []).map(c => `<tr><td>${c.parcelaNumero}/${c.totalParcelas}</td><td>${fmtData(c.dataVencimento)}</td><td>${fmtMoeda(c.valorOriginal)}</td><td>${esc(c.status)}</td></tr>`).join("") || '<tr><td colspan="4">As contas a receber serão geradas no faturamento.</td></tr>';
    document.getElementById("btnFaturarVenda").style.display = v.status === "CONFIRMADA" ? "inline-flex" : "none";
    document.getElementById("btnCancelarVenda").style.display = v.status === "CONFIRMADA" ? "inline-flex" : "none";
    document.getElementById("modalVenda").classList.add("active");
}

function fecharVenda() {
    document.getElementById("modalVenda").classList.remove("active");
    vendaAtualId = null;
}

async function faturarVenda(id) {
    if (!confirm("Faturar esta venda? Isso fará a baixa de estoque e gerará as contas a receber.")) return;
    const r = await put(`/vendas/${id}/faturar`, {});
    if (!r?.sucesso) return mostrarMensagem(r?.mensagem || "Erro ao faturar venda.");
    mostrarMensagem("Venda faturada. Contas a receber e estoque atualizados.");
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
