let servicos = [];
let categoriasServico = [];
let variacoesServico = [];
let servicoEditandoId = null;

document.addEventListener("DOMContentLoaded", async () => {
    document.getElementById("formServico").addEventListener("submit", salvarServico);
    document.getElementById("formCategoriaServico").addEventListener("submit", salvarCategoria);
    await Promise.all([carregarCategoriasServico(), carregarServicos()]);
});

function escapar(valor) {
    const div = document.createElement("div");
    div.textContent = valor ?? "";
    return div.innerHTML;
}

async function carregarCategoriasServico() {
    const resposta = await get("/servicos/categorias");
    if (!resposta?.sucesso) return mostrarMensagem(resposta?.mensagem || "Erro ao carregar categorias.");
    categoriasServico = resposta.categorias || [];
    const select = document.getElementById("categoriaId");
    select.innerHTML = '<option value="">Selecione uma categoria</option>';
    categoriasServico.filter((categoria) => categoria.ativo).forEach((categoria) => {
        select.insertAdjacentHTML("beforeend", `<option value="${categoria.id}">${escapar(categoria.nome)}</option>`);
    });
}

async function carregarServicos() {
    const resposta = await get("/servicos");
    if (!resposta?.sucesso) return mostrarMensagem(resposta?.mensagem || "Erro ao carregar serviços.");
    servicos = resposta.servicos || [];
    renderizarServicos(servicos);
}

function renderizarServicos(lista) {
    const tbody = document.getElementById("tabelaServicos");
    if (!lista.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Nenhum serviço cadastrado.</td></tr>';
        return;
    }
    tbody.innerHTML = lista.map((servico) => `<tr>
        <td>${escapar(servico.codigo)}</td><td><strong>${escapar(servico.nome)}</strong></td>
        <td>${escapar(servico.categoria?.nome || "-")}</td><td>${escapar(servico.unidadeMedida)}</td>
        <td><span class="badge badge-primary">${servico.variacoes?.length || 0} variações</span></td>
        <td><div class="table-actions"><button class="btn btn-warning" onclick="editarServico(${servico.id})" title="Editar"><i class="fas fa-edit"></i></button><button class="btn btn-danger" onclick="excluirServico(${servico.id})" title="Excluir"><i class="fas fa-trash"></i></button></div></td>
    </tr>`).join("");
}

function filtrarServicos() {
    const termo = document.getElementById("pesquisa").value.toLowerCase();
    renderizarServicos(servicos.filter((servico) => [servico.codigo, servico.nome, servico.categoria?.nome].some((valor) => String(valor || "").toLowerCase().includes(termo))));
}

function abrirModalServico() {
    servicoEditandoId = null;
    variacoesServico = [];
    document.getElementById("formServico").reset();
    document.getElementById("tituloModalServico").textContent = "Novo serviço";
    adicionarVariacao();
    document.getElementById("modalServico").classList.add("active");
}

function fecharModalServico() {
    document.getElementById("modalServico").classList.remove("active");
}

function adicionarVariacao(dados = {}) {
    variacoesServico.push({ id: dados.id || null, codigo: dados.codigo || "", descricao: dados.descricao || "", precoCusto: Number(dados.precoCusto || 0), precoVenda: Number(dados.precoVenda || 0), ativo: dados.ativo ?? true });
    renderizarVariacoes();
}

function renderizarVariacoes() {
    document.getElementById("tabelaVariacoes").innerHTML = variacoesServico.map((variacao, indice) => `<tr>
        <td><input class="form-control" value="${escapar(variacao.codigo)}" oninput="alterarVariacao(${indice}, 'codigo', this.value)"></td>
        <td><input class="form-control" value="${escapar(variacao.descricao)}" oninput="alterarVariacao(${indice}, 'descricao', this.value)"></td>
        <td><input class="form-control" type="number" min="0" step="0.01" value="${variacao.precoCusto}" oninput="alterarVariacao(${indice}, 'precoCusto', this.value)"></td>
        <td><input class="form-control" type="number" min="0" step="0.01" value="${variacao.precoVenda}" oninput="alterarVariacao(${indice}, 'precoVenda', this.value)"></td>
        <td><button type="button" class="btn btn-danger" onclick="removerVariacao(${indice})"><i class="fas fa-trash"></i></button></td>
    </tr>`).join("");
}

function alterarVariacao(indice, campo, valor) {
    variacoesServico[indice][campo] = ["precoCusto", "precoVenda"].includes(campo) ? Number(valor) : valor;
}

function removerVariacao(indice) {
    if (variacoesServico.length === 1) return mostrarMensagem("O serviço precisa ter ao menos uma variação.");
    variacoesServico.splice(indice, 1);
    renderizarVariacoes();
}

async function salvarServico(evento) {
    evento.preventDefault();
    const dados = {
        codigo: document.getElementById("codigo").value.trim(), nome: document.getElementById("nome").value.trim(),
        categoriaId: Number(document.getElementById("categoriaId").value), unidadeMedida: document.getElementById("unidadeMedida").value,
        descricao: document.getElementById("descricao").value.trim(), ativo: true, variacoes: variacoesServico
    };
    const resposta = servicoEditandoId ? await put(`/servicos/${servicoEditandoId}`, dados) : await post("/servicos", dados);
    if (!resposta?.sucesso) return mostrarMensagem(resposta?.mensagem || "Erro ao salvar serviço.");
    fecharModalServico();
    await carregarServicos();
    mostrarMensagem("Serviço salvo com sucesso.");
}

function editarServico(id) {
    const servico = servicos.find((item) => item.id === id);
    if (!servico) return;
    servicoEditandoId = id;
    document.getElementById("codigo").value = servico.codigo;
    document.getElementById("nome").value = servico.nome;
    document.getElementById("categoriaId").value = servico.categoriaId;
    document.getElementById("unidadeMedida").value = servico.unidadeMedida;
    document.getElementById("descricao").value = servico.descricao || "";
    document.getElementById("tituloModalServico").textContent = "Editar serviço";
    variacoesServico = (servico.variacoes || []).map((variacao) => ({ ...variacao, precoCusto: Number(variacao.precoCusto), precoVenda: Number(variacao.precoVenda) }));
    renderizarVariacoes();
    document.getElementById("modalServico").classList.add("active");
}

async function excluirServico(id) {
    if (!confirm("Deseja realmente excluir este serviço?")) return;
    const resposta = await del(`/servicos/${id}`);
    if (!resposta?.sucesso) return mostrarMensagem(resposta?.mensagem || "Não foi possível excluir o serviço.");
    await carregarServicos();
}

function abrirModalCategoria() {
    document.getElementById("formCategoriaServico").reset();
    document.getElementById("modalCategoriaServico").classList.add("active");
}
function fecharModalCategoria() { document.getElementById("modalCategoriaServico").classList.remove("active"); }

async function salvarCategoria(evento) {
    evento.preventDefault();
    const resposta = await post("/servicos/categorias", { nome: document.getElementById("nomeCategoria").value.trim(), descricao: document.getElementById("descricaoCategoria").value.trim() });
    if (!resposta?.sucesso) return mostrarMensagem(resposta?.mensagem || "Erro ao salvar categoria.");
    fecharModalCategoria();
    await carregarCategoriasServico();
    document.getElementById("categoriaId").value = resposta.categoria.id;
}
