const prisma = require("../config/prisma");

class CategoriaFinanceiraRepository {
    listar(empresaId, incluirInativas) { return prisma.categoriaFinanceira.findMany({ where: { empresaId, ...(incluirInativas ? {} : { ativa: true }) }, include: { categoriaPai: { select: { id: true, nome: true } }, _count: { select: { contasReceber: true, contasPagar: true, movimentacoes: true, subcategorias: true } } }, orderBy: [{ natureza: "asc" }, { nome: "asc" }] }); }
    buscarPorId(id, empresaId) { return prisma.categoriaFinanceira.findFirst({ where: { id, empresaId }, include: { categoriaPai: true, _count: { select: { contasReceber: true, contasPagar: true, movimentacoes: true, subcategorias: true } } } }); }
    async validarPai(id, empresaId) { if (!id) return; const pai = await prisma.categoriaFinanceira.findFirst({ where: { id, empresaId, ativa: true } }); if (!pai) throw new Error("Categoria superior inválida."); }
    criar(dados) { return prisma.categoriaFinanceira.create({ data: { empresaId: dados.empresaId, nome: dados.nome, natureza: dados.natureza, descricao: dados.descricao, categoriaPaiId: dados.categoriaPaiId, ativa: dados.ativa } }); }
    atualizar(id, dados) { return prisma.categoriaFinanceira.update({ where: { id }, data: { nome: dados.nome, natureza: dados.natureza, descricao: dados.descricao, categoriaPaiId: dados.categoriaPaiId, ativa: dados.ativa } }); }
    desativar(id) { return prisma.categoriaFinanceira.update({ where: { id }, data: { ativa: false } }); }
}
module.exports = new CategoriaFinanceiraRepository();
