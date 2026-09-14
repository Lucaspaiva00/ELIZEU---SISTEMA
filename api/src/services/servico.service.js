const servicoRepository = require("../repositories/servico.repository");

class ServicoService {
    normalizarCodigo(valor) {
        const codigo = String(valor ?? "").trim();
        return codigo || null;
    }

    validar(dados) {
        if (!dados.nome?.trim()) {
            throw new Error("Informe o nome do serviço.");
        }

        if (!Number.isInteger(Number(dados.categoriaId))) {
            throw new Error("Selecione uma categoria de serviço.");
        }

        if (!Array.isArray(dados.variacoes) || !dados.variacoes.length) {
            throw new Error("Cadastre ao menos uma variação do serviço.");
        }

        for (const variacao of dados.variacoes) {
            if (!String(variacao.descricao || "").trim()) {
                throw new Error("Toda variação precisa de uma descrição.");
            }

            if (Number(variacao.precoVenda) < 0 || !Number.isFinite(Number(variacao.precoVenda))) {
                throw new Error("Informe um preço de venda válido para todas as variações.");
            }

            if (Number(variacao.precoCusto) < 0 || !Number.isFinite(Number(variacao.precoCusto ?? 0))) {
                throw new Error("Informe um custo válido para todas as variações.");
            }
        }
    }

    async resolverCodigo(dados, servicoAtual = null) {
        const codigoInformado = this.normalizarCodigo(dados.codigo);

        if (dados.codigoAutomatico === true) {
            return servicoRepository.gerarCodigoAutomatico(dados.empresaId);
        }

        if (codigoInformado) return codigoInformado;

        if (servicoAtual?.codigo) return servicoAtual.codigo;

        // Compatibilidade: novos cadastros sem código passam a usar o automático.
        return servicoRepository.gerarCodigoAutomatico(dados.empresaId);
    }

    async proximoCodigoVariacao(codigoServico, reservados = new Set()) {
        let sequencia = 1;

        while (true) {
            const candidato = `${codigoServico}-V${String(sequencia).padStart(2, "0")}`;
            const chave = candidato.toLowerCase();
            const existente = await servicoRepository.buscarVariacaoPorCodigo(candidato);

            if (!reservados.has(chave) && !existente) {
                return candidato;
            }

            sequencia += 1;
        }
    }

    async prepararVariacoes(variacoes, codigoServico, variacoesAtuais = []) {
        const atuaisPorId = new Map(
            (variacoesAtuais || []).map((variacao) => [Number(variacao.id), variacao])
        );
        const reservados = new Set();
        const resultado = [];

        for (const variacaoOriginal of variacoes) {
            const variacao = { ...variacaoOriginal };
            const id = Number(variacao.id);
            const idValido = Number.isInteger(id) && id > 0;
            let codigo = this.normalizarCodigo(variacao.codigo);

            if (!codigo && idValido && atuaisPorId.get(id)?.codigo) {
                codigo = atuaisPorId.get(id).codigo;
            }

            if (!codigo) {
                codigo = await this.proximoCodigoVariacao(codigoServico, reservados);
            }

            const chave = codigo.toLowerCase();

            if (reservados.has(chave)) {
                throw new Error(`O código de variação ${codigo} está repetido.`);
            }

            const existente = await servicoRepository.buscarVariacaoPorCodigo(codigo);
            if (existente && (!idValido || existente.id !== id)) {
                throw new Error(`Já existe uma variação utilizando o código ${codigo}.`);
            }

            reservados.add(chave);
            resultado.push({
                ...variacao,
                id: idValido ? id : null,
                codigo,
                descricao: String(variacao.descricao || "").trim(),
                precoCusto: Number(variacao.precoCusto || 0),
                precoVenda: Number(variacao.precoVenda || 0),
                ativo: variacao.ativo ?? true
            });
        }

        return resultado;
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

        const codigo = await this.resolverCodigo(dados);

        if (await servicoRepository.buscarPorCodigo(codigo, dados.empresaId)) {
            throw new Error("Já existe um serviço com este código.");
        }

        const variacoes = await this.prepararVariacoes(dados.variacoes, codigo);

        return servicoRepository.criar({
            ...dados,
            codigo,
            categoriaId: Number(dados.categoriaId),
            variacoes
        });
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

        const servicoAtual = await this.buscarPorId(id, dados.empresaId);
        const codigo = await this.resolverCodigo(dados, servicoAtual);
        const existente = await servicoRepository.buscarPorCodigo(codigo, dados.empresaId);

        if (existente && existente.id !== id) {
            throw new Error("Já existe outro serviço utilizando este código.");
        }

        const variacoes = await this.prepararVariacoes(
            dados.variacoes,
            codigo,
            servicoAtual.variacoes || []
        );

        return servicoRepository.atualizar(id, {
            ...dados,
            codigo,
            categoriaId: Number(dados.categoriaId),
            variacoes
        });
    }

    async excluir(id, empresaId) {
        await this.buscarPorId(id, empresaId);
        return servicoRepository.excluir(id);
    }
}

module.exports = new ServicoService();
