function verificarLogin() {
    const token = localStorage.getItem("token");

    if (!token) {
        window.location.href = "login.html";
        return false;
    }

    return true;
}

function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    window.location.href = "login.html";
}

function usuarioAtualLocal() {
    try {
        const valor = localStorage.getItem("usuario");
        return valor ? JSON.parse(valor) : null;
    } catch {
        return null;
    }
}

function salvarUsuarioLocal(usuario) {
    if (!usuario) return;
    localStorage.setItem("usuario", JSON.stringify(usuario));
}

function temPermissao(permissao, usuario = usuarioAtualLocal()) {
    if (!permissao) return true;
    if (!usuario) return false;
    if (usuario.perfil === "ADMIN") return true;

    return Array.isArray(usuario.permissoes) &&
        usuario.permissoes.includes(permissao);
}

window.temPermissao = temPermissao;

const PAGINAS_PERMISSOES = {
    "dashboard.html": "dashboard.visualizar",
    "empresas.html": "empresa.visualizar",
    "usuarios.html": "usuarios.gerenciar",
    "clientes.html": "clientes.visualizar",
    "categorias.html": "categorias.visualizar",
    "produtos.html": "produtos.visualizar",
    "servicos.html": "servicos.visualizar",
    "orcamentos.html": "orcamentos.visualizar",
    "vendas.html": "vendas.visualizar",
    "contas-receber.html": "contas_receber.visualizar",
    "contas-pagar.html": "contas_pagar.visualizar",
    "contas-financeiras.html": "contas_financeiras.visualizar",
    "movimentacoes-financeiras.html": "movimentacoes.visualizar",
    "cadastros-financeiros.html": "financeiro.configurar"
};

const ORDEM_PAGINAS = [
    ["dashboard.html", "dashboard.visualizar"],
    ["orcamentos.html", "orcamentos.visualizar"],
    ["clientes.html", "clientes.visualizar"],
    ["produtos.html", "produtos.visualizar"],
    ["servicos.html", "servicos.visualizar"],
    ["vendas.html", "vendas.visualizar"],
    ["contas-receber.html", "contas_receber.visualizar"],
    ["contas-pagar.html", "contas_pagar.visualizar"],
    ["contas-financeiras.html", "contas_financeiras.visualizar"],
    ["movimentacoes-financeiras.html", "movimentacoes.visualizar"],
    ["cadastros-financeiros.html", "financeiro.configurar"],
    ["categorias.html", "categorias.visualizar"],
    ["empresas.html", "empresa.visualizar"],
    ["usuarios.html", "usuarios.gerenciar"]
];

function paginaAtualNome() {
    return window.location.pathname.split("/").pop() || "dashboard.html";
}

function primeiraPaginaPermitida(usuario = usuarioAtualLocal()) {
    const preferidasPorPerfil = {
        ADMIN: "dashboard.html",
        GERENTE: "dashboard.html",
        VENDEDOR: "orcamentos.html",
        FINANCEIRO: "dashboard.html",
        ESTOQUE: "produtos.html",
        FISCAL: "vendas.html"
    };

    const preferida = preferidasPorPerfil[usuario?.perfil];
    const permissaoPreferida = preferida ? PAGINAS_PERMISSOES[preferida] : null;

    if (preferida && permissaoPreferida && temPermissao(permissaoPreferida, usuario)) {
        return preferida;
    }

    const item = ORDEM_PAGINAS.find(([, permissao]) =>
        temPermissao(permissao, usuario)
    );

    return item?.[0] || null;
}

function renderizarAcessoNegado() {
    const conteudo = document.querySelector(".content");
    if (!conteudo) return;

    conteudo.innerHTML = `
        <div class="card" style="max-width:760px;margin:40px auto;">
            <div class="card-body" style="text-align:center;padding:48px 28px;">
                <div style="font-size:42px;margin-bottom:16px;color:#64748b;">
                    <i class="fas fa-lock"></i>
                </div>
                <h2 style="margin-bottom:10px;">Acesso não autorizado</h2>
                <p style="color:#64748b;max-width:560px;margin:0 auto 24px;line-height:1.6;">
                    Seu usuário está ativo, mas não possui acesso a nenhum módulo do sistema.
                    Solicite a um administrador a liberação das áreas necessárias.
                </p>
                <button type="button" class="btn btn-light" onclick="logout()">
                    <i class="fas fa-right-from-bracket"></i> Sair do sistema
                </button>
            </div>
        </div>
    `;
}

