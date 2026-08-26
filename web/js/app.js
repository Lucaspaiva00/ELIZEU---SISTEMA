function verificarLogin() {

    const token = localStorage.getItem("token");

    if (!token) {
        window.location.href = "login.html";
    }

}

function logout() {

    localStorage.removeItem("token");

    window.location.href = "login.html";

}

document.addEventListener("DOMContentLoaded", () => {

    if (!window.location.pathname.includes("login")) {

        verificarLogin();

    }

});

// ============================================
// Abas reutilizáveis para modais grandes
// ============================================
function ativarAbaModal(modal, nomeAba) {
    if (!modal) return;

    const botoes = [...modal.querySelectorAll(':scope .modal-tabs [data-modal-tab]')];
    const paineis = [...modal.querySelectorAll(':scope .modal-body [data-modal-panel]')];

    if (!botoes.length || !paineis.length) return;

    const alvo = String(nomeAba || botoes[0].dataset.modalTab || '');

    botoes.forEach((botao) => {
        const ativo = botao.dataset.modalTab === alvo;
        botao.classList.toggle('active', ativo);
        botao.setAttribute('aria-selected', ativo ? 'true' : 'false');
        botao.tabIndex = ativo ? 0 : -1;
    });

    paineis.forEach((painel) => {
        painel.classList.toggle('active', painel.dataset.modalPanel === alvo);
    });
}

function resetarAbasModal(modal) {
    if (!modal?.matches?.('[data-modal-tabs]')) return;
    const primeira = modal.querySelector('.modal-tabs [data-modal-tab]');
    if (primeira) ativarAbaModal(modal, primeira.dataset.modalTab);
}

document.addEventListener('click', (event) => {
    const botao = event.target.closest('[data-modal-tab]');
    if (!botao) return;

    const modal = botao.closest('[data-modal-tabs]');
    if (!modal) return;

    ativarAbaModal(modal, botao.dataset.modalTab);
});

// Se um campo obrigatório estiver em outra aba, abre a aba correta antes
// do navegador exibir a validação. Evita "invalid form control is not focusable".
document.addEventListener('invalid', (event) => {
    const painel = event.target.closest?.('[data-modal-panel]');
    if (!painel || painel.classList.contains('active')) return;

    const modal = painel.closest('[data-modal-tabs]');
    if (modal) ativarAbaModal(modal, painel.dataset.modalPanel);
}, true);

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-modal-tabs]').forEach(resetarAbasModal);

    const observador = new MutationObserver((mutacoes) => {
        mutacoes.forEach((mutacao) => {
            const alvo = mutacao.target;
            if (
                alvo instanceof HTMLElement &&
                alvo.matches('.modal-overlay[data-modal-tabs]') &&
                alvo.classList.contains('active')
            ) {
                resetarAbasModal(alvo);
            }
        });
    });

    document.querySelectorAll('.modal-overlay[data-modal-tabs]').forEach((modal) => {
        observador.observe(modal, { attributes: true, attributeFilter: ['class'] });
    });
});

// ============================================
// Extensões específicas por página
// ============================================
document.addEventListener("DOMContentLoaded", () => {
    if (!window.location.pathname.includes("produtos.html")) return;

    if (document.querySelector('script[data-extensao="duplicar-produtos"]')) return;

    const script = document.createElement("script");
    script.src = "../js/produtos-duplicar.js";
    script.dataset.extensao = "duplicar-produtos";
    document.body.appendChild(script);
});
