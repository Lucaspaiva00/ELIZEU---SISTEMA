const produtoRepository = require("../repositories/produto.repository");

class ProdutoService {
    normalizarCodigo(valor) {
        const codigo = String(valor ?? "").trim();
        return codigo || null;
    }

    normalizarComposicao(composicao) {
        if (!Array.isArray(composicao)) return [];

        return composicao
            .map((item, index) => {
                const produtoId = Number(item?.produtoId);
                const variacaoProdutoId = Number(item?.variacaoProdutoId);
                const nome = String(item?.nome || "").trim();
                const variacaoNome = String(item?.variacaoNome || "").trim();
                const sku = String(item?.sku || "").trim();
                const quantidade = Number(item?.quantidade ?? 1);
                const custoUnitario = Number(item?.custoUnitario ?? 0);
                const produtoIdValido = Number.isInteger(produtoId) && produtoId > 0;
                const variacaoProdutoIdValido =
                    Number.isInteger(variacaoProdutoId) && variacaoProdutoId > 0;

                const linhaVazia =
                    !nome &&
                    !produtoIdValido &&
                    (!Number.isFinite(custoUnitario) || custoUnitario === 0);

                if (linhaVazia) return null;

                if (!nome) {
                    throw new Error(`Informe o item/material da composição ${index + 1}.`);
                }

                if (produtoIdValido && !variacaoProdutoIdValido) {
                    throw new Error(`Selecione a variação do item ${nome} na composição ${index + 1}.`);
                }

                if (!Number.isFinite(quantidade) || quantidade <= 0) {
                    throw new Error(`A quantidade da composição ${index + 1} deve ser maior que zero.`);
                }

                if (!Number.isFinite(custoUnitario) || custoUnitario < 0) {
                    throw new Error(`O custo unitário da composição ${index + 1} é inválido.`);
                }

                return {
                    produtoId: produtoIdValido ? produtoId : null,
                    variacaoProdutoId: produtoIdValido && variacaoProdutoIdValido
                        ? variacaoProdutoId
                        : null,
                    variacaoNome: variacaoNome || null,
                    sku: sku || null,
                    nome,
                    quantidade,
                    custoUnitario,
                    total: Math.round((quantidade * custoUnitario + Number.EPSILON) * 100) / 100
                };
            })
            .filter(Boolean);
    }

    calcularCustoComposicao(composicao) {
        return Math.round(
            (composicao.reduce((total, item) => total + Number(item.total || 0), 0) + Number.EPSILON) * 100
        ) / 100;
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

    prepararDados(dados) {
        const composicao = this.normalizarComposicao(dados.composicao);
        const custoComposicao = this.calcularCustoComposicao(composicao);
        const margemLucroPadrao = Number(dados.margemLucroPadrao ?? 0);

        if (!Number.isFinite(margemLucroPadrao) || margemLucroPadrao < 0 || margemLucroPadrao >= 100) {
            throw new Error("A margem desejada deve estar entre 0% e 99,99%.");
        }

        return {
            ...dados,
            descricao: String(dados.descricao || "").trim() || null,
            composicao,
            custoComposicao,
            margemLucroPadrao
        };
    }

    async criar(dados) {
        const preparados = this.prepararDados(dados);
        const codigo = await this.resolverCodigo(preparados);

        const existe = await produtoRepository.buscarPorCodigo(codigo, preparados.empresaId);
        if (existe) throw new Error("Já existe um produto com este código.");

        return produtoRepository.criar({ ...preparados, codigo });
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
        const preparados = this.prepararDados(dados);
        const codigo = await this.resolverCodigo(preparados, produtoAtual);

        const existente = await produtoRepository.buscarPorCodigo(codigo, preparados.empresaId);
        if (existente && existente.id !== id) {
            throw new Error("Já existe outro produto utilizando este código.");
        }

        return produtoRepository.atualizar(id, { ...preparados, codigo });
    }

    async excluir(id) {
        await this.buscarPorId(id);
        return produtoRepository.excluir(id);
    }
}

module.exports = new ProdutoService();
