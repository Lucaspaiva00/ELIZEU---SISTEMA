const repository = require("../repositories/categoriaFinanceira.repository");
const NATUREZAS = ["RECEITA", "DESPESA", "AMBAS"];

class CategoriaFinanceiraService {
    validar(dados, id = null) {
        if (!dados.nome?.trim()) throw new Error("Informe o nome da categoria.");
        if (!NATUREZAS.includes(dados.natureza)) throw new Error("Natureza financeira inválida.");
        const categoriaPaiId = dados.categoriaPaiId ? Number(dados.categoriaPaiId) : null;
        if (id && categoriaPaiId === id) throw new Error("A categoria não pode ser filha dela mesma.");
        return { ...dados, nome: dados.nome.trim(), descricao: dados.descricao?.trim() || null, categoriaPaiId, ativa: dados.ativa === undefined ? true : Boolean(dados.ativa) };
    }
    listar(empresaId, filtros) { return repository.listar(empresaId, filtros.incluirInativas === "true"); }
    async buscarPorId(id, empresaId) { const item = await repository.buscarPorId(id, empresaId); if (!item) throw new Error("Categoria financeira não encontrada."); return item; }
    async criar(dados) { const validados = this.validar(dados); await repository.validarPai(validados.categoriaPaiId, dados.empresaId); return repository.criar(validados); }
    async atualizar(id, dados) { await this.buscarPorId(id, dados.empresaId); const validados = this.validar(dados, id); await repository.validarPai(validados.categoriaPaiId, dados.empresaId); return repository.atualizar(id, validados); }
    async desativar(id, empresaId) { await this.buscarPorId(id, empresaId); return repository.desativar(id); }
}
module.exports = new CategoriaFinanceiraService();
