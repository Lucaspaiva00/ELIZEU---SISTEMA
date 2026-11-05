const clienteRepository = require("../repositories/cliente.repository");

class ClienteService {

    async criar(dados) {

        const cliente = await clienteRepository.buscarPorCpfCnpj(
            dados.cpfCnpj,
            dados.empresaId
        );

        if (cliente) {
            throw new Error("Já existe um cliente com este CPF/CNPJ.");
        }

        return await clienteRepository.criar(dados);

    }

    async listar(empresaId) {
        return await clienteRepository.listar(empresaId);
    }

    async buscarPorId(id) {

        const cliente = await clienteRepository.buscarPorId(id);

        if (!cliente) {
            throw new Error("Cliente não encontrado.");
        }

        return cliente;

    }

    async atualizar(id, dados) {

        await this.buscarPorId(id);

        const cliente = await clienteRepository.buscarPorCpfCnpj(
            dados.cpfCnpj,
            dados.empresaId
        );

        if (cliente && cliente.id !== id) {
            throw new Error("Já existe outro cliente com este CPF/CNPJ.");
        }

        return await clienteRepository.atualizar(id, dados);

    }

    async excluir(id) {

        await this.buscarPorId(id);

        return await clienteRepository.excluir(id);

    }

}

module.exports = new ClienteService();