function verificarPermissaoPagina(usuario = usuarioAtualLocal()) {
    const pagina = paginaAtualNome();
    const permissao = PAGINAS_PERMISSOES[pagina];

    // Compatibilidade com sessões abertas antes da implantação do RBAC:
    // espera /auth/me atualizar o usuário antes de bloquear a página.
    if (usuario && usuario.perfil !== "ADMIN" && !Array.isArray(usuario.permissoes)) {
        return true;
    }

    if (!permissao || temPermissao(permissao, usuario)) {
        return true;
    }

    const destino = primeiraPaginaPermitida(usuario);

    if (destino && destino !== pagina) {
        window.location.replace(destino);
        return false;
    }

    renderizarAcessoNegado();
    return false;
}

function aplicarPermissoesMenu(usuario = usuarioAtualLocal()) {
    document.querySelectorAll("#sidebar [data-permission]").forEach((elemento) => {
        const permitido = temPermissao(elemento.dataset.permission, usuario);
        const item = elemento.closest("li") || elemento;
        item.hidden = !permitido;
    });

    document.querySelectorAll("#sidebar .sidebar-section-title").forEach((titulo) => {
        let proximo = titulo.nextElementSibling;
        let possuiItemVisivel = false;

        while (proximo && !proximo.classList.contains("sidebar-section-title")) {
            if (!proximo.hidden) possuiItemVisivel = true;
            proximo = proximo.nextElementSibling;
        }

        titulo.hidden = !possuiItemVisivel;
    });
}

window.aplicarPermissoesMenu = aplicarPermissoesMenu;

function regrasAcoesPagina(pagina) {
    const regras = {
        "clientes.html": [
            ["importarHistoricoSacMais", "clientes.importar"],
            ["abrirModal()", "clientes.criar"],
            ["editarCliente(", "clientes.editar"],
            ["excluirCliente(", "clientes.excluir"]
        ],
        "categorias.html": [
            ["abrirModalCategoria", "categorias.gerenciar"],
            ["editarCategoria(", "categorias.gerenciar"],
            ["excluirCategoria(", "categorias.gerenciar"]
        ],
        "produtos.html": [
            ["abrirModalProduto()", "produtos.criar"],
            ["editarProduto(", "produtos.editar"],
            ["excluirProduto(", "produtos.excluir"]
        ],
        "servicos.html": [
            ["abrirModalServico", "servicos.gerenciar"],
            ["abrirModalCategoria", "servicos.gerenciar"],
            ["editarServico(", "servicos.gerenciar"],
            ["excluirServico(", "servicos.gerenciar"]
        ],
        "orcamentos.html": [
            ["abrirModalOrcamento", "orcamentos.criar"],
            ["editarOrcamento(", "orcamentos.editar"],
            ["excluirOrcamento(", "orcamentos.excluir"],
            ["abrirModalAprovacao(", "orcamentos.aprovar"],
            ["abrirEnvioWhatsApp(", "orcamentos.enviar"]
        ],
        "vendas.html": [
            ["faturarVenda(", "vendas.faturar"],
            ["faturarVendaAtual", "vendas.faturar"],
            ["cancelarVendaAtual", "vendas.cancelar"],
            ["emitirNfe(", "fiscal.emitir"],
            ["emitirNfeAtual", "fiscal.emitir"]
        ],
        "contas-receber.html": [
            ["abrirModalConta", "contas_receber.criar"],
            ["editarConta(", "contas_receber.editar"],
            ["abrirModalReceber(", "contas_receber.receber"],
            ["cancelarConta(", "contas_receber.cancelar"]
        ],
        "contas-pagar.html": [
            ["abrirModalConta", "contas_pagar.criar"],
            ["editarConta(", "contas_pagar.editar"],
            ["abrirModalPagar(", "contas_pagar.pagar"],
            ["cancelarConta(", "contas_pagar.cancelar"]
        ],
        "movimentacoes-financeiras.html": [
            ["abrirModalLancamento", "movimentacoes.criar"],
            ["abrirModalTransferencia", "movimentacoes.transferir"],
            ["estornarMovimentacao(", "movimentacoes.estornar"]
        ]
    };

    return regras[pagina] || [];
}

