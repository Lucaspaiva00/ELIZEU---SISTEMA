let fornecedores = [];
let fornecedorEditandoId = null;

document.addEventListener("DOMContentLoaded", carregarFornecedores);

function escF(valor) {
    return String(valor ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}

async function carregarFornecedores() {
    try {
        const r = await get("/fornecedores");
        if (!r?.sucesso) throw new Error(r?.mensagem || "Erro ao carregar fornecedores.");
        fornecedores = r.fornecedores || [];
        renderizarFornecedores();
    } catch (e) {
        console.error(e);
        mostrarMensagem(e.message || "Erro ao carregar fornecedores.");
    }
}

function renderizarFornecedores() {
    const tbody = document.getElementById("tabelaFornecedores");
    const busca = (document.getElementById("pesquisaFornecedor")?.value || "").trim().toLowerCase();
    const lista = fornecedores.filter(f => !busca || [f.nome,f.nomeFantasia,f.cpfCnpj,f.email,f.telefone,f.celular].some(v => String(v||"").toLowerCase().includes(busca)));
    if (!lista.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Nenhum fornecedor cadastrado.</td></tr>';
        return;
    }
    tbody.innerHTML = lista.map(f => `<tr>
        <td><strong>${escF(f.nomeFantasia || f.nome)}</strong><div style="font-size:12px;opacity:.65;">${escF(f.nome)}</div></td>
        <td>${escF(f.cpfCnpj)}</td>
        <td>${escF(f.email || f.celular || f.telefone || "—")}</td>
        <td>${f.pixChave ? '<span class="badge badge-success">Pix cadastrado</span>' : '<span class="badge badge-secondary">Não cadastrado</span>'}</td>
        <td><span class="badge ${f.ativo ? "badge-success" : "badge-danger"}">${f.ativo ? "Ativo" : "Inativo"}</span></td>
        <td><div class="table-actions"><button class="btn btn-warning" onclick="editarFornecedor(${f.id})"><i class="fas fa-edit"></i></button><button class="btn btn-danger" onclick="excluirFornecedor(${f.id})"><i class="fas fa-trash"></i></button></div></td>
    </tr>`).join("");
}

function campoF(id) { return document.getElementById(id)?.value?.trim() || ""; }
function optF(id) { const v=campoF(id); return v || null; }
function setF(id,v) { const el=document.getElementById(id); if(el) el.value=v ?? ""; }

function abrirModalFornecedor() {
    fornecedorEditandoId = null;
    document.getElementById("formFornecedor").reset();
    document.getElementById("fornecedorTipoPessoa").value = "JURIDICA";
    document.getElementById("tituloModalFornecedor").textContent = "Cadastro de Fornecedor";
    document.getElementById("modalFornecedor").classList.add("active");
}
function fecharModalFornecedor() { document.getElementById("modalFornecedor").classList.remove("active"); fornecedorEditandoId=null; }

function payloadFornecedor() {
    return {
        tipoPessoa: campoF("fornecedorTipoPessoa"), nome: campoF("fornecedorNome"), nomeFantasia: optF("fornecedorNomeFantasia"),
        cpfCnpj: campoF("fornecedorCpfCnpj"), inscricaoEstadual: optF("fornecedorInscricaoEstadual"), email: optF("fornecedorEmail"),
        telefone: optF("fornecedorTelefone"), celular: optF("fornecedorCelular"), cep: optF("fornecedorCep"), endereco: optF("fornecedorEndereco"),
        numero: optF("fornecedorNumero"), complemento: optF("fornecedorComplemento"), bairro: optF("fornecedorBairro"), cidade: optF("fornecedorCidade"),
        estado: optF("fornecedorEstado")?.toUpperCase(), pixTipo: optF("fornecedorPixTipo"), pixChave: optF("fornecedorPixChave"),
        bancoNome: optF("fornecedorBancoNome"), bancoAgencia: optF("fornecedorBancoAgencia"), bancoConta: optF("fornecedorBancoConta"),
        observacoes: optF("fornecedorObservacoes"), ativo: true
    };
}

async function salvarFornecedor() {
    try {
        const dados=payloadFornecedor();
        if(!dados.nome) throw new Error("Informe o nome/razão social.");
        if(!dados.cpfCnpj) throw new Error("Informe o CPF/CNPJ.");
        const r=fornecedorEditandoId ? await put(`/fornecedores/${fornecedorEditandoId}`,dados) : await post("/fornecedores",dados);
        if(!r?.sucesso) throw new Error(r?.mensagem || "Erro ao salvar fornecedor.");
        fecharModalFornecedor(); await carregarFornecedores(); mostrarMensagem("Fornecedor salvo com sucesso.");
    } catch(e) { mostrarMensagem(e.message || "Erro ao salvar fornecedor."); }
}

function editarFornecedor(id) {
    const f=fornecedores.find(x=>x.id===id); if(!f) return;
    fornecedorEditandoId=id;
    const mapa={fornecedorTipoPessoa:f.tipoPessoa,fornecedorNome:f.nome,fornecedorNomeFantasia:f.nomeFantasia,fornecedorCpfCnpj:f.cpfCnpj,fornecedorInscricaoEstadual:f.inscricaoEstadual,fornecedorEmail:f.email,fornecedorTelefone:f.telefone,fornecedorCelular:f.celular,fornecedorCep:f.cep,fornecedorEndereco:f.endereco,fornecedorNumero:f.numero,fornecedorComplemento:f.complemento,fornecedorBairro:f.bairro,fornecedorCidade:f.cidade,fornecedorEstado:f.estado,fornecedorPixTipo:f.pixTipo,fornecedorPixChave:f.pixChave,fornecedorBancoNome:f.bancoNome,fornecedorBancoAgencia:f.bancoAgencia,fornecedorBancoConta:f.bancoConta,fornecedorObservacoes:f.observacoes};
    Object.entries(mapa).forEach(([id,v])=>setF(id,v));
    document.getElementById("tituloModalFornecedor").textContent="Editar Fornecedor";
    document.getElementById("modalFornecedor").classList.add("active");
}

async function excluirFornecedor(id) {
    if(!confirm("Deseja remover este fornecedor?")) return;
    try { const r=await del(`/fornecedores/${id}`); if(!r?.sucesso) throw new Error(r?.mensagem||"Erro."); await carregarFornecedores(); mostrarMensagem(r.mensagem||"Fornecedor removido."); } catch(e){ mostrarMensagem(e.message); }
}