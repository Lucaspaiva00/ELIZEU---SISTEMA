let usuarios = [];
let gruposPermissoes = [];
let perfisPadrao = {};

const PERFIS_USUARIO = {
    ADMIN: { nome: "Administrador", classe: "perfil-admin", descricao: "Acesso completo e permanente a todos os módulos e configurações." },
    GERENTE: { nome: "Gerente", classe: "perfil-gerente", descricao: "Gestão operacional, comercial, financeira e relatórios, sem administração de usuários/certificados por padrão." },
    VENDEDOR: { nome: "Vendedor", classe: "perfil-vendedor", descricao: "Clientes, consulta de catálogo, orçamentos e acompanhamento de vendas." },
    FINANCEIRO: { nome: "Financeiro", classe: "perfil-financeiro", descricao: "Contas, recebimentos, pagamentos, caixas, bancos e movimentações." },
    ESTOQUE: { nome: "Estoque", classe: "perfil-estoque", descricao: "Categorias, produtos, composição, preços e controle cadastral de estoque." },
    FISCAL: { nome: "Fiscal", classe: "perfil-fiscal", descricao: "Dados fiscais necessários, vendas faturadas e preparação/emissão de NF-e." }
};

document.addEventListener("DOMContentLoaded", async () => {
    document.getElementById("formUsuario").addEventListener("submit", salvarUsuario);
    document.getElementById("formSenhaUsuario").addEventListener("submit", redefinirSenha);
    document.getElementById("pesquisaUsuario").addEventListener("input", renderizarUsuarios);
    document.getElementById("filtroPerfil").addEventListener("change", renderizarUsuarios);
    document.getElementById("filtroStatus").addEventListener("change", renderizarUsuarios);
    document.getElementById("usuarioPerfil").addEventListener("change", () => {
        atualizarDescricaoPerfil();
        aplicarPadraoPerfil();
    });

    await carregarCatalogoPermissoes();
    await carregarUsuarios();
});

async function carregarCatalogoPermissoes() {
    const resposta = await get("/usuarios/permissoes");

    if (!resposta?.sucesso) {
        mostrarMensagem(resposta?.mensagem || "Não foi possível carregar as permissões disponíveis.");
        return;
    }

    gruposPermissoes = resposta.grupos || [];
    perfisPadrao = resposta.perfisPadrao || {};
    renderizarPermissoes([]);
}

async function carregarUsuarios() {
    const resposta = await get("/usuarios");

    if (!resposta?.sucesso) {
        document.getElementById("tabelaUsuarios").innerHTML = `<tr><td colspan="7" class="usuarios-empty usuarios-error"><i class="fas fa-lock"></i><strong>Acesso restrito</strong><span>${escapar(resposta?.mensagem || "Não foi possível carregar os usuários.")}</span></td></tr>`;
        return;
    }

    usuarios = resposta.usuarios || [];
    atualizarResumo();
    renderizarUsuarios();
}

function atualizarResumo() {
    document.getElementById("totalUsuarios").textContent = usuarios.length;
    document.getElementById("usuariosAtivos").textContent = usuarios.filter((item) => item.ativo).length;
    document.getElementById("totalAdmins").textContent = usuarios.filter((item) => item.perfil === "ADMIN" && item.ativo).length;
    document.getElementById("usuariosInativos").textContent = usuarios.filter((item) => !item.ativo).length;
}

