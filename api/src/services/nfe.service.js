const nfeRepository = require("../repositories/nfe.repository");

function texto(valor) {
    return String(valor ?? "").trim();
}

function somenteDigitos(valor) {
    return texto(valor).replace(/\D/g, "");
}

function adicionarPendencia(lista, condicao, mensagem, destino) {
    if (condicao) {
        lista.push({ mensagem, destino });
    }
}

class NfeService {
    async validar(vendaId, empresaId) {
        const venda = await nfeRepository.buscarVenda(vendaId, empresaId);

        if (!venda) {
            throw new Error("Venda não encontrada.");
        }

        const pendencias = [];

        adicionarPendencia(
            pendencias,
            venda.status !== "FATURADA",
            "A venda precisa estar faturada antes da emissão da NF-e.",
            "venda"
        );

        const empresa = venda.empresa;
        const fiscal = empresa?.configuracaoFiscal;
        const certificado = empresa?.certificadoDigital;

        adicionarPendencia(pendencias, !texto(empresa?.razaoSocial), "Razão social da empresa não informada.", "empresa");
        adicionarPendencia(pendencias, somenteDigitos(empresa?.cnpj).length !== 14, "CNPJ do emitente inválido ou não informado.", "empresa");
        adicionarPendencia(pendencias, !texto(empresa?.inscricaoEstadual), "Inscrição estadual do emitente não informada.", "empresa");
        adicionarPendencia(pendencias, !texto(empresa?.cep), "CEP da empresa não informado.", "empresa");
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
            adicionarPendencia(pendencias, !texto(fiscal.codigoMunicipio), "Código IBGE do município não informado.", "fiscal");
            adicionarPendencia(pendencias, !texto(fiscal.cfopPadrao), "CFOP padrão não informado.", "fiscal");
            adicionarPendencia(pendencias, !texto(fiscal.naturezaOperacao), "Natureza da operação não informada.", "fiscal");
        }

        adicionarPendencia(pendencias, !certificado, "Certificado A1 não configurado.", "certificado");
        if (certificado) {
            adicionarPendencia(pendencias, !certificado.ativo, "Certificado A1 está inativo.", "certificado");
            adicionarPendencia(
                pendencias,
                certificado.validade && new Date(certificado.validade) < new Date(),
                "Certificado A1 está vencido.",
                "certificado"
            );
        }

        const cliente = venda.cliente;
        const documentoCliente = somenteDigitos(cliente?.cpfCnpj);
        adicionarPendencia(
            pendencias,
            ![11, 14].includes(documentoCliente.length),
            "CPF/CNPJ do cliente não está válido para emissão fiscal.",
            "cliente"
        );
        adicionarPendencia(pendencias, !texto(cliente?.nome), "Nome/Razão social do cliente não informado.", "cliente");

        let possuiProduto = false;
        let possuiServico = false;

        for (const item of venda.itens || []) {
            if (item.tipo === "SERVICO") {
                possuiServico = true;
                continue;
            }

            possuiProduto = true;
            const produto = item.variacaoProduto?.produto;

            adicionarPendencia(
                pendencias,
                !produto,
                `Produto do item "${item.descricao}" não encontrado.`,
                "produto"
            );

            if (!produto) continue;

            adicionarPendencia(
                pendencias,
                somenteDigitos(produto.ncm).length !== 8,
                `Produto "${produto.nome}" está sem NCM válido.`,
                "produto"
            );

            adicionarPendencia(
                pendencias,
                !texto(produto.cfopPadrao || fiscal?.cfopPadrao),
                `Produto "${produto.nome}" está sem CFOP.`,
                "produto"
            );

            adicionarPendencia(
                pendencias,
                texto(produto.origemMercadoria) === "",
                `Produto "${produto.nome}" está sem origem da mercadoria.`,
                "produto"
            );
        }

        adicionarPendencia(
            pendencias,
            possuiServico && !possuiProduto,
            "Esta venda contém somente serviços. Para serviços, o documento fiscal correto normalmente é NFS-e; a emissão de NF-e modelo 55 foi bloqueada.",
            "servico"
        );

