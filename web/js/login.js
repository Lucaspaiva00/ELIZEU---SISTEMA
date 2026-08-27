const formLogin = document.getElementById("formLogin");
const mensagem = document.getElementById("mensagem");

function usuarioTemPermissaoLogin(usuario, permissao) {
    if (usuario?.perfil === "ADMIN") return true;
    return Array.isArray(usuario?.permissoes) && usuario.permissoes.includes(permissao);
}

function paginaInicialLogin(usuario) {
    const preferidas = {
        ADMIN: ["dashboard.html", "dashboard.visualizar"],
        GERENTE: ["dashboard.html", "dashboard.visualizar"],
        VENDEDOR: ["orcamentos.html", "orcamentos.visualizar"],
        FINANCEIRO: ["dashboard.html", "dashboard.visualizar"],
        ESTOQUE: ["produtos.html", "produtos.visualizar"],
        FISCAL: ["vendas.html", "vendas.visualizar"]
    };

    const preferida = preferidas[usuario?.perfil];
    if (preferida && usuarioTemPermissaoLogin(usuario, preferida[1])) {
        return preferida[0];
    }

    const opcoes = [
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

    return opcoes.find(([, permissao]) => usuarioTemPermissaoLogin(usuario, permissao))?.[0]
        || "dashboard.html";
}

formLogin.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value;
    const botao = document.getElementById("btnEntrar");

    mensagem.textContent = "";

    if (!email || !senha) {
        mensagem.textContent = "Informe o e-mail e a senha.";
        return;
    }

    try {
        botao.disabled = true;
        botao.innerHTML = `
            <i class="fas fa-spinner fa-spin"></i>
            Entrando...
        `;

        const resposta = await post("/auth/login", { email, senha });

        if (!resposta?.sucesso) {
            mensagem.textContent = resposta?.mensagem || "Usuário ou senha inválidos.";
            return;
        }

        setToken(resposta.token);
        localStorage.setItem("usuario", JSON.stringify(resposta.usuario));
        window.location.href = paginaInicialLogin(resposta.usuario);
    } catch (erro) {
        console.error(erro);
        mensagem.textContent = "Erro ao conectar com o servidor.";
    } finally {
        botao.disabled = false;
        botao.innerHTML = `
            <i class="fas fa-right-to-bracket"></i>
            Entrar no Sistema
        `;
    }
});
