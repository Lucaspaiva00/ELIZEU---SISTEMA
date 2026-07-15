const formLogin = document.getElementById("formLogin");

const mensagem = document.getElementById("mensagem");

formLogin.addEventListener("submit", async (event) => {

    event.preventDefault();

    const email =
        document.getElementById("email")
            .value.trim();

    const senha =
        document.getElementById("senha")
            .value;

    const botao =
        document.getElementById("btnEntrar");

    mensagem.textContent = "";

    if (!email || !senha) {

        mensagem.textContent =
            "Informe o e-mail e a senha.";

        return;

    }

    try {

        botao.disabled = true;

        botao.innerHTML = `

            <i class="fas fa-spinner fa-spin"></i>

            Entrando...

        `;

        const resposta = await post(
            "/auth/login",
            {
                email,
                senha
            }
        );

        if (!resposta.sucesso) {

            mensagem.textContent =
                resposta.mensagem ||
                "Usuário ou senha inválidos.";

            return;

        }

        setToken(resposta.token);

        localStorage.setItem(
            "usuario",
            JSON.stringify(resposta.usuario)
        );

        window.location.href =
            "dashboard.html";

    } catch (erro) {

        console.error(erro);

        mensagem.textContent =
            "Erro ao conectar com o servidor.";

    } finally {

        botao.disabled = false;

        botao.innerHTML = `

            <i class="fas fa-right-to-bracket"></i>

            Entrar no Sistema

        `;

    }

});