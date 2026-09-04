const nfeRepository = require("../repositories/nfe.repository");
const focusNfeService = require("./focusNfe.service");

function texto(valor) { return String(valor ?? "").trim(); }
function somenteDigitos(valor) { return texto(valor).replace(/\D/g, ""); }
function numero(valor) { return Number(valor || 0); }
function decimal(valor) { return numero(valor).toFixed(2); }
function adicionarPendencia(lista, condicao, mensagem, destino) {
    if (condicao) lista.push({ mensagem, destino });
}

const PAGAMENTOS_FOCUS = {
    DINHEIRO: "01",
    CHEQUE: "02",
    CARTAO_CREDITO: "03",
    CARTAO_DEBITO: "04",
    CREDITO_LOJA: "05",
    BOLETO: "15",
    PIX: "17",
    TRANSFERENCIA: "18",
    OUTRO: "99"
};

function statusInternoFocus(status) {
    const mapa = {
        processando_autorizacao: "TRANSMITINDO",
        autorizado: "AUTORIZADA",
        cancelado: "CANCELADA",
        erro_autorizacao: "REJEITADA",
        denegado: "REJEITADA",
        erro_cancelamento: "ERRO"
    };
    return mapa[String(status || "").toLowerCase()] || "ERRO";
}

class NfeService {
    async validar(vendaId, empresaId) {
        const venda = await nfeRepository.buscarVenda(vendaId, empresaId);
        if (!venda) throw new Error("Venda não encontrada.");

        const pendencias = [];
        adicionarPendencia(pendencias, venda.status !== "FATURADA", "A venda precisa estar faturada antes da emissão da NF-e.", "venda");

        const empresa = venda.empresa;
        const fiscal = empresa?.configuracaoFiscal;
        const certificado = empresa?.certificadoDigital;
        const focus = empresa?.integracaoFocusNfe;

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
            adicionarPendencia(pendencias, !fiscal.ativo, "Configuração fiscal está desativada.", "fiscal");
            adicionarPendencia(pendencias, !fiscal.regimeTributario, "Regime tributário não informado.", "fiscal");
            adicionarPendencia(pendencias, !fiscal.crt, "CRT não informado.", "fiscal");
            adicionarPendencia(pendencias, somenteDigitos(fiscal.codigoMunicipio).length !== 7, "Código IBGE do município inválido ou não informado.", "fiscal");
            adicionarPendencia(pendencias, !/^\d{4}$/.test(texto(fiscal.cfopPadrao)), "CFOP padrão inválido ou não informado.", "fiscal");
            adicionarPendencia(pendencias, !texto(fiscal.naturezaOperacao), "Natureza da operação não informada.", "fiscal");
            adicionarPendencia(pendencias, !texto(fiscal.icmsSituacaoTributariaPadrao), "CST/CSOSN padrão do ICMS não informado.", "fiscal");
            adicionarPendencia(pendencias, !texto(fiscal.pisSituacaoTributariaPadrao), "CST do PIS não informado.", "fiscal");
            adicionarPendencia(pendencias, !texto(fiscal.cofinsSituacaoTributariaPadrao), "CST da COFINS não informado.", "fiscal");
        }

        // O certificado é guardado no ERP para controle operacional. Na Focus ele também precisa estar cadastrado na empresa emitente.
        adicionarPendencia(pendencias, !certificado, "Certificado A1 não configurado no ERP.", "certificado");
        if (certificado) {
            adicionarPendencia(pendencias, !certificado.ativo, "Certificado A1 está inativo.", "certificado");
            adicionarPendencia(pendencias, certificado.validade && new Date(certificado.validade) < new Date(), "Certificado A1 está vencido.", "certificado");
        }

