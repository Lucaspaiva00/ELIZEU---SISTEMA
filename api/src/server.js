require("dotenv").config();

const app = require("./app");
const controleAcessoRepository = require("./repositories/controleAcesso.repository");
const sacmaisAutoSyncService = require("./services/sacmaisAutoSync.service");
const { executarBootstrapFiscal } = require("./services/bootstrapFiscal.service");
const portalNacionalRepository = require("./repositories/portalNacional.repository");

const PORT = process.env.PORT || 3000;

async function iniciarServidor() {
    try {
        // Garante que o controle de acesso exista antes de aceitar requisições.
        // A migration equivalente continua no projeto para manter o histórico formal do banco.
        await controleAcessoRepository.garantirEstrutura();
        await executarBootstrapFiscal();

        if (process.env.FISCAL_BOOTSTRAP_TEST_PORTAL === "1") {
            try {
                const empresaIdFiscal = Number(process.env.FISCAL_BOOTSTRAP_EMPRESA_ID || 0);
                if (empresaIdFiscal) {
                    const testePortal = await portalNacionalRepository.testar(empresaIdFiscal);
                    console.log("[Portal Nacional] Teste automático:", JSON.stringify({
                        ambiente: testePortal.ambiente,
                        statusHttp: testePortal.statusHttp,
                        conectado: testePortal.conectado
                    }));
                }
            } catch (erro) {
                console.error("[Portal Nacional] Teste automático falhou:", erro.message);
            }
        }

        app.listen(PORT, () => {
            console.log(`🚀 Servidor rodando na porta ${PORT}`);
            console.log("🔐 Controle de acesso por usuário ativo.");
            sacmaisAutoSyncService.iniciar().catch((erro) => {
                console.error("[SacMais auto] Não foi possível iniciar:", erro);
            });
        });
    } catch (error) {
        console.error("[Inicialização] Não foi possível preparar o controle de acesso:", error);
        process.exit(1);
    }
}

iniciarServidor();
