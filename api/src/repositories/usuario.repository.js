const prisma = require("../config/prisma");

class UsuarioRepository {

    async criar(dados) {
        return prisma.usuario.create({
            data: dados
        });
    }

    async buscarPorId(id) {
        return prisma.usuario.findUnique({
            where: {
                id
            }
        });
    }

    async buscarPorEmail(email) {
        return prisma.usuario.findUnique({
            where: {
                email
            }
        });
    }

    async listar(empresaId) {
        return prisma.usuario.findMany({
            where: {
                empresaId
            },
            orderBy: {
                nome: "asc"
            }
        });
    }

    async atualizar(id, dados) {
        return prisma.usuario.update({
            where: {
                id
            },
            data: dados
        });
    }

    async excluir(id) {
        return prisma.usuario.delete({
            where: {
                id
            }
        });
    }

}

module.exports = new UsuarioRepository();