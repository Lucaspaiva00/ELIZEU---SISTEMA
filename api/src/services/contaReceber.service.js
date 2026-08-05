const contaReceberRepository = require("../repositories/contaReceber.repository");

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

class ContaReceberService {

    async criar(dados) {
        const clienteId = Number(dados.clienteId);

        if (!Number.isInteger(clienteId) || clienteId < 1) {
            throw new Error("Informe o cliente.");
        }

        if (!dados.descricao || !dados.descricao.trim()) {
            throw new Error("Informe a descrição da conta a receber.");
        }

        const valorOriginal = Number(dados.valorOriginal);

        if (!Number.isFinite(valorOriginal) || valorOriginal <= 0) {
            throw new Error("O valor da conta deve ser maior que zero.");
        }

        if (dados.formaPagamento && !FORMAS_PAGAMENTO.includes(dados.formaPagamento)) {
            throw new Error("Forma de pagamento inválida.");
        }

        return contaReceberRepository.criar({
            ...dados,
            clienteId,
            categoriaFinanceiraId: dados.categoriaFinanceiraId
                ? Number(dados.categoriaFinanceiraId)
                : null,
            centroCustoId: dados.centroCustoId
                ? Number(dados.centroCustoId)
                : null,
            valorOriginal,
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
            clienteId: filtros.clienteId ? Number(filtros.clienteId) : null,
            busca: filtros.busca?.trim() || null,
            vencimentoInicio: converterData(filtros.vencimentoInicio),
            vencimentoFim: converterData(filtros.vencimentoFim),
            pagina: Math.max(Number(filtros.pagina) || 1, 1),
            limite: Math.min(Math.max(Number(filtros.limite) || 50, 1), 200)
        };

        await contaReceberRepository.atualizarAtrasados(empresaId);

        return contaReceberRepository.listar(empresaId, filtrosNormalizados);
    }

    async resumo(empresaId, filtros) {
        await contaReceberRepository.atualizarAtrasados(empresaId);

        return contaReceberRepository.resumo(empresaId, {
            vencimentoInicio: converterData(filtros.vencimentoInicio),
            vencimentoFim: converterData(filtros.vencimentoFim)
        });
    }

    async buscarPorId(id, empresaId) {
        const contaReceber = await contaReceberRepository.buscarPorId(id, empresaId);

        if (!contaReceber) {
            throw new Error("Conta a receber não encontrada.");
        }

        return contaReceber;
    }

    async atualizar(id, dados) {
        const contaReceber = await this.buscarPorId(id, dados.empresaId);

        const clienteId = Number(dados.clienteId);

        if (!Number.isInteger(clienteId) || clienteId < 1) {
            throw new Error("Informe o cliente.");
        }

        if (["PAGO", "CANCELADO"].includes(contaReceber.status)) {
            throw new Error("Uma conta paga ou cancelada não pode ser alterada.");
        }

        if (Number(contaReceber.valorRecebido) > 0) {
            throw new Error("Uma conta com recebimento parcial não pode ser alterada.");
        }

        if (!dados.descricao || !dados.descricao.trim()) {
            throw new Error("Informe a descrição da conta a receber.");
        }

        const valorOriginal = Number(dados.valorOriginal);

        if (!Number.isFinite(valorOriginal) || valorOriginal <= 0) {
            throw new Error("O valor da conta deve ser maior que zero.");
        }

        if (dados.formaPagamento && !FORMAS_PAGAMENTO.includes(dados.formaPagamento)) {
            throw new Error("Forma de pagamento inválida.");
        }

        return contaReceberRepository.atualizar(id, {
            ...dados,
            clienteId,
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

    async receber(id, dados) {
        await this.buscarPorId(id, dados.empresaId);

        const valor = Number(dados.valor);

        if (!Number.isFinite(valor) || valor <= 0) {
            throw new Error("O valor recebido deve ser maior que zero.");
        }

        if (dados.formaPagamento && !FORMAS_PAGAMENTO.includes(dados.formaPagamento)) {
            throw new Error("Forma de pagamento inválida.");
        }

        return contaReceberRepository.receber(id, {
            ...dados,
            contaFinanceiraId: dados.contaFinanceiraId
                ? Number(dados.contaFinanceiraId)
                : null,
            valor,
            valorDesconto: numeroNaoNegativo(dados.valorDesconto, "Desconto"),
            valorJuros: numeroNaoNegativo(dados.valorJuros, "Juros"),
            valorMulta: numeroNaoNegativo(dados.valorMulta, "Multa"),
            dataRecebimento: converterData(dados.dataRecebimento) || new Date()
        });
    }

    async cancelar(id, dados) {
        await this.buscarPorId(id, dados.empresaId);

        if (!dados.motivo || !dados.motivo.trim()) {
            throw new Error("Informe o motivo do cancelamento.");
        }

        return contaReceberRepository.cancelar(id, dados);
    }
}

module.exports = new ContaReceberService();
