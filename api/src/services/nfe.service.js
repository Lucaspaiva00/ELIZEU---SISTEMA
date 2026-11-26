const { montarNfe, montarNfeHomologacao } = require("./nfeXmlGo");
const { createHash } = require("node:crypto");
const sefazGoService = require("./sefazGo.service");
const nfeRepository = require("../repositories/nfe.repository");
const classificacaoRtc = require('../utils/classificacaoRtc');

function texto(valor) { return String(valor ?? "").trim(); }
function somenteDigitos(valor) { return texto(valor).replace(/\D/g, ""); }
function numero(valor) { return Number(valor || 0); }
function adicionarPendencia(lista, condicao, mensagem, destino) {
    if (condicao) lista.push({ mensagem, destino });
}

function codigoNumericoNfe(venda, numero) {
    const sequencias = new Set(["01234567", "12345678", "23456789", "34567890", "45678901", "56789012", "67890123", "78901234", "89012345", "90123456"]);
    const hash = createHash("sha256").update(`homologacao|${venda.empresaId}|${venda.id}`).digest();
    let valor = hash.readUInt32BE() % 90000000 + 10000000;
    while (valor === Number(numero) || /^(\d)\1{7}$/.test(String(valor)) || sequencias.has(String(valor))) {
        valor = valor === 99999999 ? 10000000 : valor + 1;
    }
    return String(valor);
}

