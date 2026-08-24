const produtoRepository = require("../repositories/produto.repository");

class ProdutoService {
    normalizarCodigo(valor) {
        const codigo = String(valor ?? "").trim();
        return codigo || null;
    }

    async resolverCodigo(dados, produtoAtual = null) {
        const codigoInformado = this.normalizarCodigo(dados.codigo);

        if (dados.codigoAutomatico === true) {
            return produtoRepository.gerarCodigoAutomatico(dados.empresaId);
        }

        if (codigoInformado) return codigoInformado;

        if (produtoAtual) return produtoAtual.codigo;

        throw new Error("Informe o código do produto ou marque a geração automática.");
    }

    async criar(dados) {
        const codigo = await this.resolverCodigo(dados);

        const existe = await produtoRepository.buscarPorCodigo(codigo, dados.empresaId);
        if (existe) throw new Error("Já existe um produto com este código.");

        return produtoRepository.criar({ ...dados, codigo });
    }

    async listar(empresaId) {
        return produtoRepository.listar(empresaId);
    }

    async buscarPorId(id) {
        const produto = await produtoRepository.buscarPorId(id);
        if (!produto) throw new Error("Produto não encontrado.");
        return produto;
    }

    async atualizar(id, dados) {
        const produtoAtual = await this.buscarPorId(id);
        const codigo = await this.resolverCodigo(dados, produtoAtual);

        const existente = await produtoRepository.buscarPorCodigo(codigo, dados.empresaId);
        if (existente && existente.id !== id) {
            throw new Error("Já existe outro produto utilizando este código.");
        }

        return produtoRepository.atualizar(id, { ...dados, codigo });
    }

    async excluir(id) {
        await this.buscarPorId(id);
        return produtoRepository.excluir(id);
    }
}

module.exports = new ProdutoService();
