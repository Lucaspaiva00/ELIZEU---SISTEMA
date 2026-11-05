const prisma = require("../config/prisma");

class FornecedorRepository {
    async criar(dados) {
        return prisma.fornecedor.create({ data: dados });
    }

    async listar(empresaId) {
        return prisma.fornecedor.findMany({
            where: { empresaId, ativo: true },
            orderBy: { nome: "asc" }
        });
    }

    async buscarPorId(id, empresaId) {
        return prisma.fornecedor.findFirst({ where: { id, empresaId } });
    }

    async buscarPorCpfCnpj(cpfCnpj, empresaId) {
        return prisma.fornecedor.findFirst({ where: { cpfCnpj, empresaId } });
    }

    async atualizar(id, dados) {
        return prisma.fornecedor.update({ where: { id }, data: dados });
    }

    async excluir(id) {
        const contas = await prisma.contaPagar.count({ where: { fornecedorId: id } });
        if (contas > 0) {
            return prisma.fornecedor.update({ where: { id }, data: { ativo: false } });
        }
        return prisma.fornecedor.delete({ where: { id } });
    }
}

module.exports = new FornecedorRepository();
