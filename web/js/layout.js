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
    }

    if (typeof window.inicializarMenuResponsivo === "function") {
        window.inicializarMenuResponsivo();
    }

    if (typeof window.aplicarControleAcesso === "function") {
        window.aplicarControleAcesso();
    }
}

document.addEventListener("DOMContentLoaded", carregarLayout);
