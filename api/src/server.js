require("dotenv").config();

const app = require("./app");
const controleAcessoRepository = require("./repositories/controleAcesso.repository");

const PORT = process.env.PORT || 3000;

async function iniciarServidor() {
    try {
        // Garante que o controle de acesso exista antes de aceitar requisições.
        // A migration equivalente continua no projeto para manter o histórico formal do banco.
        await controleAcessoRepository.garantirEstrutura();

        app.listen(PORT, () => {
            console.log(`🚀 Servidor rodando na porta ${PORT}`);
            console.log("🔐 Controle de acesso por usuário ativo.");
        });
    } catch (error) {
        console.error("[Inicialização] Não foi possível preparar o controle de acesso:", error);
        process.exit(1);
    }
}

iniciarServidor();
