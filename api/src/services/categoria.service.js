const categoriaRepository = require("../repositories/categoria.repository");

class CategoriaService {

    async criar(dados) {

        const categoria = await categoriaRepository.buscarPorNome(
            dados.nome,
            dados.empresaId
        );

        if (categoria) {
            throw new Error("Já existe uma categoria com este nome.");
        }

        return await categoriaRepository.criar(dados);

    }

    async listar(empresaId) {
        return await categoriaRepository.listar(empresaId);
    }

    async buscarPorId(id) {

        const categoria = await categoriaRepository.buscarPorId(id);

        if (!categoria) {
            throw new Error("Categoria não encontrada.");
        }

        return categoria;

    }

    async atualizar(id, dados) {

        await this.buscarPorId(id);

        return await categoriaRepository.atualizar(id, dados);

    }

    async excluir(id) {

        await this.buscarPorId(id);

        return await categoriaRepository.excluir(id);

    }

}

module.exports = new CategoriaService();