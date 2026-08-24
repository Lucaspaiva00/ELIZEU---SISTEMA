const orcamentoRepository = require("../repositories/orcamento.repository");

const FORMAS_PAGAMENTO = [
    "DINHEIRO",
    "PIX",
    "CARTAO_CREDITO",
    "CARTAO_DEBITO",
    "BOLETO",
    "TRANSFERENCIA",
    "CHEQUE",
    "CREDITO_LOJA",
    "OUTRO"
];

const PERIODICIDADES = [
    "SEMANAL",
    "QUINZENAL",
    "MENSAL",
    "BIMESTRAL",
    "TRIMESTRAL",
    "SEMESTRAL",
    "ANUAL",
    "PERSONALIZADA"
];

function converterData(valor) {
    if (typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
        return new Date(`${valor}T12:00:00`);
    }

    return new Date(valor);
}

class OrcamentoService {
    validarItens(itens) {
        if (!Array.isArray(itens) || itens.length === 0) {
            throw new Error("O orçamento deve possuir ao menos um item.");
        }

        for (const item of itens) {
            const tipo = item.tipo || (item.variacaoServicoId ? "SERVICO" : "PRODUTO");
            item.tipo = tipo;

            if (!["PRODUTO", "SERVICO"].includes(tipo)) {
                throw new Error("Tipo de item inválido no orçamento.");
            }

            if (tipo === "PRODUTO" && !Number.isInteger(Number(item.variacaoProdutoId))) {
                throw new Error("Selecione uma variação de produto válida.");
            }

            if (tipo === "SERVICO" && !Number.isInteger(Number(item.variacaoServicoId))) {
                throw new Error("Selecione uma variação de serviço válida.");
            }

            if (!Number.isFinite(Number(item.quantidade)) || Number(item.quantidade) <= 0) {
                throw new Error("A quantidade dos itens deve ser maior que zero.");
            }

            if (!Number.isFinite(Number(item.valorUnitario)) || Number(item.valorUnitario) < 0) {
                throw new Error("O valor unitário dos itens é inválido.");
            }

            const desconto = Number(item.desconto || 0);
            if (!Number.isFinite(desconto) || desconto < 0) {
                throw new Error("O desconto do item é inválido.");
            }

            item.variacaoProdutoId = tipo === "PRODUTO" ? Number(item.variacaoProdutoId) : null;
            item.variacaoServicoId = tipo === "SERVICO" ? Number(item.variacaoServicoId) : null;
            item.quantidade = Number(item.quantidade);
            item.valorUnitario = Number(item.valorUnitario);
            item.desconto = desconto;
            item.total = Math.max((item.quantidade * item.valorUnitario) - item.desconto, 0);
        }
    }

    normalizarCustosInternos(custosInternos) {
        if (!Array.isArray(custosInternos)) return [];

        return custosInternos
            .map((custo, indice) => {
                const descricao = String(custo?.descricao || "").trim();
                const quantidade = Number(custo?.quantidade ?? 1);
                const valorUnitario = Number(custo?.valorUnitario ?? 0);

                if (!descricao) {
                    throw new Error(`Informe a descrição do custo interno ${indice + 1}.`);
                }

                if (!Number.isFinite(quantidade) || quantidade <= 0) {
                    throw new Error(`A quantidade do custo interno ${indice + 1} é inválida.`);
                }

                if (!Number.isFinite(valorUnitario) || valorUnitario < 0) {
                    throw new Error(`O valor do custo interno ${indice + 1} é inválido.`);
                }

                return {
                    descricao,
                    categoria: String(custo?.categoria || "OUTRO").trim().toUpperCase(),
                    quantidade,
                    valorUnitario,
                    total: quantidade * valorUnitario
                };
            });
    }

    prepararDados(dados) {
        this.validarItens(dados.itens);

        return {
            ...dados,
            desconto: Math.max(Number(dados.desconto || 0), 0),
            frete: Math.max(Number(dados.frete || 0), 0),
            outrasDespesas: Math.max(Number(dados.outrasDespesas || 0), 0),
            custosInternos: this.normalizarCustosInternos(dados.custosInternos)
        };
    }

    async criar(dados) {
        return orcamentoRepository.criar(this.prepararDados(dados));
    }

    async listar(empresaId) {
        return orcamentoRepository.listar(empresaId);
    }

    async buscarPorId(id, empresaId) {
        const orcamento = await orcamentoRepository.buscarPorId(id, empresaId);
        if (!orcamento) throw new Error("Orçamento não encontrado.");
        return orcamento;
    }

    async atualizar(id, dados) {
        const orcamento = await this.buscarPorId(id, dados.empresaId);

        if (orcamento.status === "APROVADO") {
            throw new Error("Um orçamento aprovado não pode ser alterado.");
        }

        if (orcamento.status === "CANCELADO") {
            throw new Error("Um orçamento cancelado não pode ser alterado.");
        }

        return orcamentoRepository.atualizar(id, this.prepararDados(dados));
    }

    async aprovar(id, dados) {
        await this.buscarPorId(id, dados.empresaId);

        if (!FORMAS_PAGAMENTO.includes(dados.formaPagamento)) {
            throw new Error("Forma de pagamento inválida.");
        }

        const quantidadeParcelas = Number(dados.quantidadeParcelas ?? 1);

        if (!Number.isInteger(quantidadeParcelas) || quantidadeParcelas < 1 || quantidadeParcelas > 120) {
            throw new Error("A quantidade de parcelas deve estar entre 1 e 120.");
        }

        const periodicidadeParcelas = dados.periodicidadeParcelas || "MENSAL";

        if (!PERIODICIDADES.includes(periodicidadeParcelas)) {
            throw new Error("Periodicidade das parcelas inválida.");
        }

        if (!dados.primeiroVencimento) {
            throw new Error("Informe a data do primeiro vencimento.");
        }

        const primeiroVencimento = converterData(dados.primeiroVencimento);

        if (Number.isNaN(primeiroVencimento.getTime())) {
            throw new Error("Data do primeiro vencimento inválida.");
        }

        const intervaloPersonalizadoDias = dados.intervaloPersonalizadoDias
            ? Number(dados.intervaloPersonalizadoDias)
            : null;

        if (
            periodicidadeParcelas === "PERSONALIZADA" &&
            (!Number.isInteger(intervaloPersonalizadoDias) || intervaloPersonalizadoDias < 1)
        ) {
            throw new Error("Informe um intervalo personalizado válido em dias.");
        }

        return orcamentoRepository.aprovar(id, {
            ...dados,
            quantidadeParcelas,
            periodicidadeParcelas,
            primeiroVencimento,
            intervaloPersonalizadoDias
        });
    }

    async excluir(id, empresaId) {
        const orcamento = await this.buscarPorId(id, empresaId);

        if (orcamento.status === "APROVADO") {
            throw new Error("Um orçamento aprovado não pode ser excluído.");
        }

        return orcamentoRepository.excluir(id, empresaId);
    }
}

module.exports = new OrcamentoService();
