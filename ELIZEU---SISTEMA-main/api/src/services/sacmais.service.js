const prisma = require("../config/prisma");

const BASE_URL = (process.env.SACMAIS_API_URL || "https://api1.sacmais.com.br").replace(/\/$/, "");
const CLIENTES_PATH = process.env.SACMAIS_CLIENTES_PATH || "/api/contacts";

function normalizar(valor) {
    if (valor === undefined || valor === null) return null;
    return String(valor).trim();
}

function primeiro(...valores) {
    return valores.find(v => v !== undefined && v !== null && String(v).trim() !== "");
}

function mapearContato(contato) {
    const dados = contato?.data || contato?.contact || contato?.usuario || contato || {};

    const id = primeiro(dados.id, dados._id, dados.contactId, dados.contact_id, dados.uuid);
    const nome = primeiro(dados.nome, dados.name, dados.full_name, dados.fullName, dados.nomeCompleto);
    const telefone = primeiro(dados.celular, dados.mobile, dados.phone, dados.telefone, dados.whatsapp);
    const email = primeiro(dados.email, dados.mail);
    const cpfCnpjBruto = primeiro(dados.cpfCnpj, dados.cpf_cnpj, dados.cpf, dados.cnpj, dados.documento);
    const cpfCnpj = cpfCnpjBruto ? String(cpfCnpjBruto).replace(/\D/g, "") : null;

    if (!nome) return null;

    return {
        sacmaisId: id ? String(id) : null,
        nome: String(nome),
        cpfCnpj: normalizar(cpfCnpj) || (id ? `SACMAIS-${id}` : null),
        telefone: normalizar(telefone),
        celular: normalizar(telefone),
        email: normalizar(email),
        tipoPessoa: cpfCnpj?.length === 14 ? "JURIDICA" : "FISICA",
        nomeFantasia: normalizar(primeiro(dados.nomeFantasia, dados.nome_fantasia)),
        cep: normalizar(primeiro(dados.cep, dados.zipcode)),
        endereco: normalizar(primeiro(dados.endereco, dados.address, dados.logradouro)),
        numero: normalizar(dados.numero),
        complemento: normalizar(dados.complemento),
        bairro: normalizar(dados.bairro),
        cidade: normalizar(primeiro(dados.cidade, dados.city)),
        estado: normalizar(primeiro(dados.estado, dados.uf, dados.state))?.toUpperCase(),
        observacoes: normalizar(primeiro(dados.observacoes, dados.notes)),
        ativo: dados.ativo !== false && dados.active !== false
    };
}

async function requisicao(path, options = {}) {
    const token = process.env.SACMAIS_API_TOKEN;
    if (!token) throw new Error("SACMAIS_API_TOKEN não configurado.");

    const resposta = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
            "X-API-Key": token,
            ...(options.headers || {})
        }
    });

    const texto = await resposta.text();
    let body = null;
    try { body = texto ? JSON.parse(texto) : null; } catch { body = texto; }

    if (!resposta.ok) {
        throw new Error(`SacMais ${resposta.status}: ${typeof body === "string" ? body : JSON.stringify(body)}`);
    }

    return body;
}

function extrairLista(payload) {
    if (Array.isArray(payload)) return payload;
    return payload?.data || payload?.contacts || payload?.contatos || payload?.results || payload?.items || [];
}

async function importarClientes(empresaId) {
    const payload = await requisicao(CLIENTES_PATH);
    const contatos = extrairLista(payload);
    let importados = 0;
    let atualizados = 0;

    for (const contato of contatos) {
        const dados = mapearContato(contato);
        if (!dados?.cpfCnpj) continue;

        const existente = await prisma.cliente.findFirst({
            where: {
                empresaId,
                OR: [
                    ...(dados.sacmaisId ? [{ sacmaisId: dados.sacmaisId }] : []),
                    { cpfCnpj: dados.cpfCnpj }
                ]
            }
        });

        if (existente) {
            await prisma.cliente.update({
                where: { id: existente.id },
                data: { ...dados, sincronizadoSacMaisEm: new Date(), origemCadastro: "SACMAIS" }
            });
            atualizados++;
        } else {
            await prisma.cliente.create({
                data: { ...dados, empresaId, sincronizadoSacMaisEm: new Date(), origemCadastro: "SACMAIS" }
            });
            importados++;
        }
    }

    return { totalRecebidos: contatos.length, importados, atualizados };
}

async function receberWebhook(empresaId, payload) {
    const dados = mapearContato(payload);
    if (!dados?.cpfCnpj) throw new Error("Payload SacMais sem nome e identificador (CPF/CNPJ ou ID).");

    const existente = await prisma.cliente.findFirst({
        where: {
            empresaId,
            OR: [
                ...(dados.sacmaisId ? [{ sacmaisId: dados.sacmaisId }] : []),
                { cpfCnpj: dados.cpfCnpj }
            ]
        }
    });

    if (existente) {
        return prisma.cliente.update({
            where: { id: existente.id },
            data: { ...dados, sincronizadoSacMaisEm: new Date(), origemCadastro: "SACMAIS" }
        });
    }

    return prisma.cliente.create({
        data: { ...dados, empresaId, sincronizadoSacMaisEm: new Date(), origemCadastro: "SACMAIS" }
    });
}

module.exports = { importarClientes, receberWebhook };
