require("dotenv").config();

const app = require("./app");
const controleAcessoRepository = require("./repositories/controleAcesso.repository");
const sacmaisAutoSyncService = require("./services/sacmaisAutoSync.service");
const { executarBootstrapFiscal } = require("./services/bootstrapFiscal.service");
const portalNacionalRepository = require("./repositories/portalNacional.repository");
const nfeDistribuicaoService = require("./services/nfeDistribuicao.service");
const sefazGoService = require("./services/sefazGo.service");
const nfseService = require("./services/nfse.service");

const PORT = process.env.PORT || 3000;

async function iniciarServidor() {
    try {
        // Garante que o controle de acesso exista antes de aceitar requisições.
        // A migration equivalente continua no projeto para manter o histórico formal do banco.
        await controleAcessoRepository.garantirEstrutura();
        await executarBootstrapFiscal();

        if (process.env.NFS_E_TESTAR_CONVENIO === "1") {
            try {
                const empresaIdFiscal = Number(process.env.FISCAL_BOOTSTRAP_EMPRESA_ID || 0);
                const teste = await portalNacionalRepository.testar(empresaIdFiscal);
                console.log("[NFS-e Nacional] Convênio Goiânia:", JSON.stringify({
                    statusHttp: teste.statusHttp,
                    resposta: teste.resposta
                }));
            } catch (erro) {
                console.error("[NFS-e Nacional] Teste convênio falhou:", erro.message);
            }
        }


        if (process.env.NFS_E_TESTAR_SEFIN === "1") {
            try {
                const empresaIdFiscal = Number(process.env.FISCAL_BOOTSTRAP_EMPRESA_ID || 0);
                const teste = await portalNacionalRepository.testarSefin(empresaIdFiscal);
                console.log("[NFS-e Nacional] Teste SEFIN restrita:", JSON.stringify({
                    statusHttp: teste.statusHttp,
                    resposta: teste.resposta
                }));
            } catch (erro) {
                console.error("[NFS-e Nacional] Teste SEFIN falhou:", erro.message);
            }
        }


        if (process.env.NFS_E_TESTAR_VENDA_ID) {
            try {
                const empresaIdFiscal = Number(process.env.FISCAL_BOOTSTRAP_EMPRESA_ID || 0);
                const vendaIdFiscal = Number(process.env.NFS_E_TESTAR_VENDA_ID || 0);
                const testeVenda = await nfseService.validar(vendaIdFiscal, empresaIdFiscal);
                console.log("[NFS-e Nacional] Validação venda teste:", JSON.stringify({
                    vendaId: vendaIdFiscal,
                    pronta: testeVenda.pronta,
                    pendencias: testeVenda.pendencias
                }));
            } catch (erro) {
                console.error("[NFS-e Nacional] Validação venda teste falhou:", erro.message);
            }
        }

        if (process.env.NFE_TESTAR_SEFAZ_GO === "1") {
            try {
                const empresaIdFiscal = Number(process.env.FISCAL_BOOTSTRAP_EMPRESA_ID || 0);
                const teste = await sefazGoService.testarStatus(empresaIdFiscal, "HOMOLOGACAO");
                console.log("[SEFAZ GO] Status homologação:", JSON.stringify(teste));
            } catch (erro) {
                console.error("[SEFAZ GO] Teste falhou:", erro.message);
            }
        }

        if (process.env.NFE_RECUPERAR_CHAVE) {
            try {
                const empresaIdFiscal = Number(process.env.FISCAL_BOOTSTRAP_EMPRESA_ID || 0);
                const recuperada = await nfeDistribuicaoService.recuperarPorChave(
                    empresaIdFiscal,
                    process.env.NFE_RECUPERAR_CHAVE
                );
                console.log("[NF-e XML] Consulta:", JSON.stringify({
                    httpStatus: recuperada.httpStatus,
                    cStat: recuperada.cStat,
                    xMotivo: recuperada.xMotivo,
                    resumo: nfeDistribuicaoService.resumirXml(recuperada.xml)
                }));
            } catch (erro) {
                console.error("[NF-e XML] Falha na recuperação:", erro.message);
            }
        }

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
