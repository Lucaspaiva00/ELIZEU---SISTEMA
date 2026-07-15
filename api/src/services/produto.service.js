const produtoRepository = require("../repositories/produto.repository");

class ProdutoService {

    async criar(dados) {

        const existe = await produtoRepository.buscarPorCodigo(
            dados.codigo,
            dados.empresaId
        );

        if (existe) {
            throw new Error("Já existe um produto com este código.");
        }

        return await produtoRepository.criar(dados);

    }

    async listar(empresaId) {
        return await produtoRepository.listar(empresaId);
    }

    async buscarPorId(id) {

        const produto = await produtoRepository.buscarPorId(id);

        if (!produto) {
            throw new Error("Produto não encontrado.");
        }

        return produto;

    }

    async atualizar(id, dados) {

        await this.buscarPorId(id);

        const codigo = await produtoRepository.buscarPorCodigo(
            dados.codigo,
            dados.empresaId
        );

        if (codigo && codigo.id !== id) {
            throw new Error("Já existe outro produto utilizando este código.");
        }

        return await produtoRepository.atualizar(id, dados);

    }

    async excluir(id) {

        await this.buscarPorId(id);

        return await produtoRepository.excluir(id);

    }

}

module.exports = new ProdutoService();