        return {
            venda,
            pronta: pendencias.length === 0,
            pendencias
        };
    }

    montarSnapshot(venda) {
        const empresa = venda.empresa;
        const fiscal = empresa.configuracaoFiscal;
        const cliente = venda.cliente;

        return {
            versaoInterna: 1,
            documento: {
                modelo: 55,
                ambiente: fiscal.ambiente,
                naturezaOperacao: fiscal.naturezaOperacao,
                serie: fiscal.serieNfe
            },
            emitente: {
                razaoSocial: empresa.razaoSocial,
                nomeFantasia: empresa.nomeFantasia,
                cnpj: somenteDigitos(empresa.cnpj),
                inscricaoEstadual: texto(empresa.inscricaoEstadual),
                regimeTributario: fiscal.regimeTributario,
                crt: fiscal.crt,
                endereco: {
                    cep: somenteDigitos(empresa.cep),
                    logradouro: empresa.endereco,
                    numero: empresa.numero,
                    complemento: empresa.complemento,
                    bairro: empresa.bairro,
                    cidade: empresa.cidade,
                    codigoMunicipio: fiscal.codigoMunicipio,
                    uf: empresa.estado
                }
            },
            destinatario: {
                nome: cliente.nome,
                cpfCnpj: somenteDigitos(cliente.cpfCnpj),
                inscricaoEstadual: cliente.inscricaoEstadual || null,
                email: cliente.email || null,
                telefone: cliente.telefone || cliente.celular || null,
                endereco: {
                    cep: cliente.cep || null,
                    logradouro: cliente.endereco || null,
                    numero: cliente.numero || null,
                    complemento: cliente.complemento || null,
                    bairro: cliente.bairro || null,
                    cidade: cliente.cidade || null,
                    uf: cliente.estado || null
                }
            },
            venda: {
                id: venda.id,
                numero: venda.numero,
                dataVenda: venda.dataVenda,
                subtotal: Number(venda.subtotal),
                desconto: Number(venda.desconto),
                frete: Number(venda.frete),
                outrasDespesas: Number(venda.outrasDespesas),
                total: Number(venda.total)
            },
            itens: (venda.itens || [])
                .filter(item => item.tipo === "PRODUTO")
                .map((item, indice) => {
                    const produto = item.variacaoProduto.produto;
                    return {
                        numeroItem: indice + 1,
                        codigo: item.codigoProduto || produto.codigo,
                        sku: item.sku,
                        descricao: item.descricao,
                        ncm: somenteDigitos(produto.ncm),
                        cfop: produto.cfopPadrao || fiscal.cfopPadrao,
                        origemMercadoria: produto.origemMercadoria,
                        unidade: produto.unidadeMedida,
                        quantidade: Number(item.quantidade),
                        valorUnitario: Number(item.valorUnitario),
                        desconto: Number(item.desconto),
                        total: Number(item.total)
                    };
                }),
            informacoesComplementares: fiscal.informacoesComplementares || null
        };
    }

    async preparar(vendaId, empresaId) {
        const validacao = await this.validar(vendaId, empresaId);

        if (!validacao.pronta) {
            return {
                pronta: false,
                pendencias: validacao.pendencias,
                notaFiscal: validacao.venda.notaFiscal || null
            };
        }

        if (validacao.venda.notaFiscal) {
            return {
                pronta: true,
                pendencias: [],
                notaFiscal: validacao.venda.notaFiscal,
                existente: true
            };
        }

        const snapshot = this.montarSnapshot(validacao.venda);
        const notaFiscal = await nfeRepository.criarPreparada(validacao.venda, snapshot);

        return {
            pronta: true,
            pendencias: [],
            notaFiscal,
            existente: false
        };
    }

    async buscarPorVenda(vendaId, empresaId) {
        const notaFiscal = await nfeRepository.buscarPorVenda(vendaId, empresaId);
        return { notaFiscal };
    }
}

module.exports = new NfeService();
