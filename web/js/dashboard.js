let graficoFluxo;
let graficoProjecao;

const coresDashboard = {
    azul: "#2563eb",
    verde: "#16a36a",
    vermelho: "#e04f5f",
    grade: "#edf0f4",
    texto: "#8390a2"
};

function escaparHtml(valor) {
    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatarDataCurta(valor) {
    return new Date(valor).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short"
    });
}

function formatarDataPeriodo(valor) {
    const texto = String(valor || "");
    const correspondencia = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (!correspondencia) return data(valor);

    return `${correspondencia[3]}/${correspondencia[2]}/${correspondencia[1]}`;
}

function formatarPeriodoGrafico(valor) {
    if (/^\d{4}-\d{2}$/.test(valor)) {
        const [ano, mes] = valor.split("-");
        return new Date(Number(ano), Number(mes) - 1, 1).toLocaleDateString("pt-BR", { month: "short" });
    }

    return new Date(`${valor}T12:00:00`).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short"
    });
}

function plural(quantidade, singular, pluralTexto) {
    return `${quantidade} ${quantidade === 1 ? singular : pluralTexto}`;
}

function exibirErro(mensagem) {
    const elemento = document.getElementById("dashboardErro");
    elemento.textContent = mensagem;
    elemento.classList.remove("d-none");
}

function limparErro() {
    const elemento = document.getElementById("dashboardErro");
    elemento.textContent = "";
    elemento.classList.add("d-none");
}

async function carregarDashboard() {
    limparErro();
    const periodo = document.getElementById("filtroPeriodo").value;

    try {
        const [financeiro, operacional] = await Promise.all([
            get(`/dashboard/financeiro?periodo=${periodo}`),
            get("/dashboard")
        ]);

        if (!financeiro?.sucesso) {
            throw new Error(financeiro?.mensagem || "Não foi possível carregar os dados financeiros.");
        }

        preencherFinanceiro(financeiro.dashboard);

        if (operacional?.sucesso) {
            preencherOperacional(operacional.resumo);
        }
    } catch (erro) {
        exibirErro(erro.message || "Não foi possível carregar o dashboard.");
    }
}