class NfeService {
    async validar(vendaId, empresaId, { previa = false } = {}) {
        const venda = await nfeRepository.buscarVenda(vendaId, empresaId);
        if (!venda) throw new Error("Venda não encontrada.");

        const pendencias = [];
        adicionarPendencia(pendencias, venda.status !== "FATURADA" && !(previa && venda.status === "CONFIRMADA"), "A venda precisa estar faturada antes da emissão da NF-e.", "venda");

        const empresa = venda.empresa;
        const fiscal = empresa?.configuracaoFiscal;
        const certificado = empresa?.certificadoDigital;

        adicionarPendencia(pendencias, !texto(empresa?.razaoSocial), "Razão social da empresa não informada.", "empresa");
        adicionarPendencia(pendencias, somenteDigitos(empresa?.cnpj).length !== 14, "CNPJ do emitente inválido ou não informado.", "empresa");
        adicionarPendencia(pendencias, !texto(empresa?.inscricaoEstadual), "Inscrição estadual do emitente não informada.", "empresa");
        adicionarPendencia(pendencias, somenteDigitos(empresa?.cep).length !== 8, "CEP da empresa inválido ou não informado.", "empresa");
        adicionarPendencia(pendencias, !texto(empresa?.endereco), "Endereço da empresa não informado.", "empresa");
        adicionarPendencia(pendencias, !texto(empresa?.numero), "Número do endereço da empresa não informado.", "empresa");
        adicionarPendencia(pendencias, !texto(empresa?.bairro), "Bairro da empresa não informado.", "empresa");
        adicionarPendencia(pendencias, !texto(empresa?.cidade), "Cidade da empresa não informada.", "empresa");
        adicionarPendencia(pendencias, texto(empresa?.estado).length !== 2, "UF da empresa não informada.", "empresa");

        adicionarPendencia(pendencias, !fiscal, "Configuração fiscal da empresa não cadastrada.", "fiscal");
        if (fiscal) {
            adicionarPendencia(pendencias, !previa && !fiscal.ativo, "Configuração fiscal está desativada.", "fiscal");
            adicionarPendencia(pendencias, !fiscal.regimeTributario, "Regime tributário não informado.", "fiscal");
            adicionarPendencia(pendencias, !fiscal.crt, "CRT não informado.", "fiscal");
            adicionarPendencia(pendencias, somenteDigitos(fiscal.codigoMunicipio).length !== 7, "Código IBGE do município inválido ou não informado.", "fiscal");
            adicionarPendencia(pendencias, !/^\d{4}$/.test(texto(fiscal.cfopPadrao)), "CFOP padrão inválido ou não informado.", "fiscal");
            adicionarPendencia(pendencias, !texto(fiscal.naturezaOperacao), "Natureza da operação não informada.", "fiscal");
            adicionarPendencia(pendencias, !texto(fiscal.icmsSituacaoTributariaPadrao), "CST/CSOSN padrão do ICMS não informado.", "fiscal");
            adicionarPendencia(pendencias, !texto(fiscal.pisSituacaoTributariaPadrao), "CST do PIS não informado.", "fiscal");
            adicionarPendencia(pendencias, !texto(fiscal.cofinsSituacaoTributariaPadrao), "CST da COFINS não informado.", "fiscal");
        }

        adicionarPendencia(pendencias, !certificado, "Certificado A1 não configurado no ERP.", "certificado");
        if (certificado) {
            adicionarPendencia(pendencias, !certificado.ativo, "Certificado A1 está inativo.", "certificado");
            adicionarPendencia(pendencias, certificado.validade && new Date(certificado.validade) < new Date(), "Certificado A1 está vencido.", "certificado");
        }

        const cliente = venda.cliente;
        const doc = somenteDigitos(cliente?.cpfCnpj);
        adicionarPendencia(pendencias, ![11, 14].includes(doc.length), "CPF/CNPJ do cliente inválido para emissão fiscal.", "cliente");
        adicionarPendencia(pendencias, !texto(cliente?.nome), "Nome/Razão social do cliente não informado.", "cliente");
        adicionarPendencia(pendencias, somenteDigitos(cliente?.cep).length !== 8, "CEP do destinatário inválido ou não informado.", "cliente");
        adicionarPendencia(pendencias, !texto(cliente?.endereco), "Logradouro do destinatário não informado.", "cliente");
        adicionarPendencia(pendencias, !texto(cliente?.numero), "Número do endereço do destinatário não informado.", "cliente");
        adicionarPendencia(pendencias, !texto(cliente?.bairro), "Bairro do destinatário não informado.", "cliente");
        adicionarPendencia(pendencias, !texto(cliente?.cidade), "Cidade do destinatário não informada.", "cliente");
        adicionarPendencia(pendencias, texto(cliente?.estado).length !== 2, "UF do destinatário não informada.", "cliente");

        let possuiServico = false;
        let possuiProduto = false;
        for (const item of venda.itens || []) {
            if (item.tipo === "SERVICO") {
                possuiServico = true;
                continue;
            }
            possuiProduto = true;
            const produto = item.variacaoProduto?.produto;
            adicionarPendencia(pendencias, !produto, `Produto do item "${item.descricao}" não encontrado.`, "produto");
            if (!produto) continue;
            adicionarPendencia(pendencias,
                Boolean(produto.isSituacaoTributaria || produto.isClassificacaoTributaria || produto.isAliquota != null),
                `Produto "${produto.nome}" possui Imposto Seletivo cadastrado, mas o cálculo e o envio de IS ainda não foram homologados.`, 'produto');
            adicionarPendencia(pendencias, somenteDigitos(produto.ncm).length !== 8, `Produto "${produto.nome}" está sem NCM válido.`, "produto");
            adicionarPendencia(pendencias, !/^\d{4}$/.test(texto(produto.cfopPadrao || fiscal?.cfopPadrao)), `Produto "${produto.nome}" está sem CFOP válido.`, "produto");
            adicionarPendencia(pendencias, !/^[0-8]$/.test(texto(produto.origemMercadoria)), `Produto "${produto.nome}" está sem origem da mercadoria.`, "produto");

            if (fiscal?.rtcAtivo) {
                const cstRtc = texto(produto.ibsCbsSituacaoTributaria);
                const classRtc = texto(produto.ibsCbsClassificacaoTributaria);
                const erroTabela = classificacaoRtc.validar(cstRtc, classRtc);
                adicionarPendencia(pendencias, Boolean(erroTabela), `Produto "${produto.nome}": ${erroTabela}`, 'produto');

                adicionarPendencia(pendencias, !/^\d{3}$/.test(cstRtc), `Produto "${produto.nome}" está sem CST IBS/CBS válido (3 dígitos).`, "produto");
                adicionarPendencia(pendencias, !/^\d{6}$/.test(classRtc), `Produto "${produto.nome}" está sem cClassTrib IBS/CBS válido (6 dígitos).`, "produto");
                adicionarPendencia(
                    pendencias,
                    /^\d{3}$/.test(cstRtc) && /^\d{6}$/.test(classRtc) && !classRtc.startsWith(cstRtc),
                    `Produto "${produto.nome}" possui CST IBS/CBS incompatível com o cClassTrib.`,
                    "produto"
                );
            }
        }

        if (fiscal?.rtcAtivo) {
            adicionarPendencia(pendencias, true, classificacaoRtc.BLOQUEIO_EMISSAO, 'fiscal');
            const aliquotasRtc = [
                [fiscal.cbsAliquotaPadrao, "CBS"],
                [fiscal.ibsUfAliquotaPadrao, "IBS estadual"],
                [fiscal.ibsMunAliquotaPadrao, "IBS municipal"]
            ];

            aliquotasRtc.forEach(([valor, nome]) => {
                adicionarPendencia(
                    pendencias,
                    valor === null || valor === undefined || !Number.isFinite(Number(valor)) || Number(valor) < 0,
                    `Alíquota padrão de ${nome} não configurada para a Reforma Tributária.`,
                    "fiscal"
                );
            });
        }

        adicionarPendencia(pendencias, !possuiProduto, "A venda não possui produtos para NF-e modelo 55.", "produto");
        // Venda mista é suportada: a NF-e modelo 55 considera somente os itens de PRODUTO.
        // Os itens de SERVICO são emitidos separadamente pela NFS-e.

        adicionarPendencia(pendencias, !previa && fiscal?.ambiente !== "PRODUCAO", "Selecione o ambiente de produção para emitir uma NF-e real.", "fiscal");
        return { venda, pronta: pendencias.length === 0, pendencias };
    }