function renderizarUsuarios() {
    const termo = document.getElementById("pesquisaUsuario").value.trim().toLowerCase();
    const perfil = document.getElementById("filtroPerfil").value;
    const status = document.getElementById("filtroStatus").value;

    const filtrados = usuarios.filter((item) => {
        const correspondeTermo = !termo || `${item.nome} ${item.email}`.toLowerCase().includes(termo);
        const correspondePerfil = !perfil || item.perfil === perfil;
        const correspondeStatus = !status || (status === "ATIVO" ? item.ativo : !item.ativo);
        return correspondeTermo && correspondePerfil && correspondeStatus;
    });

    const corpo = document.getElementById("tabelaUsuarios");

    if (!filtrados.length) {
        corpo.innerHTML = '<tr><td colspan="7" class="usuarios-empty"><i class="fas fa-users-slash"></i><strong>Nenhum usuário encontrado</strong><span>Ajuste os filtros ou cadastre um novo usuário.</span></td></tr>';
        return;
    }

    corpo.innerHTML = filtrados.map((item) => {
        const perfilAtual = PERFIS_USUARIO[item.perfil] || { nome: item.perfil, classe: "" };
        const quantidadePermissoes = Array.isArray(item.permissoes) ? item.permissoes.length : 0;
        const rotuloAcesso = item.perfil === "ADMIN"
            ? "Acesso total"
            : item.acessoPersonalizado
                ? `${quantidadePermissoes} personalizadas`
                : `${quantidadePermissoes} do perfil`;

        return `<tr>
            <td data-label="Usuário"><div class="usuario-identidade"><span class="usuario-avatar">${iniciais(item.nome)}</span><div><strong>${escapar(item.nome)}</strong><small>Cadastrado em ${formatarData(item.criadoEm)}</small></div></div></td>
            <td data-label="Contato"><div class="usuario-contato"><span>${escapar(item.email)}</span><small>${escapar(item.telefone || "Telefone não informado")}</small></div></td>
            <td data-label="Perfil"><span class="perfil-badge ${perfilAtual.classe}">${escapar(perfilAtual.nome)}</span></td>
            <td data-label="Permissões"><span class="status-pill ${item.acessoPersonalizado ? "status-active" : ""}"><i class="fas fa-key"></i>${escapar(rotuloAcesso)}</span></td>
            <td data-label="Último acesso"><span class="ultimo-acesso">${item.ultimoLogin ? formatarDataHora(item.ultimoLogin) : "Nunca acessou"}</span></td>
            <td data-label="Status"><span class="status-pill ${item.ativo ? "status-active" : "status-inactive"}"><i class="fas fa-circle"></i>${item.ativo ? "Ativo" : "Bloqueado"}</span></td>
            <td data-label="Ações"><div class="usuario-actions"><button class="action-btn" type="button" onclick="editarUsuario(${item.id})" title="Editar usuário e permissões"><i class="fas fa-pen"></i></button><button class="action-btn" type="button" onclick="abrirModalSenha(${item.id})" title="Redefinir senha"><i class="fas fa-key"></i></button><button class="action-btn ${item.ativo ? "action-danger" : "action-success"}" type="button" onclick="alternarStatusUsuario(${item.id})" title="${item.ativo ? "Bloquear" : "Ativar"}"><i class="fas fa-${item.ativo ? "user-lock" : "user-check"}"></i></button></div></td>
        </tr>`;
    }).join("");
}

function todasPermissoesCatalogo() {
    return gruposPermissoes.flatMap((grupo) =>
        (grupo.permissoes || []).map((item) => item.chave)
    );
}

function renderizarPermissoes(selecionadas = []) {
    const container = document.getElementById("permissoesUsuario");
    const perfil = document.getElementById("usuarioPerfil")?.value || "VENDEDOR";
    const administrador = perfil === "ADMIN";
    const selecionadasSet = new Set(administrador ? todasPermissoesCatalogo() : selecionadas);

    if (!gruposPermissoes.length) {
        container.innerHTML = '<div class="usuarios-empty">Nenhuma permissão disponível.</div>';
        atualizarResumoPermissoes();
        return;
    }

    if (administrador) {
        container.innerHTML = `
            <div class="permission-admin-info">
                <strong><i class="fas fa-shield-halved"></i> Administrador possui acesso total.</strong>
                <div style="margin-top:6px;">Por segurança, as permissões do perfil Administrador não podem ser reduzidas individualmente.</div>
            </div>
            ${gruposPermissoes.map((grupo) => montarGrupoPermissoes(grupo, selecionadasSet, true)).join("")}
        `;
        document.getElementById("btnAplicarPadrao").disabled = true;
    } else {
        container.innerHTML = gruposPermissoes
            .map((grupo) => montarGrupoPermissoes(grupo, selecionadasSet, false))
            .join("");
        document.getElementById("btnAplicarPadrao").disabled = false;
    }

    container.querySelectorAll('input[type="checkbox"][data-permissao]').forEach((checkbox) => {
        checkbox.addEventListener("change", atualizarResumoPermissoes);
    });

    atualizarResumoPermissoes();
}

