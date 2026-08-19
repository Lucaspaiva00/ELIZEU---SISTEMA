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
    // Ao cadastrar uma URL em POST /webhooks, o SacMais faz uma chamada de
    // validação/handshake para conferir se o endpoint está acessível. Essa
    // chamada não necessariamente contém um contato. Ela deve receber HTTP 200
    // e NÃO deve ser tratada como cadastro de cliente.
    if (!payload || typeof payload !== "object") {
        return {
            validacao: true,
            processado: false,
            motivo: "Handshake do webhook recebido sem payload de contato."
        };
    }

    const evento = texto(payload.event);
    const contato = payload?.data?.contact || payload?.contact || null;

    // Sem evento de contacts ou sem objeto contact = validação/health-check.
    // Respondemos sucesso para permitir que o SacMais aceite a URL.
    if (!evento || evento !== "contacts" || !contato || typeof contato !== "object") {
        return {
            validacao: true,
            processado: false,
            evento: evento || null,
            motivo: "Webhook validado; nenhum contato para processar."
        };
    }

    const action = String(payload?.action || "update").toLowerCase();

    if (action === "delete" || action === "remove") {
        const dados = mapearContato(payload);
        const existente = await localizarCliente(empresaId, dados);

        if (!existente) {
            return { ignorado: true, processado: false, motivo: "Contato excluído não existe no ERP." };
        }

        const cliente = await prisma.cliente.update({
            where: { id: existente.id },
            data: {
                ativo: false,
                origemCadastro: "SACMAIS",
                sincronizadoSacMaisEm: new Date()
            }
        });

        return { acao: "inativado", processado: true, cliente };
    }

    const resultado = await salvarContato(empresaId, payload);
    return { ...resultado, processado: true };
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


function extrairArrayTickets(payload) {
    if (Array.isArray(payload)) return payload;

    const candidatos = [
        payload?.tickets,
        payload?.items,
        payload?.results,
        payload?.rows,
        payload?.data?.tickets,
        payload?.data?.items,
        payload?.data?.results,
        payload?.data?.rows,
        Array.isArray(payload?.data) ? payload.data : null
    ];

    return candidatos.find(Array.isArray) || [];
}

function limparNumeroContato(valor) {
    const bruto = texto(valor);
    if (!bruto) return null;

    // Alguns sistemas retornam JID do WhatsApp (5511999999999@s.whatsapp.net).
    const semJid = bruto.split("@")[0];
    const digitos = semJid.replace(/\D/g, "");
    return digitos.length >= 8 ? digitos : null;
}

function numeroContatoDoTicket(ticket) {
    const candidatos = [
        ticket?.contactNumber,
        ticket?.contact_number,
        ticket?.contact?.number,
        ticket?.contact?.contactNumber,
        ticket?.contact?.phone,
        ticket?.contact?.telefone,
        ticket?.customer?.number,
        ticket?.customer?.phone,
        ticket?.client?.number,
        ticket?.client?.phone,
        ticket?.number,
        ticket?.phone,
        ticket?.telefone,
        ticket?.whatsapp,
        ticket?.remoteJid,
        ticket?.remote_jid
    ];

    for (const candidato of candidatos) {
        const numero = limparNumeroContato(candidato);
        if (numero) return numero;
    }

    return null;
}

function infoPaginacao(payload) {
    const p = payload?.pagination || payload?.meta || payload?.data?.pagination || payload?.data?.meta || {};

    const paginaAtual = Number(
        primeiro(p.page, p.currentPage, p.current_page, payload?.page, payload?.currentPage)
    ) || null;

    const totalPaginas = Number(
        primeiro(p.totalPages, p.total_pages, p.lastPage, p.last_page, payload?.totalPages)
    ) || null;

    const temProximaExplicita = primeiro(
        p.hasNext,
        p.has_next,
        p.hasNextPage,
        p.has_next_page,
        payload?.hasNext
    );

    return {
        paginaAtual,
        totalPaginas,
        temProximaExplicita: typeof temProximaExplicita === "boolean" ? temProximaExplicita : null
    };
}

function caminhosTickets(pagina, limite) {
    const offset = (pagina - 1) * limite;

    // O Swagger documenta GET /tickets com paginação e filtros. As variações
    // abaixo tornam a integração tolerante ao nome exato usado pelos parâmetros.
    return [
        `/tickets?page=${pagina}&limit=${limite}`,
        `/tickets?page=${pagina}&perPage=${limite}`,
        `/tickets?page=${pagina}&pageSize=${limite}`,
        `/tickets?pagina=${pagina}&limite=${limite}`,
        `/tickets?offset=${offset}&limit=${limite}`
    ];
}

async function buscarPaginaTickets(pagina = 1, limite = 50) {
    let ultimoErro = null;

    for (const path of caminhosTickets(pagina, limite)) {
        try {
            const payload = await requisicaoSacMais(path, { method: "GET" });
            const tickets = extrairArrayTickets(payload);

            // Uma resposta HTTP 200 é suficiente para fixarmos a estratégia.
            return { payload, tickets, path };
        } catch (erro) {
            ultimoErro = erro;
        }
    }

    throw ultimoErro || new Error("Não foi possível listar tickets no SacMais.");
}

async function processarEmLotes(itens, tamanho, fn) {
    const resultados = [];
    for (let i = 0; i < itens.length; i += tamanho) {
        const lote = itens.slice(i, i + tamanho);
        const parciais = await Promise.all(lote.map(fn));
        resultados.push(...parciais);
    }
    return resultados;
}

async function importarHistoricoPagina(empresaId, pagina = 1, limite = 50) {
    const paginaNum = Math.max(1, Number(pagina) || 1);
    const limiteNum = Math.min(100, Math.max(1, Number(limite) || 50));

    const { payload, tickets, path } = await buscarPaginaTickets(paginaNum, limiteNum);

    const numeros = [...new Set(
        tickets.map(numeroContatoDoTicket).filter(Boolean)
    )];

    let criados = 0;
    let atualizados = 0;
    let ignorados = 0;
    const erros = [];

    await processarEmLotes(numeros, 6, async (numero) => {
        try {
            const contato = await buscarContatoPorNumero(numero);
            const resultado = await salvarContato(empresaId, contato);

            if (resultado.acao === "criado") criados++;
            else if (resultado.acao === "atualizado") atualizados++;
        } catch (erro) {
            ignorados++;
            erros.push({ numero, erro: erro.message });
        }
    });

    const paginacao = infoPaginacao(payload);
    let temProximaPagina;

    if (paginacao.temProximaExplicita !== null) {
        temProximaPagina = paginacao.temProximaExplicita;
    } else if (paginacao.totalPaginas) {
        temProximaPagina = paginaNum < paginacao.totalPaginas;
    } else {
        temProximaPagina = tickets.length >= limiteNum;
    }

    const assinatura = tickets
        .slice(0, 10)
        .map((ticket) => primeiro(ticket?.id, ticket?.uuid, ticket?.ticketId, numeroContatoDoTicket(ticket)))
        .filter(Boolean)
        .join("|");

    return {
        pagina: paginaNum,
        limite: limiteNum,
        endpointUsado: path,
        ticketsRecebidos: tickets.length,
        contatosEncontrados: numeros.length,
        criados,
        atualizados,
        ignorados,
        erros: erros.slice(0, 10),
        temProximaPagina,
        assinatura
    };
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
    importarHistoricoPagina,
    validarWebhook,
    mapearContato
};
