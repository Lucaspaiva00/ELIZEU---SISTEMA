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

    async criar(dados) {
        if (!dados.itens || dados.itens.length === 0) {
            throw new Error("O orçamento deve possuir ao menos um item.");
        }

        return orcamentoRepository.criar(dados);
    }

    async listar(empresaId) {
        return orcamentoRepository.listar(empresaId);
    }

    async buscarPorId(id, empresaId) {
        const orcamento = await orcamentoRepository.buscarPorId(id, empresaId);

        if (!orcamento) {
            throw new Error("Orçamento não encontrado.");
        }

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

        if (!dados.itens || dados.itens.length === 0) {
            throw new Error("O orçamento deve possuir ao menos um item.");
        }

        return orcamentoRepository.atualizar(id, dados);
    }

    async aprovar(id, dados) {
        await this.buscarPorId(id, dados.empresaId);

        if (!FORMAS_PAGAMENTO.includes(dados.formaPagamento)) {
            throw new Error("Forma de pagamento inválida.");
        }

        const quantidadeParcelas = Number(dados.quantidadeParcelas ?? 1);

        if (
            !Number.isInteger(quantidadeParcelas) ||
            quantidadeParcelas < 1 ||
            quantidadeParcelas > 120
        ) {
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