function montarGrupoPermissoes(grupo, selecionadasSet, desabilitado) {
    const opcoes = (grupo.permissoes || []).map((item) => `
        <label class="permission-option">
            <input
                type="checkbox"
                data-permissao="${escapar(item.chave)}"
                ${selecionadasSet.has(item.chave) ? "checked" : ""}
                ${desabilitado ? "disabled" : ""}
            >
            <span>${escapar(item.nome)}</span>
        </label>
    `).join("");

    return `
        <section class="permission-group">
            <div class="permission-group-head">
                <strong>${escapar(grupo.nome)}</strong>
                <small>${escapar(grupo.descricao || "")}</small>
            </div>
            ${opcoes}
        </section>
    `;
}

function permissoesSelecionadas() {
    const perfil = document.getElementById("usuarioPerfil").value;

    if (perfil === "ADMIN") {
        return todasPermissoesCatalogo();
    }

    return [...document.querySelectorAll('#permissoesUsuario input[data-permissao]:checked')]
        .map((campo) => campo.dataset.permissao)
        .filter(Boolean);
}

function atualizarResumoPermissoes() {
    const resumo = document.getElementById("resumoPermissoes");
    if (!resumo) return;

    const perfil = document.getElementById("usuarioPerfil")?.value;
    const total = perfil === "ADMIN"
        ? todasPermissoesCatalogo().length
        : permissoesSelecionadas().length;

    resumo.textContent = perfil === "ADMIN"
        ? `${total} permissões — acesso total do administrador.`
        : `${total} permissões liberadas para este usuário.`;
}

function aplicarPadraoPerfil() {
    const perfil = document.getElementById("usuarioPerfil").value;
    renderizarPermissoes(perfisPadrao[perfil] || []);
}

function abrirModalUsuario() {
    document.getElementById("formUsuario").reset();
    document.getElementById("usuarioId").value = "";
    document.getElementById("usuarioAtivo").checked = true;
    document.getElementById("usuarioPerfil").value = "VENDEDOR";
    document.getElementById("tituloModalUsuario").textContent = "Novo usuário";
    document.getElementById("grupoSenhaInicial").style.display = "block";
    document.getElementById("usuarioSenha").required = true;
    atualizarDescricaoPerfil();
    aplicarPadraoPerfil();
    document.getElementById("modalUsuario").classList.add("active");
}

function editarUsuario(id) {
    const item = usuarios.find((usuario) => usuario.id === id);
    if (!item) return;

    document.getElementById("usuarioId").value = item.id;
    document.getElementById("usuarioNome").value = item.nome;
    document.getElementById("usuarioEmail").value = item.email;
    document.getElementById("usuarioTelefone").value = item.telefone || "";
    document.getElementById("usuarioPerfil").value = item.perfil;
    document.getElementById("usuarioAtivo").checked = item.ativo;
    document.getElementById("tituloModalUsuario").textContent = "Editar usuário e acessos";
    document.getElementById("grupoSenhaInicial").style.display = "none";
    document.getElementById("usuarioSenha").required = false;
    atualizarDescricaoPerfil();
    renderizarPermissoes(item.permissoes || perfisPadrao[item.perfil] || []);
    document.getElementById("modalUsuario").classList.add("active");
}

