const prisma = require("../config/prisma");

const BASE_URL = (process.env.SACMAIS_API_URL || "https://api1.sacmais.com.br/api").replace(/\/$/, "");

function texto(valor) {
    if (valor === undefined || valor === null) return null;
    const normalizado = String(valor).trim();
    return normalizado || null;
}

function somenteDigitos(valor) {
    const normalizado = texto(valor);
    return normalizado ? normalizado.replace(/\D/g, "") : null;
}

function chaveCampo(valor) {
    return String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
}

function mapearCamposExtras(lista = []) {
    const mapa = {};
    for (const item of Array.isArray(lista) ? lista : []) {
        const chave = chaveCampo(item?.name);
        if (chave) mapa[chave] = texto(item?.value);
    }
    return mapa;
}

function primeiro(...valores) {
    return valores.find((valor) => texto(valor));
}

function contatoDoPayload(payload) {
    if (payload?.data?.contact) return payload.data.contact;
    if (payload?.contact) return payload.contact;
    if (payload?.data && !payload?.data?.contact) return payload.data;
    return payload || {};
}

function mapearContato(payload) {
    const contato = contatoDoPayload(payload);
    const adicionais = mapearCamposExtras(contato.additionalFields);
    const extras = mapearCamposExtras(contato.extraInfo);

    const nome = primeiro(
        contato.name,
        adicionais.nome_,
        adicionais.nome,
        extras.nome
    );

    const telefoneBruto = primeiro(
        contato.number,
        adicionais.telefone,
        contato.phone,
        contato.telefone
    );
    const telefone = texto(telefoneBruto);
    const telefoneId = somenteDigitos(telefoneBruto);

    const documentoBruto = primeiro(
        contato.document,
        adicionais.cpf_cnpj,
        adicionais.cpfcnpj,
        adicionais.cpf,
        adicionais.cnpj,
        contato.documento,
        contato.cpfCnpj
    );
    const documento = somenteDigitos(documentoBruto);

    if (!nome) {
        throw new Error("Contato SacMais sem nome.");
    }

    if (!documento && !telefoneId) {
        throw new Error("Contato SacMais sem CPF/CNPJ e sem telefone.");
    }

    const tags = Array.isArray(contato.tags)
        ? contato.tags.map((tag) => texto(tag?.name)).filter(Boolean)
        : [];

    const observacoes = [];
    if (tags.length) observacoes.push(`Tags SacMais: ${tags.join(", ")}`);
    if (adicionais.valor_r) observacoes.push(`Valor R$: ${adicionais.valor_r}`);
    if (adicionais.duracao_da_conexao) {
        observacoes.push(`Duração da conexão: ${adicionais.duracao_da_conexao}`);
    }

    return {
        // A própria API identifica o contato pelo contactNumber. Usamos o telefone
        // normalizado como identificador externo estável quando não existe ID explícito.
        sacmaisId: texto(primeiro(contato.id, contato.uuid, telefoneId)),
        nome: texto(nome),
        cpfCnpj: documento || `SACMAIS-${telefoneId}`,
        telefone,
        celular: telefone,
        email: texto(contato.email),
        tipoPessoa: documento?.length === 14 ? "JURIDICA" : "FISICA",
        cep: texto(primeiro(adicionais.cep, contato.cep)),
        endereco: texto(primeiro(adicionais.endereco, contato.endereco, contato.address)),
        cidade: texto(primeiro(adicionais.cidade, contato.cidade, contato.city)),
        estado: texto(primeiro(adicionais.estado, adicionais.uf, contato.estado, contato.uf))?.toUpperCase(),
        observacoes: observacoes.length ? observacoes.join(" | ") : null,
        ativo: true
    };
}

