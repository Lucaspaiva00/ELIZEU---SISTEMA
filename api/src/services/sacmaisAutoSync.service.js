const prisma = require("../config/prisma");
const sacmaisService = require("./sacmais.service");

let timer = null;
let executando = false;
let assinaturaAnterior = null;

function boolEnv(valor, padrao = false) {
    if (valor === undefined || valor === null || valor === "") return padrao;
    return ["1", "true", "yes", "sim", "on"].includes(String(valor).trim().toLowerCase());
}

function numeroEnv(valor, padrao, minimo, maximo) {
    const numero = Number(valor);
    if (!Number.isFinite(numero)) return padrao;
    return Math.min(maximo, Math.max(minimo, Math.trunc(numero)));
}

function configuracao() {
    return {
        ativo: boolEnv(process.env.SACMAIS_AUTO_SYNC_ENABLED, false),
        empresaId: Number(process.env.SACMAIS_AUTO_SYNC_EMPRESA_ID || 0),
        intervaloMs: numeroEnv(process.env.SACMAIS_AUTO_SYNC_INTERVAL_MS, 10000, 5000, 300000),
        limite: numeroEnv(process.env.SACMAIS_AUTO_SYNC_LIMITE, 25, 5, 50)
    };
}

function agendar(ms) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(executarCiclo, ms);
    timer.unref?.();
}

async function executarCiclo() {
    const cfg = configuracao();

    if (!cfg.ativo) return;
    if (executando) {
        agendar(cfg.intervaloMs);
        return;
    }

    executando = true;

    try {
        const resultado = await sacmaisService.sincronizarRecentes(
            cfg.empresaId,
            cfg.limite,
            assinaturaAnterior
        );

        if (resultado.assinatura) {
            assinaturaAnterior = resultado.assinatura;
        }

        if (
            !resultado.semAlteracoes &&
            (
                resultado.criados ||
                resultado.atualizados ||
                resultado.ignorados
            )
        ) {
            console.log(
                `[SacMais auto] novos=${resultado.criados} atualizados=${resultado.atualizados} ` +
                `ignorados=${resultado.ignorados} tickets=${resultado.ticketsRecebidos}`
            );
        }

        if (resultado.erros?.length) {
            console.warn("[SacMais auto] Alguns contatos falharam:", resultado.erros);
        }
    } catch (erro) {
        console.error("[SacMais auto] Falha na sincronização:", erro.message);
    } finally {
        executando = false;
        agendar(cfg.intervaloMs);
    }
}

async function iniciar() {
    const cfg = configuracao();

    if (!cfg.ativo) {
        console.log("[SacMais auto] Desativada por configuração.");
        return;
    }

    if (!process.env.SACMAIS_API_TOKEN) {
        console.warn("[SacMais auto] Desativada: SACMAIS_API_TOKEN não configurado.");
        return;
    }

    if (!Number.isInteger(cfg.empresaId) || cfg.empresaId <= 0) {
        console.warn("[SacMais auto] Desativada: SACMAIS_AUTO_SYNC_EMPRESA_ID inválido.");
        return;
    }

    const empresa = await prisma.empresa.findFirst({
        where: {
            id: cfg.empresaId,
            ativa: true
        },
        select: {
            id: true,
            razaoSocial: true,
            nomeFantasia: true
        }
    });

    if (!empresa) {
        console.warn(
            `[SacMais auto] Desativada: empresa ${cfg.empresaId} não encontrada ou inativa.`
        );
        return;
    }

    console.log(
        `[SacMais auto] Ativa para ${empresa.nomeFantasia || empresa.razaoSocial} ` +
        `(empresa ${empresa.id}) a cada ${cfg.intervaloMs / 1000}s.`
    );

    agendar(1500);
}

function parar() {
    if (timer) clearTimeout(timer);
    timer = null;
}

module.exports = {
    iniciar,
    parar
};
