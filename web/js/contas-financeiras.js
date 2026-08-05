let contasFinanceiras = [];

const tiposConta = {
    CAIXA: "Caixa",
    CONTA_CORRENTE: "Conta corrente",
    POUPANCA: "Poupança",
    CARTEIRA_DIGITAL: "Carteira digital",
    OUTRA: "Outra"
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
    return new Date(dataValor.getTime() - dataValor.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 10);
}

function mostrarAviso(texto, tipo = "success") {
    const elemento = document.getElementById("mensagemPagina");
    elemento.textContent = texto;
    elemento.className = `financial-message ${tipo}`;
    clearTimeout(mostrarAviso.timeout);
    mostrarAviso.timeout = setTimeout(() => elemento.classList.add("d-none"), 5000);
}

async function carregarContas() {
    try {
        const incluirInativas = document.getElementById("incluirInativas").checked;
        const resposta = await get(`/contas-financeiras?incluirInativas=${incluirInativas}`);

        if (!resposta?.sucesso) {
            throw new Error(resposta?.mensagem || "Erro ao carregar contas financeiras.");
        }

        contasFinanceiras = resposta.contasFinanceiras || [];
        preencherResumo();
        renderizarContas();
    } catch (erro) {
        mostrarAviso(erro.message, "error");
    }
}

function preencherResumo() {
    const contasAtivas = contasFinanceiras.filter(conta => conta.ativa);
    const totais = contasAtivas.reduce((resultado, conta) => {
        resultado.saldo += Number(conta.saldoAtual || 0);
        resultado.entradas += Number(conta.totalEntradas || 0);
        resultado.saidas += Number(conta.totalSaidas || 0);
        return resultado;
    }, { saldo: 0, entradas: 0, saidas: 0 });

    document.getElementById("saldoConsolidado").textContent = moeda(totais.saldo);
    document.getElementById("totalEntradas").textContent = moeda(totais.entradas);
    document.getElementById("totalSaidas").textContent = moeda(totais.saidas);
    document.getElementById("quantidadeContas").textContent = `${contasAtivas.length} ${contasAtivas.length === 1 ? "conta ativa" : "contas ativas"}`;
}

function iconeConta(tipo) {
    if (tipo === "CAIXA") return "fa-cash-register";
    if (tipo === "CARTEIRA_DIGITAL") return "fa-mobile-screen-button";
    if (tipo === "POUPANCA") return "fa-piggy-bank";
    return "fa-building-columns";
}

function renderizarContas() {
    const grade = document.getElementById("gradeContas");

    if (!contasFinanceiras.length) {
        grade.innerHTML = '<div class="financial-panel financial-empty bank-empty"><i class="fas fa-building-columns"></i>Nenhuma conta financeira cadastrada.<br><button class="btn btn-primary mt-2" onclick="abrirModalConta()"><i class="fas fa-plus"></i> Criar primeira conta</button></div>';
        return;
    }

    grade.innerHTML = contasFinanceiras.map(conta => {
        const instituicao = conta.banco || tiposConta[conta.tipo] || "Conta financeira";
        const identificacao = [conta.agencia && `Ag. ${conta.agencia}`, conta.numeroConta && `Conta ${conta.numeroConta}`].filter(Boolean).join(" • ");
        const movimentacoes = conta._count?.movimentacoes || 0;

        return `<article class="bank-account-card ${conta.ativa ? "" : "inactive"}">
            <div class="bank-account-top">
                <div class="bank-account-identity">
                    <span class="bank-account-icon"><i class="fas ${iconeConta(conta.tipo)}"></i></span>
                    <div class="bank-account-name"><strong>${escapar(conta.nome)}</strong><span>${escapar(instituicao)}</span></div>
                </div>
                ${conta.padrao ? '<span class="default-badge"><i class="fas fa-star"></i> Padrão</span>' : conta.ativa ? "" : '<span class="inactive-badge">Inativa</span>'}
            </div>
            <div class="bank-account-balance"><span>Saldo atual</span><strong class="${Number(conta.saldoAtual) < 0 ? "negative" : ""}">${moeda(conta.saldoAtual)}</strong></div>
            <div class="bank-account-flow">
                <div class="flow-in"><span>Entradas</span><strong>+ ${moeda(conta.totalEntradas)}</strong></div>
                <div class="flow-out"><span>Saídas</span><strong>− ${moeda(conta.totalSaidas)}</strong></div>
            </div>
            <div class="bank-account-footer">
                <span>${identificacao ? escapar(identificacao) + " • " : ""}${movimentacoes} movimentações</span>
                <div class="bank-card-actions">
                    ${conta.ativa && !conta.padrao ? `<button class="action-button" title="Tornar padrão" onclick="tornarPadrao(${conta.id})"><i class="far fa-star"></i></button>` : ""}
                    ${conta.ativa ? `<button class="action-button" title="Editar conta" onclick="editarConta(${conta.id})"><i class="fas fa-pen"></i></button>` : ""}
                    ${conta.ativa ? `<button class="action-button cancel" title="Desativar conta" onclick="desativarConta(${conta.id})"><i class="fas fa-power-off"></i></button>` : ""}
                </div>
            </div>
        </article>`;
    }).join("");
}