    montarSnapshot(venda) {
        const empresa = venda.empresa;
        const fiscal = empresa.configuracaoFiscal;
        const cliente = venda.cliente;

        return {
            versaoInterna: 2,
            documento: { modelo: 55, ambiente: fiscal.ambiente, naturezaOperacao: fiscal.naturezaOperacao, serie: fiscal.serieNfe },
            emitente: {
                razaoSocial: empresa.razaoSocial,
                nomeFantasia: empresa.nomeFantasia,
                cnpj: somenteDigitos(empresa.cnpj),
                inscricaoEstadual: texto(empresa.inscricaoEstadual),
                telefone: somenteDigitos(empresa.telefone || empresa.celular),
                regimeTributario: fiscal.regimeTributario,
                crt: fiscal.crt,
                endereco: {
                    cep: somenteDigitos(empresa.cep), logradouro: empresa.endereco, numero: empresa.numero,
                    complemento: empresa.complemento, bairro: empresa.bairro, cidade: empresa.cidade,
                    codigoMunicipio: fiscal.codigoMunicipio, uf: texto(empresa.estado).toUpperCase()
                }
            },
            destinatario: {
                nome: cliente.nome, cpfCnpj: somenteDigitos(cliente.cpfCnpj), inscricaoEstadual: cliente.inscricaoEstadual || null,
                email: cliente.email || null, telefone: somenteDigitos(cliente.telefone || cliente.celular),
                endereco: {
                    cep: somenteDigitos(cliente.cep), logradouro: cliente.endereco || null, numero: cliente.numero || null,
                    complemento: cliente.complemento || null, bairro: cliente.bairro || null, cidade: cliente.cidade || null,
                    uf: texto(cliente.estado).toUpperCase() || null
                }
            },
            venda: {
                id: venda.id, numero: venda.numero, dataVenda: venda.dataVenda, formaPagamento: venda.formaPagamento,
                subtotal: numero(venda.subtotal), desconto: numero(venda.desconto), frete: numero(venda.frete),
                outrasDespesas: numero(venda.outrasDespesas), total: numero(venda.total)
            },
            tributacaoPadrao: {
                icmsSituacaoTributaria: fiscal.icmsSituacaoTributariaPadrao,
                pisSituacaoTributaria: fiscal.pisSituacaoTributariaPadrao,
                cofinsSituacaoTributaria: fiscal.cofinsSituacaoTributariaPadrao,
                modalidadeFrete: fiscal.modalidadeFrete,
                presencaComprador: fiscal.presencaComprador,
                consumidorFinal: fiscal.consumidorFinal,
                rtcAtivo: Boolean(fiscal.rtcAtivo),
                cbsAliquotaPadrao: fiscal.cbsAliquotaPadrao === null ? null : numero(fiscal.cbsAliquotaPadrao),
                ibsUfAliquotaPadrao: fiscal.ibsUfAliquotaPadrao === null ? null : numero(fiscal.ibsUfAliquotaPadrao),
                ibsMunAliquotaPadrao: fiscal.ibsMunAliquotaPadrao === null ? null : numero(fiscal.ibsMunAliquotaPadrao)
            },
            itens: (venda.itens || []).filter(item => item.tipo === "PRODUTO").map((item, indice) => {
                const produto = item.variacaoProduto.produto;
                return {
                    numeroItem: indice + 1, codigo: item.codigoProduto || produto.codigo, sku: item.sku,
                    descricao: item.descricao, ncm: somenteDigitos(produto.ncm), cfop: produto.cfopPadrao || fiscal.cfopPadrao,
                    origemMercadoria: produto.origemMercadoria, unidade: produto.unidadeMedida,
                    ibsCbsSituacaoTributaria: produto.ibsCbsSituacaoTributaria || null,
                    ibsCbsClassificacaoTributaria: produto.ibsCbsClassificacaoTributaria || null,
                    isSituacaoTributaria: produto.isSituacaoTributaria || null,
                    isClassificacaoTributaria: produto.isClassificacaoTributaria || null,
                    isAliquota: produto.isAliquota === null ? null : numero(produto.isAliquota),
                    quantidade: numero(item.quantidade), valorUnitario: numero(item.valorUnitario), desconto: numero(item.desconto), total: numero(item.total)
                };
            }),
            informacoesComplementares: fiscal.informacoesComplementares || null
        };
    }

