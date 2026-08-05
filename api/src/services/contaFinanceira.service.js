const contaFinanceiraRepository = require("../repositories/contaFinanceira.repository");

const TIPOS_CONTA = [
    "CAIXA",
    "CONTA_CORRENTE",
    "POUPANCA",
    "CARTEIRA_DIGITAL",
    "OUTRA"
];

function converterData(valor) {
    if (!valor) {
        return new Date();
    }

    const data = typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor)
        ? new Date(`${valor}T12:00:00`)
        : new Date(valor);

    if (Number.isNaN(data.getTime())) {
        throw new Error("Data do saldo inicial inválida.");
    }

    return data;
}

function validarDados(dados) {
    if (!dados.nome || !dados.nome.trim()) {
        throw new Error("Informe o nome da conta financeira.");
    }

    if (!TIPOS_CONTA.includes(dados.tipo)) {
        throw new Error("Tipo de conta financeira inválido.");
    }

    const saldoInicial = Number(dados.saldoInicial ?? 0);

    if (!Number.isFinite(saldoInicial)) {
        throw new Error("Saldo inicial inválido.");
    }

    return {
        ...dados,
        nome: dados.nome.trim(),
        saldoInicial,
        dataSaldoInicial: converterData(dados.dataSaldoInicial),
        padrao: Boolean(dados.padrao),
        ativa: dados.ativa === undefined ? true : Boolean(dados.ativa)
    };
}

class ContaFinanceiraService {

    async criar(dados) {
        return contaFinanceiraRepository.criar(validarDados(dados));
    }

    async listar(empresaId, filtros) {
        return contaFinanceiraRepository.listar(empresaId, {
            incluirInativas: filtros.incluirInativas === "true"
        });
    }

    async buscarPorId(id, empresaId) {
        const conta = await contaFinanceiraRepository.buscarPorId(id, empresaId);

        if (!conta) {
            throw new Error("Conta financeira não encontrada.");
        }

        return conta;
    }

    async atualizar(id, dados) {
        await this.buscarPorId(id, dados.empresaId);
        return contaFinanceiraRepository.atualizar(id, validarDados(dados));
    }

    async tornarPadrao(id, empresaId) {
        await this.buscarPorId(id, empresaId);
        return contaFinanceiraRepository.tornarPadrao(id, empresaId);
    }

    async desativar(id, empresaId) {
        await this.buscarPorId(id, empresaId);
        return contaFinanceiraRepository.desativar(id, empresaId);
    }
}

module.exports = new ContaFinanceiraService();
