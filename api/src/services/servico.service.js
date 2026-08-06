const servicoRepository = require("../repositories/servico.repository");

class ServicoService {
    validar(dados) {
        if (!dados.codigo?.trim() || !dados.nome?.trim()) {
            throw new Error("Informe o código e o nome do serviço.");
        }
        if (!Number.isInteger(Number(dados.categoriaId))) {
            throw new Error("Selecione uma categoria de serviço.");
        }
        if (!Array.isArray(dados.variacoes) || !dados.variacoes.length) {
            throw new Error("Cadastre ao menos uma variação do serviço.");
        }
        for (const variacao of dados.variacoes) {
            if (!variacao.codigo?.trim() || !variacao.descricao?.trim()) {
                throw new Error("Toda variação precisa de código e descrição.");
            }
            if (Number(variacao.precoVenda) < 0 || !Number.isFinite(Number(variacao.precoVenda))) {
                throw new Error("Informe um preço de venda válido para todas as variações.");
            }
        }
    }

    listarCategorias(empresaId) {
        return servicoRepository.listarCategorias(empresaId);
    }

    criarCategoria(dados) {
        if (!dados.nome?.trim()) throw new Error("Informe o nome da categoria.");
        return servicoRepository.criarCategoria({
            empresaId: dados.empresaId,
            nome: dados.nome.trim(),
            descricao: dados.descricao || null,
            ativo: dados.ativo ?? true
        });
    }

    async criar(dados) {
        this.validar(dados);
        if (await servicoRepository.buscarPorCodigo(dados.codigo, dados.empresaId)) {
            throw new Error("Já existe um serviço com este código.");
        }
        return servicoRepository.criar({ ...dados, categoriaId: Number(dados.categoriaId) });
    }

    listar(empresaId) {
        return servicoRepository.listar(empresaId);
    }

    async buscarPorId(id, empresaId) {
        const servico = await servicoRepository.buscarPorId(id, empresaId);
        if (!servico) throw new Error("Serviço não encontrado.");
        return servico;
    }

    async atualizar(id, dados) {
        this.validar(dados);
        await this.buscarPorId(id, dados.empresaId);
        const existente = await servicoRepository.buscarPorCodigo(dados.codigo, dados.empresaId);
        if (existente && existente.id !== id) {
            throw new Error("Já existe outro serviço utilizando este código.");
        }
        return servicoRepository.atualizar(id, { ...dados, categoriaId: Number(dados.categoriaId) });
    }

    async excluir(id, empresaId) {
        await this.buscarPorId(id, empresaId);
        return servicoRepository.excluir(id);
    }
}

module.exports = new ServicoService();
