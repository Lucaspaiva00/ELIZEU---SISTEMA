const PERFIS_TOPBAR = {
    ADMIN: "Administrador",
    GERENTE: "Gerente",
    VENDEDOR: "Vendedor",
    FINANCEIRO: "Financeiro",
    ESTOQUE: "Estoque",
    FISCAL: "Fiscal"
};

function obterUsuarioTopbar() {
    try {
        const valor = localStorage.getItem("usuario");
        return valor ? JSON.parse(valor) : null;
    } catch (erro) {
        console.warn("Não foi possível ler o usuário da sessão.", erro);
        return null;
    }
}

function iniciaisUsuarioTopbar(usuario) {
    const nome = String(usuario?.nome || "").trim();

    if (nome) {
        const partes = nome.split(/\s+/).filter(Boolean);

        return partes
            .slice(0, 2)
            .map((parte) => parte.charAt(0))
            .join("")
            .toUpperCase();
    }

    const perfil = PERFIS_TOPBAR[usuario?.perfil] || "Usuário";
    return perfil.charAt(0).toUpperCase();
}

function atualizarTopbarUsuario(usuario = null) {
    const usuarioAtual = usuario || obterUsuarioTopbar();
    const nomeElemento = document.getElementById("nomeUsuario");
    const avatarElemento = document.getElementById("avatarUsuario");

    if (!nomeElemento || !avatarElemento) {
        return;
    }

    if (!usuarioAtual) {
        nomeElemento.textContent = "Usuário";
        avatarElemento.textContent = "U";
        nomeElemento.removeAttribute("title");
        avatarElemento.removeAttribute("title");
        return;
    }

    const perfil = PERFIS_TOPBAR[usuarioAtual.perfil] || usuarioAtual.perfil || "Usuário";
    const nome = String(usuarioAtual.nome || "").trim();
    const email = String(usuarioAtual.email || "").trim();

    // O texto visível representa o perfil real do usuário logado.
    nomeElemento.textContent = perfil;

    const detalhes = [nome, email, perfil].filter(Boolean).join(" • ");
    if (detalhes) {
        nomeElemento.title = detalhes;
        avatarElemento.title = detalhes;
    }

    avatarElemento.textContent = iniciaisUsuarioTopbar(usuarioAtual);
}

window.atualizarTopbarUsuario = atualizarTopbarUsuario;

async function carregarLayout() {
    const sidebar = document.getElementById("sidebar");

    if (sidebar) {
        const html = await fetch("partials/sidebar.html");
        sidebar.innerHTML = await html.text();

        const paginaAtual = window.location.pathname.split("/").pop();
        const linkAtual = sidebar.querySelector(`a[href="${paginaAtual}"]`);

        if (linkAtual) {
            linkAtual.classList.add("active");
        }

        if (typeof window.aplicarPermissoesMenu === "function") {
            window.aplicarPermissoesMenu();
        }
    }

    const topbar = document.getElementById("topbar");

    if (topbar) {
        const html = await fetch("partials/topbar.html");
        topbar.innerHTML = await html.text();

        // Substitui imediatamente o texto estático pelo perfil da sessão.
        atualizarTopbarUsuario();
    }

    if (typeof window.inicializarMenuResponsivo === "function") {
        window.inicializarMenuResponsivo();
    }

    if (typeof window.aplicarControleAcesso === "function") {
        window.aplicarControleAcesso();
    }

    // O /auth/me pode atualizar os dados da sessão logo depois do carregamento.
    // Faz uma segunda leitura sem depender da ordem dos scripts.
    window.setTimeout(() => atualizarTopbarUsuario(), 500);
    window.setTimeout(() => atualizarTopbarUsuario(), 1500);
}

document.addEventListener("DOMContentLoaded", carregarLayout);

// Mantém a identificação sincronizada se outra aba atualizar a sessão.
window.addEventListener("storage", (evento) => {
    if (evento.key === "usuario") {
        atualizarTopbarUsuario();
    }
});
