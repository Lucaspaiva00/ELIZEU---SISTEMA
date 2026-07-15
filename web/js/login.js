const formLogin = document.getElementById("formLogin");
const mensagemLogin = document.getElementById("mensagem");

formLogin.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value;
    const botao = formLogin.querySelector('button[type="submit"]');

    mensagemLogin.textContent = "";

    if (!email || !senha) {
        mensagemLogin.textContent = "Informe o e-mail e a senha.";
        return;
    }

    try {
        botao.disabled = true;
        botao.innerHTML = `
            <i class="fas fa-spinner fa-spin"></i>
            Entrando...
        `;

        const resposta = await post("/auth/login", {
            email,
            senha
        });

        if (!resposta || !resposta.sucesso) {
            mensagemLogin.textContent =
                resposta?.mensagem || "Não foi possível realizar o login.";
            return;
        }

        setToken(resposta.token);

        localStorage.setItem(
            "usuario",
            JSON.stringify(resposta.usuario)
        );

        window.location.href = "dashboard.html";
    } catch (error) {
        console.error(error);
        mensagemLogin.textContent =
            error.message || "Erro ao conectar com o servidor.";
    } finally {
        botao.disabled = false;
        botao.innerHTML = `
            <i class="fas fa-sign-in-alt"></i>
            Entrar
        `;
    }
});