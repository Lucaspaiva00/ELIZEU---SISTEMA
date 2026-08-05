const contaPagarRepository = require("../repositories/contaPagar.repository");

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

const STATUS_VALIDOS = [
    "PENDENTE",
    "PARCIAL",
    "PAGO",
    "ATRASADO",
    "CANCELADO"
];

function converterData(valor, obrigatoria = false) {
    if (!valor) {
        if (obrigatoria) {
            throw new Error("Data obrigatória não informada.");
        }

        return null;
    }

    const data = typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor)
        ? new Date(`${valor}T12:00:00`)
        : new Date(valor);

    if (Number.isNaN(data.getTime())) {
        throw new Error("Data inválida.");
    }

    return data;
}

function numeroNaoNegativo(valor, nome, padrao = 0) {
    const numero = valor === undefined || valor === null || valor === ""
        ? padrao
        : Number(valor);

    if (!Number.isFinite(numero) || numero < 0) {
        throw new Error(`${nome} deve ser um valor maior ou igual a zero.`);
    }

    return numero;
}

class ContaPagarService {

    async criar(dados) {
        if (!dados.descricao || !dados.descricao.trim()) {
            throw new Error("Informe a descrição da conta a pagar.");
        }

        const valorOriginal = Number(dados.valorOriginal);

        if (!Number.isFinite(valorOriginal) || valorOriginal <= 0) {
            throw new Error("O valor da conta deve ser maior que zero.");
        }

        const quantidadeParcelas = Number(dados.quantidadeParcelas ?? 1);

        if (
            !Number.isInteger(quantidadeParcelas) ||
            quantidadeParcelas < 1 ||
            quantidadeParcelas > 120
        ) {
            throw new Error("A quantidade deve estar entre 1 e 120 lançamentos.");
        }

        const periodicidadeParcelas = dados.periodicidadeParcelas || "MENSAL";

        if (!PERIODICIDADES.includes(periodicidadeParcelas)) {
            throw new Error("Periodicidade inválida.");
        }

        const modoGeracao = dados.modoGeracao || "PARCELAMENTO";

        if (!["PARCELAMENTO", "RECORRENCIA"].includes(modoGeracao)) {
            throw new Error("Modo de geração inválido.");
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

        if (dados.formaPagamento && !FORMAS_PAGAMENTO.includes(dados.formaPagamento)) {
            throw new Error("Forma de pagamento inválida.");
        }

        return contaPagarRepository.criar({
            ...dados,
            categoriaFinanceiraId: dados.categoriaFinanceiraId
                ? Number(dados.categoriaFinanceiraId)
                : null,
            centroCustoId: dados.centroCustoId
                ? Number(dados.centroCustoId)
                : null,
            valorOriginal,
            quantidadeParcelas,
            periodicidadeParcelas,
            modoGeracao,
            intervaloPersonalizadoDias,
            dataCompetencia: converterData(dados.dataCompetencia) || new Date(),
            dataEmissao: converterData(dados.dataEmissao) || new Date(),
            dataVencimento: converterData(dados.dataVencimento, true)
        });
    }

    async listar(empresaId, filtros) {
        const filtrosNormalizados = {
            status: filtros.status && STATUS_VALIDOS.includes(filtros.status)
                ? filtros.status
                : null,
            busca: filtros.busca?.trim() || null,
            vencimentoInicio: converterData(filtros.vencimentoInicio),
            vencimentoFim: converterData(filtros.vencimentoFim),
            pagina: Math.max(Number(filtros.pagina) || 1, 1),
            limite: Math.min(Math.max(Number(filtros.limite) || 50, 1), 200)
        };

        await contaPagarRepository.atualizarAtrasados(empresaId);

        return contaPagarRepository.listar(empresaId, filtrosNormalizados);
    }

    async resumo(empresaId, filtros) {
        await contaPagarRepository.atualizarAtrasados(empresaId);

        return contaPagarRepository.resumo(empresaId, {
            vencimentoInicio: converterData(filtros.vencimentoInicio),
            vencimentoFim: converterData(filtros.vencimentoFim)
        });
    }

    async buscarPorId(id, empresaId) {
        const contaPagar = await contaPagarRepository.buscarPorId(id, empresaId);

        if (!contaPagar) {
            throw new Error("Conta a pagar não encontrada.");
        }

        return contaPagar;
    }

    async atualizar(id, dados) {
        const contaPagar = await this.buscarPorId(id, dados.empresaId);

        if (["PAGO", "CANCELADO"].includes(contaPagar.status)) {
            throw new Error("Uma conta paga ou cancelada não pode ser alterada.");
        }

        if (Number(contaPagar.valorPago) > 0) {
            throw new Error("Uma conta com pagamento parcial não pode ser alterada.");
        }

        if (!dados.descricao || !dados.descricao.trim()) {
            throw new Error("Informe a descrição da conta a pagar.");
        }

        const valorOriginal = Number(dados.valorOriginal);

        if (!Number.isFinite(valorOriginal) || valorOriginal <= 0) {
            throw new Error("O valor da conta deve ser maior que zero.");
        }

        if (dados.formaPagamento && !FORMAS_PAGAMENTO.includes(dados.formaPagamento)) {
            throw new Error("Forma de pagamento inválida.");
        }

        return contaPagarRepository.atualizar(id, {
            ...dados,
            categoriaFinanceiraId: dados.categoriaFinanceiraId
                ? Number(dados.categoriaFinanceiraId)
                : null,
            centroCustoId: dados.centroCustoId
                ? Number(dados.centroCustoId)
                : null,
            valorOriginal,
            dataCompetencia: converterData(dados.dataCompetencia) || new Date(),
            dataVencimento: converterData(dados.dataVencimento, true)
        });
    }

    async pagar(id, dados) {
        await this.buscarPorId(id, dados.empresaId);

        const valor = Number(dados.valor);

        if (!Number.isFinite(valor) || valor <= 0) {
            throw new Error("O valor pago deve ser maior que zero.");
        }

        if (dados.formaPagamento && !FORMAS_PAGAMENTO.includes(dados.formaPagamento)) {
            throw new Error("Forma de pagamento inválida.");
        }

        return contaPagarRepository.pagar(id, {
            ...dados,
            contaFinanceiraId: dados.contaFinanceiraId
                ? Number(dados.contaFinanceiraId)
                : null,
            valor,
            valorDesconto: numeroNaoNegativo(dados.valorDesconto, "Desconto"),
            valorJuros: numeroNaoNegativo(dados.valorJuros, "Juros"),
            valorMulta: numeroNaoNegativo(dados.valorMulta, "Multa"),
            dataPagamento: converterData(dados.dataPagamento) || new Date()
        });
    }

    async cancelar(id, dados) {
        await this.buscarPorId(id, dados.empresaId);

        if (!dados.motivo || !dados.motivo.trim()) {
            throw new Error("Informe o motivo do cancelamento.");
        }

        return contaPagarRepository.cancelar(id, dados);
    }
}

module.exports = new ContaPagarService();
