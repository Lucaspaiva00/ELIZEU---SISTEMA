const movimentacaoRepository = require("../repositories/movimentacaoFinanceira.repository");

const TIPOS = ["ENTRADA", "SAIDA"];

const ORIGENS = [
    "CONTA_RECEBER",
    "CONTA_PAGAR",
    "VENDA",
    "LANCAMENTO_MANUAL",
    "TRANSFERENCIA",
    "ESTORNO",
    "AJUSTE"
];

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

function validarValor(valor) {
    const numero = Number(valor);

    if (!Number.isFinite(numero) || numero <= 0) {
        throw new Error("O valor deve ser maior que zero.");
    }

    return numero;
}

class MovimentacaoFinanceiraService {

    async listar(empresaId, filtros) {
        return movimentacaoRepository.listar(empresaId, {
            contaFinanceiraId: filtros.contaFinanceiraId
                ? Number(filtros.contaFinanceiraId)
                : null,
            tipo: TIPOS.includes(filtros.tipo) ? filtros.tipo : null,
            origem: ORIGENS.includes(filtros.origem) ? filtros.origem : null,
            busca: filtros.busca?.trim() || null,
            dataInicio: converterData(filtros.dataInicio),
            dataFim: converterData(filtros.dataFim),
            incluirEstornadas: filtros.incluirEstornadas !== "false",
            pagina: Math.max(Number(filtros.pagina) || 1, 1),
            limite: Math.min(Math.max(Number(filtros.limite) || 50, 1), 200)
        });
    }

    async resumo(empresaId, filtros) {
        return movimentacaoRepository.resumo(empresaId, {
            contaFinanceiraId: filtros.contaFinanceiraId
                ? Number(filtros.contaFinanceiraId)
                : null,
            dataInicio: converterData(filtros.dataInicio),
            dataFim: converterData(filtros.dataFim)
        });
    }

    async buscarPorId(id, empresaId) {
        const movimentacao = await movimentacaoRepository.buscarPorId(id, empresaId);

        if (!movimentacao) {
            throw new Error("Movimentação financeira não encontrada.");
        }

        return movimentacao;
    }

    async criarManual(dados) {
        if (!TIPOS.includes(dados.tipo)) {
            throw new Error("Tipo de movimentação inválido.");
        }

        if (!dados.descricao || !dados.descricao.trim()) {
            throw new Error("Informe a descrição da movimentação.");
        }

        if (dados.formaPagamento && !FORMAS_PAGAMENTO.includes(dados.formaPagamento)) {
            throw new Error("Forma de pagamento inválida.");
        }

        return movimentacaoRepository.criarManual({
            ...dados,
            contaFinanceiraId: dados.contaFinanceiraId
                ? Number(dados.contaFinanceiraId)
                : null,
            categoriaFinanceiraId: dados.categoriaFinanceiraId
                ? Number(dados.categoriaFinanceiraId)
                : null,
            centroCustoId: dados.centroCustoId
                ? Number(dados.centroCustoId)
                : null,
            valor: validarValor(dados.valor),
            dataMovimentacao: converterData(dados.dataMovimentacao) || new Date(),
            dataCompetencia: converterData(dados.dataCompetencia)
        });
    }

    async transferir(dados) {
        const contaOrigemId = Number(dados.contaOrigemId);
        const contaDestinoId = Number(dados.contaDestinoId);

        if (!Number.isInteger(contaOrigemId) || !Number.isInteger(contaDestinoId)) {
            throw new Error("Informe as contas de origem e destino.");
        }

        if (contaOrigemId === contaDestinoId) {
            throw new Error("As contas de origem e destino devem ser diferentes.");
        }

        return movimentacaoRepository.transferir({
            ...dados,
            contaOrigemId,
            contaDestinoId,
            centroCustoId: dados.centroCustoId
                ? Number(dados.centroCustoId)
                : null,
            valor: validarValor(dados.valor),
            dataMovimentacao: converterData(dados.dataMovimentacao) || new Date()
        });
    }

    async estornar(id, dados) {
        await this.buscarPorId(id, dados.empresaId);

        if (!dados.motivo || !dados.motivo.trim()) {
            throw new Error("Informe o motivo do estorno.");
        }

        return movimentacaoRepository.estornar(id, {
            ...dados,
            dataEstorno: converterData(dados.dataEstorno) || new Date()
        });
    }
}

module.exports = new MovimentacaoFinanceiraService();
