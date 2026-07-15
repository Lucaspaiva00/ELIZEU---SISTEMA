const prisma = require("../config/prisma");

class EmpresaRepository {

    async criar(dados) {
        return await prisma.empresa.create({
            data: dados
        });
    }

    async listar() {
        return await prisma.empresa.findMany({
            orderBy: {
                razaoSocial: "asc"
            }
        });
    }

    async buscarPorId(id) {
        return await prisma.empresa.findUnique({
            where: {
                id
            }
        });
    }

    async buscarPorCnpj(cnpj) {
        return await prisma.empresa.findUnique({
            where: {
                cnpj
            }
        });
    }

    async atualizar(id, dados) {
        return await prisma.empresa.update({
            where: {
                id
            },
            data: dados
        });
    }

    async excluir(id) {
        return await prisma.empresa.delete({
            where: {
                id
            }
        });
    }

    async contar() {
        return await prisma.empresa.count();
    }

    async primeira() {
        return await prisma.empresa.findFirst();
    }

}

module.exports = new EmpresaRepository();