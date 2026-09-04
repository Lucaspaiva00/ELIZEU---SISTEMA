const focusRepository = require("../repositories/focusNfe.repository");
const { criptografarSegredo, descriptografarSegredo } = require("../utils/segredoCrypto");

const URLS = {
    HOMOLOGACAO: "https://homologacao.focusnfe.com.br",
    PRODUCAO: "https://api.focusnfe.com.br"
};

function tokenConfigurado(registro, ambiente) {
    return ambiente === "PRODUCAO"
        ? Boolean(registro?.tokenProducaoCriptografado)
        : Boolean(registro?.tokenHomologacaoCriptografado);
}

function extrairToken(registro, ambiente) {
    if (!registro) return null;

    if (ambiente === "PRODUCAO") {
        return descriptografarSegredo(
            registro.tokenProducaoCriptografado,
            registro.tokenProducaoIv,
            registro.tokenProducaoAuthTag
        );
    }

    return descriptografarSegredo(
        registro.tokenHomologacaoCriptografado,
        registro.tokenHomologacaoIv,
        registro.tokenHomologacaoAuthTag
    );
}

function authHeader(token) {
    return `Basic ${Buffer.from(`${token}:`).toString("base64")}`;
}

async function requisicao(url, token, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
        const resposta = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
                Authorization: authHeader(token),
                "Content-Type": "application/json",
                Accept: "application/json",
                ...(options.headers || {})
            }
        });

        const texto = await resposta.text();
        let dados = {};
        try { dados = texto ? JSON.parse(texto) : {}; } catch { dados = { mensagem: texto }; }

        return { httpStatus: resposta.status, ok: resposta.ok, dados };
    } catch (erro) {
        if (erro.name === "AbortError") {
            throw new Error("A Focus NFe não respondeu dentro do tempo esperado.");
        }
        throw new Error(`Falha de comunicação com a Focus NFe: ${erro.message}`);
    } finally {
        clearTimeout(timeout);
    }
}

class FocusNfeService {
    async obterConfiguracao(empresaId) {
        const registro = await focusRepository.buscar(empresaId);
        return {
            ativo: registro?.ativo ?? true,
            homologacaoConfigurada: tokenConfigurado(registro, "HOMOLOGACAO"),
            producaoConfigurada: tokenConfigurado(registro, "PRODUCAO"),
            ultimaValidacaoHomologacao: registro?.ultimaValidacaoHomologacao || null,
            ultimaValidacaoProducao: registro?.ultimaValidacaoProducao || null
        };
    }

    async salvarConfiguracao(empresaId, dados) {
        const atual = await focusRepository.buscar(empresaId);
        const alteracoes = { ativo: dados.ativo !== false };

        const homolog = String(dados.tokenHomologacao || "").trim();
        if (homolog) {
            const protegido = criptografarSegredo(homolog);
            alteracoes.tokenHomologacaoCriptografado = protegido.criptografado;
            alteracoes.tokenHomologacaoIv = protegido.iv;
            alteracoes.tokenHomologacaoAuthTag = protegido.authTag;
            alteracoes.ultimaValidacaoHomologacao = null;
        } else if (dados.removerTokenHomologacao) {
            alteracoes.tokenHomologacaoCriptografado = null;
            alteracoes.tokenHomologacaoIv = null;
            alteracoes.tokenHomologacaoAuthTag = null;
            alteracoes.ultimaValidacaoHomologacao = null;
        }

        const producao = String(dados.tokenProducao || "").trim();
        if (producao) {
            const protegido = criptografarSegredo(producao);
            alteracoes.tokenProducaoCriptografado = protegido.criptografado;
            alteracoes.tokenProducaoIv = protegido.iv;
            alteracoes.tokenProducaoAuthTag = protegido.authTag;
            alteracoes.ultimaValidacaoProducao = null;
        } else if (dados.removerTokenProducao) {
            alteracoes.tokenProducaoCriptografado = null;
            alteracoes.tokenProducaoIv = null;
            alteracoes.tokenProducaoAuthTag = null;
            alteracoes.ultimaValidacaoProducao = null;
        }

        if (!atual && !homolog && !producao) {
            await focusRepository.salvar(empresaId, alteracoes);
        } else {
            await focusRepository.salvar(empresaId, alteracoes);
        }

        return this.obterConfiguracao(empresaId);
    }

    async obterAcesso(empresaId, ambiente) {
        const registro = await focusRepository.buscar(empresaId);
        if (!registro?.ativo) {
            throw new Error("A integração Focus NFe está desativada.");
        }

        const token = extrairToken(registro, ambiente);
        if (!token) {
            throw new Error(`Token Focus NFe de ${ambiente === "PRODUCAO" ? "produção" : "homologação"} não configurado.`);
        }

        return { token, baseUrl: URLS[ambiente] || URLS.HOMOLOGACAO };
    }

    async testar(empresaId, ambiente) {
        if (!["HOMOLOGACAO", "PRODUCAO"].includes(ambiente)) {
            throw new Error("Ambiente Focus NFe inválido.");
        }

        const { token, baseUrl } = await this.obterAcesso(empresaId, ambiente);
        const refTeste = `elian-sigs-validacao-${empresaId}`;
        const resultado = await requisicao(
            `${baseUrl}/v2/nfe/${encodeURIComponent(refTeste)}?completa=1`,
            token,
            { method: "GET" }
        );

        if ([401, 403].includes(resultado.httpStatus)) {
            throw new Error("Token recusado pela Focus NFe. Confira o token deste ambiente.");
        }

        if (resultado.httpStatus >= 500) {
            throw new Error("A Focus NFe recebeu a autenticação, mas o serviço está indisponível no momento. Tente novamente em alguns minutos.");
        }

        // Uma referência inexistente pode retornar 404/422. Isso ainda comprova que a autenticação passou.
        await focusRepository.registrarValidacao(empresaId, ambiente);

        return {
            sucesso: true,
            ambiente,
            httpStatus: resultado.httpStatus,
            mensagem: "Token aceito pela Focus NFe. A autenticação deste ambiente está funcionando."
        };
    }

    async emitir(empresaId, ambiente, referencia, payload) {
        const { token, baseUrl } = await this.obterAcesso(empresaId, ambiente);
        return requisicao(
            `${baseUrl}/v2/nfe?ref=${encodeURIComponent(referencia)}`,
            token,
            { method: "POST", body: JSON.stringify(payload) }
        );
    }

    async consultar(empresaId, ambiente, referencia) {
        const { token, baseUrl } = await this.obterAcesso(empresaId, ambiente);
        return requisicao(
            `${baseUrl}/v2/nfe/${encodeURIComponent(referencia)}?completa=1`,
            token,
            { method: "GET" }
        );
    }

    async cancelar(empresaId, ambiente, referencia, justificativa) {
        const { token, baseUrl } = await this.obterAcesso(empresaId, ambiente);
        return requisicao(
            `${baseUrl}/v2/nfe/${encodeURIComponent(referencia)}`,
            token,
            { method: "DELETE", body: JSON.stringify({ justificativa }) }
        );
    }

    urlRecurso(ambiente, caminho) {
        if (!caminho) return null;
        if (/^https?:\/\//i.test(caminho)) return caminho;
        const baseUrl = URLS[ambiente] || URLS.HOMOLOGACAO;
        return `${baseUrl}${caminho.startsWith("/") ? "" : "/"}${caminho}`;
    }
}

module.exports = new FocusNfeService();