function fecharModalUsuario() {
    document.getElementById("modalUsuario").classList.remove("active");
}

async function salvarUsuario(evento) {
    evento.preventDefault();

    const id = document.getElementById("usuarioId").value;
    const perfil = document.getElementById("usuarioPerfil").value;
    const dados = {
        nome: document.getElementById("usuarioNome").value.trim(),
        email: document.getElementById("usuarioEmail").value.trim(),
        telefone: document.getElementById("usuarioTelefone").value.trim(),
        perfil,
        ativo: document.getElementById("usuarioAtivo").checked,
        permissoes: perfil === "ADMIN" ? null : permissoesSelecionadas()
    };

    if (!id) dados.senha = document.getElementById("usuarioSenha").value;

    const resposta = id
        ? await put(`/usuarios/${id}`, dados)
        : await post("/usuarios", dados);

    if (!resposta?.sucesso) {
        return mostrarMensagem(resposta?.mensagem || "Erro ao salvar usuário.");
    }

    fecharModalUsuario();
    await carregarUsuarios();
    mostrarMensagem(resposta.mensagem || "Usuário e acessos salvos com sucesso.");
}

async function alternarStatusUsuario(id) {
    const item = usuarios.find((usuario) => usuario.id === id);
    if (!item) return;

    const acao = item.ativo ? "bloquear" : "ativar";

    if (!confirm(`Deseja ${acao} o acesso de ${item.nome}?`)) return;

    const resposta = await patch(`/usuarios/${id}/status`, { ativo: !item.ativo });

    if (!resposta?.sucesso) {
        return mostrarMensagem(resposta?.mensagem || "Erro ao alterar o status.");
    }

    await carregarUsuarios();
    mostrarMensagem(resposta.mensagem);
}

function abrirModalSenha(id) {
    const item = usuarios.find((usuario) => usuario.id === id);
    if (!item) return;

    document.getElementById("formSenhaUsuario").reset();
    document.getElementById("senhaUsuarioId").value = id;
    document.getElementById("senhaUsuarioNome").textContent = `Defina uma nova senha para ${item.nome}.`;
    document.getElementById("modalSenhaUsuario").classList.add("active");
}

function fecharModalSenha() {
    document.getElementById("modalSenhaUsuario").classList.remove("active");
}

async function redefinirSenha(evento) {
    evento.preventDefault();

    const novaSenha = document.getElementById("novaSenhaUsuario").value;

    if (novaSenha !== document.getElementById("confirmarSenhaUsuario").value) {
        return mostrarMensagem("As senhas informadas não coincidem.");
    }

    const resposta = await patch(
        `/usuarios/${document.getElementById("senhaUsuarioId").value}/senha`,
        { novaSenha }
    );

    if (!resposta?.sucesso) {
        return mostrarMensagem(resposta?.mensagem || "Erro ao redefinir a senha.");
    }

    fecharModalSenha();
    mostrarMensagem(resposta.mensagem);
}

function atualizarDescricaoPerfil() {
    document.getElementById("descricaoPerfil").textContent =
        PERFIS_USUARIO[document.getElementById("usuarioPerfil").value]?.descricao || "";
}

function alternarVisibilidade(id, botao) {
    const campo = document.getElementById(id);
    campo.type = campo.type === "password" ? "text" : "password";
    botao.querySelector("i").className = `fas fa-${campo.type === "password" ? "eye" : "eye-slash"}`;
}

function escapar(valor) {
    const elemento = document.createElement("div");
    elemento.textContent = String(valor ?? "");
    return elemento.innerHTML;
}

function iniciais(nome) {
    return String(nome || "U")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((parte) => parte[0])
        .join("")
        .toUpperCase();
}

function formatarData(valor) {
    return valor ? new Date(valor).toLocaleDateString("pt-BR") : "—";
}

function formatarDataHora(valor) {
    return new Date(valor).toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short"
    });
}
