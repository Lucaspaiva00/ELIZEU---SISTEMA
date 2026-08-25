const crypto = require("crypto");

const BASE_URL = (process.env.SACMAIS_API_URL || "https://api1.sacmais.com.br/api").replace(/\/$/, "");
const ARQUIVO_TTL_MS = 60 * 60 * 1000;
const arquivosTemporarios = new Map();

function texto(valor) {
    if (valor === undefined || valor === null) return "";
    return String(valor).trim();
}

function somenteDigitos(valor) {
    return texto(valor).replace(/\D/g, "");
}

function normalizarNumeroWhatsApp(valor) {
    let digitos = somenteDigitos(valor);

    while (digitos.startsWith("0")) {
        digitos = digitos.slice(1);
    }

    if (digitos.length === 10 || digitos.length === 11) {
        return `55${digitos}`;
    }

    return digitos;
}

function limparArquivosExpirados() {
    const agora = Date.now();

    for (const [token, arquivo] of arquivosTemporarios.entries()) {
        if (arquivo.expiraEm <= agora) {
            arquivosTemporarios.delete(token);
        }
    }
}

function registrarArquivoTemporario(buffer, nomeArquivo, contentType = "application/pdf") {
    limparArquivosExpirados();

    const token = crypto.randomBytes(32).toString("hex");
    const arquivo = {
        buffer,
        nomeArquivo: texto(nomeArquivo) || "orcamento.pdf",
        contentType,
        criadoEm: new Date(),
        expiraEm: Date.now() + ARQUIVO_TTL_MS
    };

    arquivosTemporarios.set(token, arquivo);
    return token;
}

function obterArquivoTemporario(token) {
    limparArquivosExpirados();

    const arquivo = arquivosTemporarios.get(texto(token));
    if (!arquivo || arquivo.expiraEm <= Date.now()) {
        if (arquivo) arquivosTemporarios.delete(texto(token));
        return null;
    }

    return arquivo;
}

function expandirPath(path, { numero, contatoId }) {
    return String(path || "")
        .replaceAll("{contactNumber}", encodeURIComponent(numero))
        .replaceAll("{number}", encodeURIComponent(numero))
        .replaceAll("{phone}", encodeURIComponent(numero))
        .replaceAll("{contactId}", encodeURIComponent(contatoId || numero));
}

function caminhosEnvio({ numero, contatoId }) {
    const configurado = texto(process.env.SACMAIS_SEND_MESSAGE_PATH);
    const refs = [...new Set([contatoId, numero].map(texto).filter(Boolean))];
    const caminhos = [];

    if (configurado) {
        caminhos.push(expandirPath(configurado, { numero, contatoId }));
    }

    // O endpoint exato pode variar entre versões/contas do SacMais.
    // A integração prioriza os formatos REST mais compatíveis com a API atual
    // (/contacts e /tickets) e permite travar o caminho via variável de ambiente.
    caminhos.push(
        "/messages",
        "/messages/send",
        "/message/send",
        "/send-message",
        "/send_message"
    );

    for (const ref of refs) {
        const valor = encodeURIComponent(ref);
        caminhos.push(
            `/contacts/${valor}/messages`,
            `/contacts/${valor}/message`,
            `/contacts/${valor}/send-message`,
            `/contacts/${valor}/send_message`
        );
    }

    return [...new Set(caminhos)];
}

function payloadsDocumento({ numero, contatoId, urlArquivo, nomeArquivo, mensagem }) {
    const baseCompleta = {
        contactNumber: numero,
        contact_number: numero,
        contactId: contatoId || undefined,
        number: numero,
        phone: numero,
        to: numero,
        type: "file",
        value: urlArquivo,
        url: urlArquivo,
        file: urlArquivo,
        fileUrl: urlArquivo,
        mediaUrl: urlArquivo,
        filename: nomeArquivo,
        fileName: nomeArquivo,
        caption: mensagem,
        message: mensagem
    };

    return [
        baseCompleta,
        {
            contactNumber: numero,
            type: "file",
            value: urlArquivo,
            filename: nomeArquivo,
            caption: mensagem
        },
        {
            number: numero,
            type: "file",
            value: urlArquivo,
            filename: nomeArquivo,
            caption: mensagem
        },
        {
            phone: numero,
            type: "file",
            value: urlArquivo,
            filename: nomeArquivo,
            caption: mensagem
        },
        {
            to: numero,
            type: "file",
            value: urlArquivo,
            filename: nomeArquivo,
            caption: mensagem
        },
        {
            contactNumber: numero,
            type: "document",
            url: urlArquivo,
            filename: nomeArquivo,
            caption: mensagem
        },
        {
            number: numero,
            type: "document",
            url: urlArquivo,
            filename: nomeArquivo,
            caption: mensagem
        },
        {
            contactId: contatoId || numero,
            contactNumber: numero,
            message: {
                type: "file",
                value: urlArquivo,
                url: urlArquivo,
                filename: nomeArquivo,
                caption: mensagem
            }
        },
        {
            number: numero,
            media: {
                type: "document",
                url: urlArquivo,
                filename: nomeArquivo
            },
            caption: mensagem
        }
    ];
}