        adicionarPendencia(pendencias, !focus?.ativo, "Integração Focus NFe não configurada ou desativada.", "focus");
        if (fiscal?.ambiente === "PRODUCAO") {
            adicionarPendencia(pendencias, !focus?.tokenProducaoCriptografado, "Token Focus NFe de produção não configurado.", "focus");
        } else {
            adicionarPendencia(pendencias, !focus?.tokenHomologacaoCriptografado, "Token Focus NFe de homologação não configurado.", "focus");
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
            adicionarPendencia(pendencias, somenteDigitos(produto.ncm).length !== 8, `Produto "${produto.nome}" está sem NCM válido.`, "produto");
            adicionarPendencia(pendencias, !/^\d{4}$/.test(texto(produto.cfopPadrao || fiscal?.cfopPadrao)), `Produto "${produto.nome}" está sem CFOP válido.`, "produto");
            adicionarPendencia(pendencias, !/^[0-8]$/.test(texto(produto.origemMercadoria)), `Produto "${produto.nome}" está sem origem da mercadoria.`, "produto");
        }

        adicionarPendencia(pendencias, !possuiProduto, "A venda não possui produtos para NF-e modelo 55.", "produto");
        adicionarPendencia(pendencias, possuiServico, "A venda possui serviço. Para não gerar documento fiscal incorreto, a NF-e automática foi bloqueada. Separe produto e serviço ou emita a NFS-e correspondente.", "servico");

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
                consumidorFinal: fiscal.consumidorFinal
            },
            itens: (venda.itens || []).filter(item => item.tipo === "PRODUTO").map((item, indice) => {
                const produto = item.variacaoProduto.produto;
                return {
                    numeroItem: indice + 1, codigo: item.codigoProduto || produto.codigo, sku: item.sku,
                    descricao: item.descricao, ncm: somenteDigitos(produto.ncm), cfop: produto.cfopPadrao || fiscal.cfopPadrao,
                    origemMercadoria: produto.origemMercadoria, unidade: produto.unidadeMedida,
                    quantidade: numero(item.quantidade), valorUnitario: numero(item.valorUnitario), desconto: numero(item.desconto), total: numero(item.total)
                };
            }),
            informacoesComplementares: fiscal.informacoesComplementares || null
        };
    }

    montarPayloadFocus(nota) {
        const s = nota.dadosEmissao;
        const e = s.emitente;
        const d = s.destinatario;
        const t = s.tributacaoPadrao;
        const docDest = somenteDigitos(d.cpfCnpj);
        const mesmoEstado = texto(e.endereco.uf).toUpperCase() === texto(d.endereco.uf).toUpperCase();
        const valorProdutos = s.itens.reduce((acc, item) => acc + (item.quantidade * item.valorUnitario), 0);

        const payload = {
            natureza_operacao: s.documento.naturezaOperacao,
            data_emissao: new Date().toISOString(),
            data_entrada_saida: new Date().toISOString(),
            tipo_documento: "1",
            finalidade_emissao: "1",
            local_destino: mesmoEstado ? "1" : "2",
            consumidor_final: t.consumidorFinal ? "1" : "0",
            presenca_comprador: String(t.presencaComprador ?? 9),
            modalidade_frete: String(t.modalidadeFrete ?? 9),
            serie: String(nota.serie),
            numero: String(nota.numero),

            cnpj_emitente: e.cnpj,
            inscricao_estadual_emitente: e.inscricaoEstadual,
            nome_emitente: e.razaoSocial,
            nome_fantasia_emitente: e.nomeFantasia || e.razaoSocial,
            logradouro_emitente: e.endereco.logradouro,
            numero_emitente: e.endereco.numero,
            complemento_emitente: e.endereco.complemento || undefined,
            bairro_emitente: e.endereco.bairro,
            codigo_municipio_emitente: e.endereco.codigoMunicipio,
            municipio_emitente: e.endereco.cidade,
            uf_emitente: e.endereco.uf,
            cep_emitente: e.endereco.cep,
            telefone_emitente: e.telefone || undefined,
            regime_tributario_emitente: Number(e.crt),

            nome_destinatario: d.nome,
            inscricao_estadual_destinatario: d.inscricaoEstadual || undefined,
            indicador_inscricao_estadual_destinatario: d.inscricaoEstadual ? "1" : "9",
            telefone_destinatario: d.telefone || undefined,
            email_destinatario: d.email || undefined,
            logradouro_destinatario: d.endereco.logradouro,
            numero_destinatario: d.endereco.numero,
            complemento_destinatario: d.endereco.complemento || undefined,
            bairro_destinatario: d.endereco.bairro,
            municipio_destinatario: d.endereco.cidade,
            uf_destinatario: d.endereco.uf,
            pais_destinatario: "Brasil",
            codigo_pais_destinatario: "1058",
            cep_destinatario: d.endereco.cep,

            valor_produtos: decimal(valorProdutos),
            valor_frete: decimal(s.venda.frete),
            valor_seguro: "0.00",
            valor_desconto: decimal(s.venda.desconto),
            valor_outras_despesas: decimal(s.venda.outrasDespesas),
            valor_total: decimal(s.venda.total),
            informacoes_adicionais_contribuinte: s.informacoesComplementares || undefined,

            items: s.itens.map(item => ({
                numero_item: String(item.numeroItem),
                codigo_produto: texto(item.codigo || item.sku),
                descricao: item.descricao,
                cfop: texto(item.cfop),
                unidade_comercial: texto(item.unidade || "UN").toLowerCase(),
                quantidade_comercial: String(item.quantidade),
                valor_unitario_comercial: decimal(item.valorUnitario),
                valor_unitario_tributavel: decimal(item.valorUnitario),
                unidade_tributavel: texto(item.unidade || "UN").toLowerCase(),
                codigo_ncm: item.ncm,
                quantidade_tributavel: String(item.quantidade),
                valor_bruto: decimal(item.quantidade * item.valorUnitario),
                valor_desconto: item.desconto ? decimal(item.desconto) : undefined,
                icms_situacao_tributaria: texto(t.icmsSituacaoTributaria),
                icms_origem: texto(item.origemMercadoria),
                pis_situacao_tributaria: texto(t.pisSituacaoTributaria),
                cofins_situacao_tributaria: texto(t.cofinsSituacaoTributaria)
            })),
            formas_pagamento: [{
                forma_pagamento: PAGAMENTOS_FOCUS[s.venda.formaPagamento] || "99",
                valor_pagamento: decimal(s.venda.total)
            }]
        };

        if (docDest.length === 11) payload.cpf_destinatario = docDest;
        if (docDest.length === 14) payload.cnpj_destinatario = docDest;

        // Remove undefined para manter o JSON limpo.
        return JSON.parse(JSON.stringify(payload));
    }

    async preparar(vendaId, empresaId) {
        const validacao = await this.validar(vendaId, empresaId);
        if (!validacao.pronta) return { pronta: false, pendencias: validacao.pendencias, notaFiscal: validacao.venda.notaFiscal || null };
        if (validacao.venda.notaFiscal) return { pronta: true, pendencias: [], notaFiscal: validacao.venda.notaFiscal, existente: true };
        const snapshot = this.montarSnapshot(validacao.venda);
        const notaFiscal = await nfeRepository.criarPreparada(validacao.venda, snapshot);
        return { pronta: true, pendencias: [], notaFiscal, existente: false };
    }

    async sincronizarResposta(nota, resultado) {
        const r = resultado?.dados || {};
        const statusFocus = r.status || r.codigo || null;
        const status = statusInternoFocus(statusFocus);
        const motivo = r.mensagem_sefaz || r.mensagem || (Array.isArray(r.erros) ? r.erros.map(e => e.mensagem).join(" | ") : null);

        const dados = {
            status,
            statusFocus: statusFocus ? String(statusFocus) : null,
            chaveAcesso: r.chave_nfe || r.chave_acesso || nota.chaveAcesso || null,
            protocolo: r.protocolo || r.protocolo_autorizacao || nota.protocolo || null,
            caminhoDanfe: focusNfeService.urlRecurso(nota.ambiente, r.caminho_danfe || r.url_danfe) || nota.caminhoDanfe || null,
            caminhoXml: focusNfeService.urlRecurso(nota.ambiente, r.caminho_xml_nota_fiscal || r.caminho_xml) || nota.caminhoXml || null,
            motivoStatus: motivo,
            respostaFocus: r
        };

        if (status === "TRANSMITINDO") dados.transmitidaEm = nota.transmitidaEm || new Date();
        if (status === "AUTORIZADA") { dados.transmitidaEm = nota.transmitidaEm || new Date(); dados.autorizadaEm = nota.autorizadaEm || new Date(); }
        if (status === "CANCELADA") dados.canceladaEm = nota.canceladaEm || new Date();

        return nfeRepository.atualizar(nota.id, dados);
    }

    async emitir(vendaId, empresaId) {
        const preparado = await this.preparar(vendaId, empresaId);
        if (!preparado.pronta) return preparado;

        let nota = await nfeRepository.buscarPorVenda(vendaId, empresaId);
        if (nota.status === "AUTORIZADA") return { pronta: true, notaFiscal: nota, existente: true, autorizada: true };
        if (nota.status === "CANCELADA") throw new Error("Esta NF-e já foi cancelada e não pode ser retransmitida.");

        const referencia = nota.referenciaFocus || `elian-${empresaId}-venda-${vendaId}-nfe-${nota.id}`;
        if (!nota.referenciaFocus) nota = await nfeRepository.atualizar(nota.id, { referenciaFocus: referencia });

        if (nota.status === "TRANSMITINDO") return this.consultar(vendaId, empresaId);

        const payload = this.montarPayloadFocus(nota);
        nota = await nfeRepository.atualizar(nota.id, { status: "TRANSMITINDO", transmitidaEm: new Date(), motivoStatus: null });
        const resultado = await focusNfeService.emitir(empresaId, nota.ambiente, referencia, payload);

        if ([401, 403].includes(resultado.httpStatus)) {
            await nfeRepository.atualizar(nota.id, { status: "ERRO", motivoStatus: "Token Focus NFe recusado." });
            throw new Error("A Focus NFe recusou o token deste ambiente.");
        }

        const atualizada = await this.sincronizarResposta(nota, resultado);
        return { pronta: true, notaFiscal: atualizada, respostaFocus: resultado.dados };
    }

    async consultar(vendaId, empresaId) {
        const nota = await nfeRepository.buscarPorVenda(vendaId, empresaId);
        if (!nota) throw new Error("Ainda não existe NF-e preparada para esta venda.");
        if (!nota.referenciaFocus) throw new Error("Esta NF-e ainda não foi transmitida para a Focus NFe.");

        const resultado = await focusNfeService.consultar(empresaId, nota.ambiente, nota.referenciaFocus);
        if ([401, 403].includes(resultado.httpStatus)) throw new Error("A Focus NFe recusou o token deste ambiente.");
        const atualizada = await this.sincronizarResposta(nota, resultado);
        return { notaFiscal: atualizada, respostaFocus: resultado.dados };
    }

    async cancelar(vendaId, empresaId, justificativa) {
        const nota = await nfeRepository.buscarPorVenda(vendaId, empresaId);
        if (!nota) throw new Error("NF-e não encontrada.");
        if (nota.status !== "AUTORIZADA") throw new Error("Somente uma NF-e autorizada pode ser cancelada.");
        const motivo = texto(justificativa);
        if (motivo.length < 15) throw new Error("A justificativa de cancelamento deve possuir pelo menos 15 caracteres.");
        if (!nota.referenciaFocus) throw new Error("Referência Focus NFe não encontrada.");

        const resultado = await focusNfeService.cancelar(empresaId, nota.ambiente, nota.referenciaFocus, motivo);
        if ([401, 403].includes(resultado.httpStatus)) throw new Error("A Focus NFe recusou o token deste ambiente.");
        const atualizada = await this.sincronizarResposta(nota, resultado);
        return { notaFiscal: atualizada, respostaFocus: resultado.dados };
    }

    async buscarPorVenda(vendaId, empresaId) {
        return { notaFiscal: await nfeRepository.buscarPorVenda(vendaId, empresaId) };
    }
}

module.exports = new NfeService();
