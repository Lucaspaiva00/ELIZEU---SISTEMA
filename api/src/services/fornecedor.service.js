const fornecedorRepository = require("../repositories/fornecedor.repository");

class FornecedorService {
    prepararDados(dados) {
        if (!dados.tipoPessoa) throw new Error("Selecione o tipo de pessoa.");
        if (!String(dados.nome || "").trim()) throw new Error("Informe o nome/razão social do fornecedor.");
        if (!String(dados.cpfCnpj || "").trim()) throw new Error("Informe o CPF/CNPJ do fornecedor.");

        return {
            empresaId: dados.empresaId,
            tipoPessoa: dados.tipoPessoa,
            nome: String(dados.nome).trim(),
            nomeFantasia: String(dados.nomeFantasia || "").trim() || null,
            cpfCnpj: String(dados.cpfCnpj).trim(),
            inscricaoEstadual: String(dados.inscricaoEstadual || "").trim() || null,
            telefone: String(dados.telefone || "").trim() || null,
            celular: String(dados.celular || "").trim() || null,
            email: String(dados.email || "").trim() || null,
            cep: String(dados.cep || "").trim() || null,
            endereco: String(dados.endereco || "").trim() || null,
            numero: String(dados.numero || "").trim() || null,
            complemento: String(dados.complemento || "").trim() || null,
            bairro: String(dados.bairro || "").trim() || null,
            cidade: String(dados.cidade || "").trim() || null,
            estado: String(dados.estado || "").trim().toUpperCase() || null,
            pixTipo: String(dados.pixTipo || "").trim() || null,
            pixChave: String(dados.pixChave || "").trim() || null,
            bancoNome: String(dados.bancoNome || "").trim() || null,
            bancoAgencia: String(dados.bancoAgencia || "").trim() || null,
            bancoConta: String(dados.bancoConta || "").trim() || null,
            observacoes: String(dados.observacoes || "").trim() || null,
            ativo: dados.ativo !== false
        };
    }

    async criar(dados) {
        const preparados = this.prepararDados(dados);
        const existe = await fornecedorRepository.buscarPorCpfCnpj(preparados.cpfCnpj, preparados.empresaId);
        if (existe) throw new Error("Já existe um fornecedor com este CPF/CNPJ.");
        return fornecedorRepository.criar(preparados);
    }

    async listar(empresaId) {
        return fornecedorRepository.listar(empresaId);
    }

    async buscarPorId(id, empresaId) {
        const fornecedor = await fornecedorRepository.buscarPorId(id, empresaId);
        if (!fornecedor) throw new Error("Fornecedor não encontrado.");
        return fornecedor;
    }

    async atualizar(id, dados) {
        await this.buscarPorId(id, dados.empresaId);
        const preparados = this.prepararDados(dados);
        const existe = await fornecedorRepository.buscarPorCpfCnpj(preparados.cpfCnpj, preparados.empresaId);
        if (existe && existe.id !== id) throw new Error("Já existe outro fornecedor com este CPF/CNPJ.");
        delete preparados.empresaId;
        return fornecedorRepository.atualizar(id, preparados);
    }

    async excluir(id, empresaId) {
        await this.buscarPorId(id, empresaId);
        return fornecedorRepository.excluir(id);
    }
}

module.exports = new FornecedorService();