function preencherFinanceiro(dashboard) {
    const { kpis, titulos, comercial, contas, periodo } = dashboard;

    document.getElementById("kpiSaldoConsolidado").textContent = moeda(kpis.saldoConsolidado);
    document.getElementById("kpiQuantidadeContas").textContent = plural(contas.length, "conta financeira", "contas financeiras");
    document.getElementById("kpiEntradas").textContent = moeda(kpis.entradasPeriodo);
    document.getElementById("kpiSaidas").textContent = moeda(kpis.saidasPeriodo);
    document.getElementById("kpiResultado").textContent = moeda(kpis.resultadoPeriodo);

    const resultadoStatus = document.getElementById("resultadoStatus");
    resultadoStatus.className = "financial-kpi-pill";
    if (kpis.resultadoPeriodo > 0) {
        resultadoStatus.textContent = "Positivo";
        resultadoStatus.classList.add("pill-positive");
    } else if (kpis.resultadoPeriodo < 0) {
        resultadoStatus.textContent = "Negativo";
        resultadoStatus.classList.add("pill-negative");
    } else {
        resultadoStatus.textContent = "Equilíbrio";
        resultadoStatus.classList.add("pill-neutral");
    }

    document.getElementById("kpiReceberAberto").textContent = moeda(kpis.contasReceberEmAberto);
    document.getElementById("kpiPagarAberto").textContent = moeda(kpis.contasPagarEmAberto);
    document.getElementById("kpiReceberAtrasado").textContent = moeda(kpis.contasReceberAtrasadas);
    document.getElementById("kpiPagarAtrasado").textContent = moeda(kpis.contasPagarAtrasadas);
    document.getElementById("quantidadeReceber").textContent = plural(titulos.receber.quantidade, "título em aberto", "títulos em aberto");
    document.getElementById("quantidadePagar").textContent = plural(titulos.pagar.quantidade, "título em aberto", "títulos em aberto");

    document.getElementById("kpiVendasPeriodo").textContent = moeda(kpis.vendasPeriodo);
    document.getElementById("kpiQuantidadeVendas").textContent = plural(kpis.quantidadeVendas, "venda realizada", "vendas realizadas");
    document.getElementById("kpiTicketMedio").textContent = moeda(kpis.ticketMedio);
    document.getElementById("kpiOrcamentosPeriodo").textContent = comercial.orcamentos;
    document.getElementById("kpiOrcamentosAprovados").textContent = `${comercial.orcamentosAprovados} aprovados`;
    document.getElementById("kpiConversao").textContent = `${Number(comercial.taxaConversao).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

    const inicio = formatarDataPeriodo(periodo.dataInicio);
    const fim = formatarDataPeriodo(periodo.dataFim);
    document.getElementById("periodoDescricao").textContent = `Resultados consolidados de ${inicio} até ${fim}.`;

    preencherContas(contas);
    preencherVencimentos("listaRecebimentos", dashboard.contasReceberProximas, "receber");
    preencherVencimentos("listaPagamentos", dashboard.contasPagarProximas, "pagar");
    preencherMovimentacoes(dashboard.ultimasMovimentacoes);
    criarGraficoFluxo(dashboard.fluxoCaixa);
    criarGraficoProjecao(dashboard.projecao30Dias);

    const ultimaProjecao = dashboard.projecao30Dias.at(-1);
    document.getElementById("saldoProjetado").textContent = moeda(ultimaProjecao?.saldoProjetado || kpis.saldoConsolidado);
}

function preencherContas(lista) {
    const container = document.getElementById("listaContas");

    if (!lista.length) {
        container.innerHTML = estadoVazio("fa-building-columns", "Nenhuma conta financeira cadastrada.");
        return;
    }

    container.innerHTML = lista.map(conta => {
        const tipo = String(conta.tipo || "CONTA").replaceAll("_", " ").toLowerCase();
        const saldoNegativo = Number(conta.saldoAtual) < 0 ? "negative" : "";
        const icone = conta.tipo === "CAIXA" ? "fa-cash-register" : "fa-building-columns";

        return `<div class="account-item">
            <span class="account-icon"><i class="fas ${icone}"></i></span>
            <div class="account-info">
                <strong>${escaparHtml(conta.nome)}</strong>
                <span>${escaparHtml(conta.banco || tipo)}${conta.padrao ? " • principal" : ""}</span>
            </div>
            <strong class="account-balance ${saldoNegativo}">${moeda(conta.saldoAtual)}</strong>
        </div>`;
    }).join("");
}

function preencherVencimentos(elementoId, lista, tipo) {
    const container = document.getElementById(elementoId);

    if (!lista.length) {
        container.innerHTML = estadoVazio("fa-calendar-check", "Nenhum título pendente.");
        return;
    }

    container.innerHTML = lista.map(titulo => {
        const vencimento = new Date(titulo.dataVencimento);
        const atrasado = titulo.status === "ATRASADO";
        const nome = tipo === "receber"
            ? titulo.cliente?.nome || "Cliente não informado"
            : titulo.fornecedorNome || "Fornecedor não informado";

        return `<div class="due-item">
            <div class="due-date ${atrasado ? "overdue" : ""}">
                <strong>${String(vencimento.getDate()).padStart(2, "0")}</strong>
                <span>${vencimento.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}</span>
            </div>
            <div class="due-info">
                <strong>${escaparHtml(titulo.descricao)}</strong>
                <span>${escaparHtml(nome)}${atrasado ? " • em atraso" : ""}</span>
            </div>
            <strong class="due-value">${moeda(titulo.valorPendente)}</strong>
        </div>`;
    }).join("");
}

function preencherMovimentacoes(lista) {
    const container = document.getElementById("listaMovimentacoes");

    if (!lista.length) {
        container.innerHTML = estadoVazio("fa-money-bill-transfer", "Nenhuma movimentação registrada.");
        return;
    }

    container.innerHTML = lista.map(movimento => {
        const entrada = movimento.tipo === "ENTRADA";
        const classe = entrada ? "in" : "out";
        const sinal = entrada ? "+" : "−";
        const icone = entrada ? "fa-arrow-down" : "fa-arrow-up";
        const detalhes = [movimento.conta?.nome, movimento.categoria?.nome, formatarDataCurta(movimento.dataMovimentacao)]
            .filter(Boolean)
            .join(" • ");

        return `<div class="movement-item">
            <span class="movement-sign ${classe}"><i class="fas ${icone}"></i></span>
            <div class="movement-info">
                <strong>${escaparHtml(movimento.descricao)}</strong>
                <span>${escaparHtml(detalhes)}</span>
            </div>
            <strong class="movement-value ${classe}">${sinal} ${moeda(movimento.valor)}</strong>
        </div>`;
    }).join("");
}

function estadoVazio(icone, mensagem) {
    return `<div class="empty-dashboard"><i class="fas ${icone}"></i>${mensagem}</div>`;
}

function opcoesGrafico() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: "#13253a",
                padding: 12,
                cornerRadius: 9,
                callbacks: { label: contexto => `${contexto.dataset.label}: ${moeda(contexto.raw)}` }
            }
        },
        scales: {
            x: { grid: { display: false }, ticks: { color: coresDashboard.texto, font: { size: 10 } }, border: { display: false } },
            y: {
                beginAtZero: true,
                grid: { color: coresDashboard.grade },
                border: { display: false },
                ticks: {
                    color: coresDashboard.texto,
                    font: { size: 10 },
                    callback: valor => Number(valor).toLocaleString("pt-BR", { notation: "compact", maximumFractionDigits: 1 })
                }
            }
        }
    };
}

function criarGraficoFluxo(lista) {
    if (graficoFluxo) graficoFluxo.destroy();

    graficoFluxo = new Chart(document.getElementById("graficoFluxo"), {
        type: "bar",
        data: {
            labels: lista.map(item => formatarPeriodoGrafico(item.periodo)),
            datasets: [
                { label: "Entradas", data: lista.map(item => item.entradas), backgroundColor: coresDashboard.verde, borderRadius: 5, maxBarThickness: 24 },
                { label: "Saídas", data: lista.map(item => item.saidas), backgroundColor: coresDashboard.vermelho, borderRadius: 5, maxBarThickness: 24 }
            ]
        },
        options: opcoesGrafico()
    });
}

function criarGraficoProjecao(lista) {
    if (graficoProjecao) graficoProjecao.destroy();

    const contexto = document.getElementById("graficoProjecao").getContext("2d");
    const gradiente = contexto.createLinearGradient(0, 0, 0, 230);
    gradiente.addColorStop(0, "rgba(37, 99, 235, .24)");
    gradiente.addColorStop(1, "rgba(37, 99, 235, .01)");

    const options = opcoesGrafico();
    options.scales.y.beginAtZero = false;

    graficoProjecao = new Chart(contexto, {
        type: "line",
        data: {
            labels: lista.map(item => formatarPeriodoGrafico(item.data)),
            datasets: [{
                label: "Saldo projetado",
                data: lista.map(item => item.saldoProjetado),
                borderColor: coresDashboard.azul,
                backgroundColor: gradiente,
                fill: true,
                tension: .38,
                pointRadius: 0,
                pointHoverRadius: 4,
                borderWidth: 2
            }]
        },
        options
    });
}

function preencherOperacional(resumo) {
    document.getElementById("kpiClientes").textContent = resumo.clientes;
    document.getElementById("kpiProdutos").textContent = resumo.produtos;
    document.getElementById("kpiCategorias").textContent = resumo.categorias;
    document.getElementById("kpiOrcamentos").textContent = resumo.orcamentos;
    document.getElementById("kpiValor").textContent = moeda(resumo.valorTotal);
    document.getElementById("kpiEstoque").textContent = resumo.estoqueBaixo;
    preencherUltimosOrcamentos(resumo.ultimosOrcamentos);
    preencherEstoqueBaixo(resumo.estoqueBaixoProdutos);
}

function preencherUltimosOrcamentos(lista) {
    const tbody = document.getElementById("tabelaOrcamentos");

    if (!lista.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Nenhum orçamento encontrado.</td></tr>';
        return;
    }

    tbody.innerHTML = lista.map(orcamento => `<tr>
        <td>#${escaparHtml(orcamento.numero)}</td>
        <td>${escaparHtml(orcamento.cliente?.nome)}</td>
        <td>${moeda(orcamento.total)}</td>
        <td>${data(orcamento.criadoEm)}</td>
    </tr>`).join("");
}

function preencherEstoqueBaixo(lista) {
    const tbody = document.getElementById("tabelaEstoqueBaixo");

    if (!lista.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Nenhum produto com estoque baixo.</td></tr>';
        return;
    }

    tbody.innerHTML = lista.map(item => `<tr>
        <td>${escaparHtml(item.produto?.nome)}</td>
        <td>${escaparHtml(item.sku)}</td>
        <td>${numero(item.estoqueAtual)}</td>
        <td>${numero(item.estoqueMinimo)}</td>
    </tr>`).join("");
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("filtroPeriodo").addEventListener("change", carregarDashboard);
    carregarDashboard();
});