    async testarAutorizacao(vendaId, empresaId) {
        const { venda, pronta, pendencias } = await this.validar(vendaId, empresaId, { previa: true });
        if (!pronta) return { pronta: false, pendencias };
        if (venda.status !== "CONFIRMADA" || venda.notaFiscal) {
            throw new Error("Use uma venda de teste aguardando faturamento e sem nota registrada.");
        }
        const nota = { ambiente: "HOMOLOGACAO", serie: 889, numero: venda.id, dadosEmissao: this.montarSnapshot(venda) };
        const nfe = montarNfeHomologacao(nota, codigoNumericoNfe(venda, nota.numero));
        return { pronta: true, ...await sefazGoService.autorizarHomologacao(empresaId, nfe, venda.id) };
    }

    async previsualizar(vendaId, empresaId) {
        const { venda, pronta, pendencias } = await this.validar(vendaId, empresaId, { previa: true });
        if (!pronta) return { pronta: false, pendencias };

        const fiscal = venda.empresa.configuracaoFiscal;
        const nota = {
            ambiente: "HOMOLOGACAO",
            serie: fiscal.serieNfe,
            numero: fiscal.proximoNumeroNfe,
            dadosEmissao: this.montarSnapshot(venda)
        };
        const codigoPrevia = codigoNumericoNfe(venda, nota.numero);
        const { xml } = montarNfeHomologacao(nota, codigoPrevia);
        return { pronta: true, ambiente: nota.ambiente, xml };
    }

