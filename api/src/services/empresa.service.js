const empresaRepository = require("../repositories/empresa.repository");

class EmpresaService {

    async criar(dados) {

        const empresa = await empresaRepository.buscarPorCnpj(dados.cnpj);

        if (empresa) {
            throw new Error("Já existe uma empresa cadastrada com este CNPJ.");
        }

        return await empresaRepository.criar(dados);

    }

    async listar() {
        return await empresaRepository.listar();
    }

    async buscarPorId(id) {

        const empresa = await empresaRepository.buscarPorId(id);

        if (!empresa) {
            throw new Error("Empresa não encontrada.");
        }

        return empresa;

    }

    async atualizar(id, dados) {

        await this.buscarPorId(id);

        return await empresaRepository.atualizar(id, dados);

    }

    async excluir(id) {

        await this.buscarPorId(id);

        return await empresaRepository.excluir(id);

    }

}

module.exports = new EmpresaService();