function abrirModalConta() {
    document.getElementById("formConta").reset();
    document.getElementById("contaId").value = "";
    document.getElementById("tituloModalConta").textContent = "Nova conta";
    document.getElementById("tipo").value = "CAIXA";
    document.getElementById("saldoInicial").value = "0.00";
    document.getElementById("saldoInicial").disabled = false;
    document.getElementById("dataSaldoInicial").value = dataInput();
    document.getElementById("dataSaldoInicial").disabled = false;
    document.getElementById("avisoSaldo").classList.add("d-none");
    document.getElementById("modalConta").classList.add("active");
}

function fecharModalConta() {
    document.getElementById("modalConta").classList.remove("active");
}

async function editarConta(id) {
    try {
        const resposta = await get(`/contas-financeiras/${id}`);
        if (!resposta?.sucesso) throw new Error(resposta?.mensagem || "Conta não encontrada.");
        const conta = resposta.contaFinanceira;
        const possuiMovimentacoes = Number(conta._count?.movimentacoes || 0) > 0;

        document.getElementById("formConta").reset();
        document.getElementById("contaId").value = conta.id;
        document.getElementById("tituloModalConta").textContent = "Editar conta";
        document.getElementById("nome").value = conta.nome;
        document.getElementById("tipo").value = conta.tipo;
        document.getElementById("banco").value = conta.banco || "";
        document.getElementById("agencia").value = conta.agencia || "";
        document.getElementById("numeroConta").value = conta.numeroConta || "";
        document.getElementById("saldoInicial").value = Number(conta.saldoInicial).toFixed(2);
        document.getElementById("saldoInicial").disabled = possuiMovimentacoes;
        document.getElementById("dataSaldoInicial").value = String(conta.dataSaldoInicial).slice(0, 10);
        document.getElementById("dataSaldoInicial").disabled = possuiMovimentacoes;
        document.getElementById("padrao").checked = conta.padrao;
        document.getElementById("avisoSaldo").classList.toggle("d-none", !possuiMovimentacoes);
        document.getElementById("modalConta").classList.add("active");
    } catch (erro) {
        mostrarAviso(erro.message, "error");
    }
}

async function salvarConta(evento) {
    evento.preventDefault();
    const botao = document.getElementById("btnSalvarConta");
    botao.disabled = true;
    const id = document.getElementById("contaId").value;
    const contaAtual = contasFinanceiras.find(conta => conta.id === Number(id));
    const payload = {
        nome: document.getElementById("nome").value.trim(),
        tipo: document.getElementById("tipo").value,
        banco: document.getElementById("banco").value.trim() || null,
        agencia: document.getElementById("agencia").value.trim() || null,
        numeroConta: document.getElementById("numeroConta").value.trim() || null,
        saldoInicial: document.getElementById("saldoInicial").disabled ? Number(contaAtual?.saldoInicial || 0) : Number(document.getElementById("saldoInicial").value || 0),
        dataSaldoInicial: document.getElementById("dataSaldoInicial").disabled ? contaAtual?.dataSaldoInicial : document.getElementById("dataSaldoInicial").value,
        padrao: document.getElementById("padrao").checked,
        ativa: true
    };

    try {
        const resposta = id ? await put(`/contas-financeiras/${id}`, payload) : await post("/contas-financeiras", payload);
        if (!resposta?.sucesso) throw new Error(resposta?.mensagem || "Erro ao salvar conta.");
        fecharModalConta();
        mostrarAviso(id ? "Conta atualizada com sucesso." : "Conta criada com sucesso.");
        await carregarContas();
    } catch (erro) {
        mostrarAviso(erro.message, "error");
    } finally {
        botao.disabled = false;
    }
}

async function tornarPadrao(id) {
    try {
        const resposta = await post(`/contas-financeiras/${id}/tornar-padrao`, {});
        if (!resposta?.sucesso) throw new Error(resposta?.mensagem || "Erro ao definir conta padrão.");
        mostrarAviso(resposta.mensagem || "Conta definida como padrão.");
        await carregarContas();
    } catch (erro) {
        mostrarAviso(erro.message, "error");
    }
}

async function desativarConta(id) {
    const conta = contasFinanceiras.find(item => item.id === id);
    if (!confirm(`Deseja desativar a conta “${conta?.nome || "selecionada"}”? O histórico será preservado.`)) return;

    try {
        const resposta = await del(`/contas-financeiras/${id}`);
        if (!resposta?.sucesso) throw new Error(resposta?.mensagem || "Erro ao desativar conta.");
        mostrarAviso(resposta.mensagem || "Conta desativada.");
        await carregarContas();
    } catch (erro) {
        mostrarAviso(erro.message, "error");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("formConta").addEventListener("submit", salvarConta);
    document.getElementById("incluirInativas").addEventListener("change", carregarContas);
    carregarContas();
});