    async preparar(vendaId, empresaId) {
        const validacao = await this.validar(vendaId, empresaId);
        if (!validacao.pronta) return { pronta: false, pendencias: validacao.pendencias, notaFiscal: validacao.venda.notaFiscal || null };
        if (validacao.venda.notaFiscal) return { pronta: true, pendencias: [], notaFiscal: validacao.venda.notaFiscal, existente: true };
        const snapshot = this.montarSnapshot(validacao.venda);
        const fiscal = validacao.venda.empresa.configuracaoFiscal;
        const previa = { ambiente: "PRODUCAO", serie: fiscal.serieNfe, numero: fiscal.proximoNumeroNfe, dadosEmissao: snapshot };
        montarNfe(previa, codigoNumericoNfe(validacao.venda, previa.numero));
        const notaFiscal = await nfeRepository.criarPreparada(validacao.venda, snapshot);
        return { pronta: true, pendencias: [], notaFiscal, existente: false };
    }

    async emitir(vendaId, empresaId) {
        const venda = await nfeRepository.buscarVenda(vendaId, empresaId);
        if (!venda) throw new Error("Venda não encontrada.");
        const fiscal = venda.empresa?.configuracaoFiscal;
        if (fiscal?.ativo !== true || fiscal.ambiente !== "PRODUCAO") {
            throw new Error("Ative explicitamente a configuração fiscal em Produção antes de emitir uma NF-e real.");
        }
        const preparado = await this.preparar(vendaId, empresaId);
        if (!preparado.pronta) return preparado;
        const nota = preparado.notaFiscal;
        if (nota.status === "AUTORIZADA" && nota.ambiente === "PRODUCAO") return preparado;
        if (nota.ambiente !== "PRODUCAO" || nota.status !== "PRONTA_TRANSMISSAO") {
            throw new Error("Já existe uma tentativa para esta venda. Confira o estado fiscal antes de qualquer reenvio.");
        }
        const nfe = montarNfe(nota, codigoNumericoNfe({ id: vendaId, empresaId }, nota.numero));
        const retorno = await sefazGoService.autorizar(empresaId, nfe, nota.id, "PRODUCAO", xmlEnvio =>
            nfeRepository.iniciarTransmissao(nota.id, {
                xmlEnvio, chaveAcesso: nfe.chave, motivoStatus: "Enviando à SEFAZ Goiás. Confira o retorno antes de qualquer novo envio."
            })
        );
        const rejeitada = retorno.httpStatus === 200 && /^\d{3}$/.test(retorno.codigo || "")
            && !retorno.recibo && !["100", "103", "104", "105", "106", "204", "539"].includes(retorno.codigo);
        const status = retorno.autorizada ? "AUTORIZADA" : rejeitada ? "REJEITADA" : "TRANSMITINDO";
        const motivoStatus = [retorno.codigo, retorno.motivo, retorno.recibo && `Recibo ${retorno.recibo}`].filter(Boolean).join(" · ")
            || `HTTP ${retorno.httpStatus}. A autorização ainda precisa ser consultada na SEFAZ.`;
        const notaFiscal = await nfeRepository.atualizar(nota.id, {
            status, motivoStatus, xmlRetorno: retorno.xmlRetorno,
            ...(retorno.autorizada ? { protocolo: retorno.protocolo, autorizadaEm: new Date() } : {})
        });
        return { pronta: true, notaFiscal };
    }

    async consultar(vendaId, empresaId) {
        const { notaFiscal } = await this.buscarPorVenda(vendaId, empresaId);
        if (!notaFiscal) throw new Error("Ainda não existe NF-e para esta venda.");
        return { notaFiscal };
    }

    async cancelar() {
        throw new Error("O cancelamento direto da NF-e na SEFAZ ainda está indisponível.");
    }

    async buscarPorVenda(vendaId, empresaId) {
        return { notaFiscal: await nfeRepository.buscarPorVenda(vendaId, empresaId) };
    }
}

module.exports = new NfeService();
