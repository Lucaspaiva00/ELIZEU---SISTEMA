const orcamentoRepository = require("../repositories/orcamento.repository");

class OrcamentoService {

    async criar(dados) {

        if (!dados.itens || dados.itens.length === 0) {
            throw new Error("O orçamento deve possuir ao menos um item.");
        }

        return await orcamentoRepository.criar(dados);

    }

    async listar(empresaId) {
        return await orcamentoRepository.listar(empresaId);
    }

    async buscarPorId(id) {

        const orcamento = await orcamentoRepository.buscarPorId(id);

        if (!orcamento) {
            throw new Error("Orçamento não encontrado.");
        }

        return orcamento;

    }

    async atualizar(id, dados) {

        await this.buscarPorId(id);

        if (!dados.itens || dados.itens.length === 0) {
            throw new Error("O orçamento deve possuir ao menos um item.");
        }

        return await orcamentoRepository.atualizar(id, dados);

    }

    async excluir(id) {

        await this.buscarPorId(id);

        return await orcamentoRepository.excluir(id);

    }

}

module.exports = new OrcamentoService();