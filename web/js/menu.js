function inicializarMenuResponsivo() {
    const sidebar = document.querySelector(".sidebar");
    const botaoAbrir = document.getElementById("menuToggle");
    const botaoFechar = document.getElementById("menuClose");
    const overlay = document.getElementById("sidebarOverlay");

    if (!sidebar || !botaoAbrir || !overlay || sidebar.dataset.menuConfigurado) {
        return;
    }

    sidebar.dataset.menuConfigurado = "true";

    function abrirMenu() {
        sidebar.classList.add("active");
        overlay.classList.add("active");
        document.body.classList.add("menu-open");
        botaoAbrir.setAttribute("aria-expanded", "true");
        overlay.setAttribute("aria-hidden", "false");
        botaoFechar?.focus();
    }

    function fecharMenu(devolverFoco = false) {
        sidebar.classList.remove("active");
        overlay.classList.remove("active");
        document.body.classList.remove("menu-open");
        botaoAbrir.setAttribute("aria-expanded", "false");
        overlay.setAttribute("aria-hidden", "true");

        if (devolverFoco) {
            botaoAbrir.focus();
        }
    }

    function alternarMenu() {
        if (sidebar.classList.contains("active")) {
            fecharMenu(true);
        } else {
            abrirMenu();
        }
    }

    botaoAbrir.addEventListener("click", alternarMenu);
    botaoFechar?.addEventListener("click", () => fecharMenu(true));
    overlay.addEventListener("click", () => fecharMenu(true));

    sidebar.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => {
            if (window.innerWidth <= 768) {
                fecharMenu();
            }
        });
    });

    document.addEventListener("keydown", (evento) => {
        if (evento.key === "Escape" && sidebar.classList.contains("active")) {
            fecharMenu(true);
        }
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 768) {
            fecharMenu();
        }
    });
}

window.inicializarMenuResponsivo = inicializarMenuResponsivo;
