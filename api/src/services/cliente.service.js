const clienteRepository = require("../repositories/cliente.repository");

class ClienteService {

    prepararDados(dados) {
        const ehCliente = dados.ehCliente !== false;
        const ehFornecedor = dados.ehFornecedor === true;

        if (!ehCliente && !ehFornecedor) {
            throw new Error("Marque o cadastro como cliente, fornecedor ou ambos.");
        }

        return {
            ...dados,
            ehCliente,
            ehFornecedor,
            pixTipo: String(dados.pixTipo || "").trim() || null,
            pixChave: String(dados.pixChave || "").trim() || null,
            bancoNome: String(dados.bancoNome || "").trim() || null,
            bancoAgencia: String(dados.bancoAgencia || "").trim() || null,
            bancoConta: String(dados.bancoConta || "").trim() || null
        };
    }

    async criar(dados) {
        dados = this.prepararDados(dados);

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
        dados = this.prepararDados(dados);

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