function controlarFormulario(id, permissao, usuario) {
    const formulario = document.getElementById(id);
    if (!formulario) return;

    const permitido = temPermissao(permissao, usuario);

    formulario.querySelectorAll("input, select, textarea, button").forEach((campo) => {
        campo.disabled = !permitido;
    });

    formulario.dataset.somenteLeitura = permitido ? "false" : "true";
}

function aplicarPermissoesAcoes(usuario = usuarioAtualLocal()) {
    document.querySelectorAll("[data-permission]").forEach((elemento) => {
        if (elemento.closest("#sidebar")) return;
        elemento.hidden = !temPermissao(elemento.dataset.permission, usuario);
    });

    const pagina = paginaAtualNome();
    const regras = regrasAcoesPagina(pagina);

    if (regras.length) {
        document.querySelectorAll("[onclick]").forEach((elemento) => {
            const codigo = elemento.getAttribute("onclick") || "";
            const regra = regras.find(([trecho]) => codigo.includes(trecho));
            if (!regra) return;
            elemento.hidden = !temPermissao(regra[1], usuario);
        });
    }

    if (pagina === "vendas.html") {
        const ids = {
            btnFaturarVenda: "vendas.faturar",
            btnCancelarVenda: "vendas.cancelar",
            btnEmitirNfe: "fiscal.emitir"
        };

        Object.entries(ids).forEach(([id, permissao]) => {
            const elemento = document.getElementById(id);
            if (elemento && !temPermissao(permissao, usuario)) {
                elemento.hidden = true;
            }
        });
    }

    if (pagina === "empresas.html") {
        controlarFormulario("formEmpresa", "empresa.editar", usuario);
        controlarFormulario("formFiscal", "empresa.fiscal", usuario);
        controlarFormulario("formFocus", "empresa.fiscal", usuario);
        controlarFormulario("formCertificado", "empresa.certificado", usuario);

        const remover = [...document.querySelectorAll("[onclick]")]
            .find((elemento) => (elemento.getAttribute("onclick") || "").includes("removerCertificado"));

        if (remover) remover.hidden = !temPermissao("empresa.certificado", usuario);
    }
}

window.aplicarPermissoesAcoes = aplicarPermissoesAcoes;

function aplicarControleAcesso(usuario = usuarioAtualLocal()) {
    verificarPermissaoPagina(usuario);
    aplicarPermissoesMenu(usuario);
    aplicarPermissoesAcoes(usuario);
}

window.aplicarControleAcesso = aplicarControleAcesso;

async function atualizarSessaoAtual() {
    if (!getToken()) return null;

    try {
        const resposta = await get("/auth/me");

        if (!resposta?.sucesso || !resposta.usuario) {
            return null;
        }

        salvarUsuarioLocal(resposta.usuario);
        aplicarControleAcesso(resposta.usuario);
        return resposta.usuario;
    } catch (erro) {
        console.error("Erro ao atualizar permissões da sessão:", erro);
        return null;
    }
}

// Bloqueia a navegação usando o cache local antes mesmo das chamadas da página.
if (!window.location.pathname.includes("login")) {
    if (verificarLogin()) {
        verificarPermissaoPagina();
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    if (window.location.pathname.includes("login")) return;

    aplicarControleAcesso();

    const observadorAcoes = new MutationObserver(() => {
        aplicarPermissoesAcoes();
        aplicarPermissoesMenu();
    });

    observadorAcoes.observe(document.body, {
        childList: true,
        subtree: true
    });

    await atualizarSessaoAtual();
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