async function requisicaoSacMais(path, options = {}) {
    const token = process.env.SACMAIS_API_TOKEN;
    if (!token) {
        throw new Error("SACMAIS_API_TOKEN não configurado na API do ERP.");
    }

    const resposta = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            x_token: token,
            ...(options.headers || {})
        }
    });

    const textoResposta = await resposta.text();
    let body = null;

    try {
        body = textoResposta ? JSON.parse(textoResposta) : null;
    } catch {
        body = textoResposta;
    }

    if (!resposta.ok) {
        const detalhe = typeof body === "string" ? body : JSON.stringify(body);
        throw new Error(`SacMais ${resposta.status}: ${detalhe || "erro sem corpo"}`);
    }

    return body;
}

async function localizarCliente(empresaId, dados) {
    const ors = [];

    if (dados.sacmaisId) ors.push({ sacmaisId: dados.sacmaisId });
    if (dados.cpfCnpj) ors.push({ cpfCnpj: dados.cpfCnpj });

    const telefoneDigitos = somenteDigitos(dados.telefone);
    if (telefoneDigitos) {
        // Telefones antigos podem estar formatados. A busca por igualdade cobre a maioria
        // dos registros já sincronizados e o sacmaisId cobre os novos.
        ors.push({ telefone: dados.telefone });
        ors.push({ celular: dados.celular });
    }

    if (!ors.length) return null;

    return prisma.cliente.findFirst({
        where: {
            empresaId,
            OR: ors
        }
    });
}

async function salvarContato(empresaId, payload) {
    const dados = mapearContato(payload);
    const existente = await localizarCliente(empresaId, dados);

    const data = {
        ...dados,
        origemCadastro: "SACMAIS",
        sincronizadoSacMaisEm: new Date()
    };

    if (existente) {
        return {
            acao: "atualizado",
            cliente: await prisma.cliente.update({
                where: { id: existente.id },
                data
            })
        };
    }

    return {
        acao: "criado",
        cliente: await prisma.cliente.create({
            data: {
                ...data,
                empresaId
            }
        })
    };
}

async function receberWebhook(empresaId, payload) {
    if (payload?.event && payload.event !== "contacts") {
        return { ignorado: true, motivo: `Evento ${payload.event} ignorado.` };
    }

    const action = String(payload?.action || "update").toLowerCase();

    if (action === "delete" || action === "remove") {
        const dados = mapearContato(payload);
        const existente = await localizarCliente(empresaId, dados);

        if (!existente) {
            return { ignorado: true, motivo: "Contato excluído não existe no ERP." };
        }

        const cliente = await prisma.cliente.update({
            where: { id: existente.id },
            data: {
                ativo: false,
                origemCadastro: "SACMAIS",
                sincronizadoSacMaisEm: new Date()
            }
        });

        return { acao: "inativado", cliente };
    }

    return salvarContato(empresaId, payload);
}

async function buscarContatoPorNumero(contactNumber) {
    if (!texto(contactNumber)) {
        throw new Error("Número do contato não informado.");
    }

    return requisicaoSacMais(`/contacts/${encodeURIComponent(contactNumber)}`, {
        method: "GET"
    });
}

async function importarContatoPorNumero(empresaId, contactNumber) {
    const payload = await buscarContatoPorNumero(contactNumber);
    return salvarContato(empresaId, payload);
}

function tokenWebhookRecebido(req) {
    const authorization = texto(req.headers.authorization);
    const bearer = authorization?.toLowerCase().startsWith("bearer ")
        ? authorization.slice(7).trim()
        : null;

    return primeiro(
        req.headers["x-sacmais-token"],
        req.headers["x-webhook-token"],
        req.headers["x-token"],
        req.headers["token"],
        bearer,
        req.query?.token,
        req.body?.token
    );
}

function validarWebhook(req) {
    const secret = texto(process.env.SACMAIS_WEBHOOK_SECRET);
    if (!secret) return true;
    return tokenWebhookRecebido(req) === secret;
}

module.exports = {
    receberWebhook,
    buscarContatoPorNumero,
    importarContatoPorNumero,
    validarWebhook,
    mapearContato
};
