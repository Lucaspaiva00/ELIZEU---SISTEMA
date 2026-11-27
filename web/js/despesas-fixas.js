const painelDespesas = document.getElementById("painelDespesasFixas");
const mesDespesas = document.getElementById("mesDespesasFixas");
const formDespesas = document.getElementById("formDespesasFixas");
const linhasDespesas = document.getElementById("linhasDespesasFixas");
const estadoDespesas = document.getElementById("estadoDespesasFixas");
const podeEditarDespesas = () => window.temPermissao?.("financeiro.configurar");
const reaisDespesas = centavos => (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataDespesas = dia => dia.split("-").reverse().join("/");
let ultimaConsultaDespesas = 0;

function linhaDespesaFixa(item = {}) {
    const linha = document.createElement("div");
    linha.className = "despesas-fixas-linha";
    linha.innerHTML = `<label>Despesa<input class="form-control" name="descricao" maxlength="120" placeholder="Ex.: aluguel, energia ou telefonia" required></label>
        <label>Valor mensal (R$)<input class="form-control" name="valor" type="number" min="0.01" max="99999999.99" step="0.01" required></label>
        <button type="button" class="btn btn-light">Remover</button>`;
    linha.querySelector("[name=descricao]").value = item.descricao || "";
    linha.querySelector("[name=valor]").value = item.centavos ? (item.centavos / 100).toFixed(2) : "";
    linha.querySelector("button").onclick = () => linha.remove();
    linhasDespesas.append(linha);
}

function renderizarDespesasFixas(dados) {
    document.getElementById("totalDespesasFixas").textContent = reaisDespesas(dados.despesas);
    document.getElementById("lucroDespesasFixas").textContent = reaisDespesas(dados.lucro);
    document.getElementById("faltaDespesasFixas").textContent = dados.despesas ? reaisDespesas(dados.falta) : "—";
    document.getElementById("saldoDespesasFixas").textContent = dados.despesas ? reaisDespesas(dados.saldo) : "—";
    document.getElementById("dataCoberturaDespesasFixas").textContent = [
        `Posição em ${dataDespesas(dados.dias.at(-1)?.data || dados.hoje)}.`,
        !dados.despesas ? "Cadastre as despesas fixas do mês para acompanhar a cobertura."
            : dados.dataCobertura ? `Primeira cobertura das despesas em ${dataDespesas(dados.dataCobertura)}.`
                : "O lucro acumulado ainda está abaixo das despesas fixas."
    ].join(" ");
    const corpo = document.getElementById("evolucaoDespesasFixas");
    corpo.innerHTML = dados.dias.map(dia => `<tr><td>${dataDespesas(dia.data)}</td><td>${reaisDespesas(dia.lucro)}</td>
        <td>${reaisDespesas(dia.acumulado)}</td><td>${dados.despesas ? reaisDespesas(dia.falta) : "—"}</td>
        <td>${dados.despesas ? reaisDespesas(dia.saldo) : "—"}</td></tr>`).join("");
    linhasDespesas.replaceChildren();
    dados.itens.forEach(linhaDespesaFixa);
    formDespesas.disabled = !podeEditarDespesas();
    document.getElementById("acoesDespesasFixas").hidden = !podeEditarDespesas();
    formDespesas.querySelectorAll(".despesas-fixas-linha button").forEach(botao => { botao.hidden = !podeEditarDespesas(); });
}

async function carregarDespesasFixas() {
    const consulta = ++ultimaConsultaDespesas;
    estadoDespesas.textContent = "Carregando despesas do mês…";
    formDespesas.disabled = true;
    document.getElementById("resumoDespesasFixas").hidden = true;
    try {
        const resposta = await get(`/dashboard/despesas-fixas?mes=${encodeURIComponent(mesDespesas.value)}`);
        if (consulta !== ultimaConsultaDespesas) return;
        if (!resposta?.sucesso) throw new Error(resposta?.mensagem || "Não foi possível carregar as despesas.");
        renderizarDespesasFixas(resposta.dados);
        document.getElementById("resumoDespesasFixas").hidden = false;
        estadoDespesas.textContent = "";
    } catch (erro) {
        if (consulta === ultimaConsultaDespesas) estadoDespesas.textContent = erro.message;
    }
}

document.getElementById("adicionarDespesaFixa").onclick = () => {
    if (linhasDespesas.children.length < 100) linhaDespesaFixa();
};

document.getElementById("salvarDespesaFixa").form.onsubmit = async evento => {
    evento.preventDefault();
    if (formDespesas.disabled) return;
    const itens = Array.from(linhasDespesas.children, linha => ({
        descricao: linha.querySelector("[name=descricao]").value,
        valor: linha.querySelector("[name=valor]").value
    }));
    formDespesas.disabled = true;
    mesDespesas.disabled = true;
    try {
        const resposta = await put("/dashboard/despesas-fixas", { mes: mesDespesas.value, itens });
        if (!resposta?.sucesso) throw new Error(resposta?.mensagem || "Não foi possível salvar as despesas.");
        renderizarDespesasFixas(resposta.dados);
        estadoDespesas.textContent = "Despesas salvas.";
    } catch (erro) {
        estadoDespesas.textContent = erro.message;
    } finally {
        mesDespesas.disabled = false;
        formDespesas.disabled = !podeEditarDespesas();
    }
};

document.addEventListener("DOMContentLoaded", () => {
    if (!window.temPermissao?.("dashboard.financeiro")) return;
    painelDespesas.hidden = false;
    mesDespesas.value = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(new Date()).slice(0, 7);
    mesDespesas.addEventListener("change", carregarDespesasFixas);
    carregarDespesasFixas();
});
