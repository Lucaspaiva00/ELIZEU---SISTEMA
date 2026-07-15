const prisma = require("../config/prisma");

class CategoriaRepository {

    async criar(dados) {
        return await prisma.categoriaProduto.create({
            data: dados
        });
    }

    async listar(empresaId) {
        return await prisma.categoriaProduto.findMany({
            where: {
                empresaId
            },
            orderBy: {
                nome: "asc"
            }
        });
    }

    async buscarPorId(id) {
        return await prisma.categoriaProduto.findUnique({
            where: {
                id
            }
        });
    }

    async buscarPorNome(nome, empresaId) {
        return await prisma.categoriaProduto.findFirst({
            where: {
                nome,
                empresaId
            }
        });
    }

    async atualizar(id, dados) {
        return await prisma.categoriaProduto.update({
            where: {
                id
            },
            data: dados
        });
    }

    async excluir(id) {
        return await prisma.categoriaProduto.delete({
            where: {
                id
            }
        });
    }

}

module.exports = new CategoriaRepository();