async function requisicaoSacMais(path, body) {
    const token = process.env.SACMAIS_API_TOKEN;

    if (!token) {
        const erro = new Error("SACMAIS_API_TOKEN não configurado na API do ERP.");
        erro.codigo = "SACMAIS_TOKEN_AUSENTE";
        throw erro;
    }

    let resposta;

    try {
        resposta = await fetch(`${BASE_URL}${path}`, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                x_token: token
            },
            body: JSON.stringify(body)
        });
    } catch (erro) {
        const falha = new Error(`Não foi possível conectar à API do SacMais: ${erro.message}`);
        falha.codigo = "SACMAIS_CONEXAO";
        throw falha;
    }

    const respostaTexto = await resposta.text();
    let dados = null;

    try {
        dados = respostaTexto ? JSON.parse(respostaTexto) : null;
    } catch {
        dados = respostaTexto || null;
    }

    return {
        ok: resposta.ok && dados?.sucesso !== false && dados?.success !== false,
        status: resposta.status,
        dados,
        path
    };
}

function detalheErro(resultado) {
    const corpo = resultado?.dados;

    if (typeof corpo === "string") {
        return corpo.slice(0, 300);
    }

    if (corpo && typeof corpo === "object") {
        return texto(
            corpo.mensagem ||
            corpo.message ||
            corpo.error ||
            corpo.detail ||
            JSON.stringify(corpo)
        ).slice(0, 300);
    }

    return `HTTP ${resultado?.status || "?"}`;
}

async function enviarDocumento({ telefone, contatoId, urlArquivo, nomeArquivo, mensagem }) {
    const numero = normalizarNumeroWhatsApp(telefone);

    if (!numero || numero.length < 12) {
        throw new Error("O cliente não possui um número de WhatsApp válido.");
    }

    if (!texto(urlArquivo)) {
        throw new Error("URL do PDF não informada para envio ao SacMais.");
    }

    const caminhos = caminhosEnvio({ numero, contatoId });
    const payloads = payloadsDocumento({
        numero,
        contatoId: texto(contatoId),
        urlArquivo,
        nomeArquivo,
        mensagem: texto(mensagem)
    });

    const tentativas = [];

    for (const path of caminhos) {
        for (const payload of payloads) {
            const resultado = await requisicaoSacMais(path, payload);

            if (resultado.ok) {
                return {
                    sucesso: true,
                    numero,
                    pathUsado: path,
                    resposta: resultado.dados
                };
            }

            if (resultado.status === 401 || resultado.status === 403) {
                const erro = new Error(`SacMais recusou a autenticação (${resultado.status}). Confira o token da API.`);
                erro.codigo = "SACMAIS_NAO_AUTORIZADO";
                throw erro;
            }

            tentativas.push({
                path,
                status: resultado.status,
                detalhe: detalheErro(resultado)
            });

            // Se a rota não existe, não vale testar os demais formatos de body nela.
            if (resultado.status === 404 || resultado.status === 405) {
                break;
            }
        }
    }

    const ultimas = tentativas
        .slice(-5)
        .map((item) => `${item.path} -> ${item.status}: ${item.detalhe}`)
        .join(" | ");

    const erro = new Error(
        "A API do SacMais não aceitou o envio do PDF com os formatos disponíveis. " +
        "Se a conta usar um endpoint específico, configure SACMAIS_SEND_MESSAGE_PATH no Render conforme o Swagger do SacMais." +
        (ultimas ? ` Diagnóstico: ${ultimas}` : "")
    );
    erro.codigo = "SACMAIS_ENVIO_NAO_IDENTIFICADO";
    throw erro;
}

module.exports = {
    normalizarNumeroWhatsApp,
    registrarArquivoTemporario,
    obterArquivoTemporario,
    enviarDocumento
};
