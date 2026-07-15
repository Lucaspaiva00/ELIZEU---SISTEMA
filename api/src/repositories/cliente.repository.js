const prisma = require("../config/prisma");

class ClienteRepository {

    async criar(dados) {
        return await prisma.cliente.create({
            data: dados
        });
    }

    async listar(empresaId) {
        return await prisma.cliente.findMany({
            where: {
                empresaId
            },
            orderBy: {
                nome: "asc"
            }
        });
    }

    async buscarPorId(id) {
        return await prisma.cliente.findUnique({
            where: {
                id
            }
        });
    }

    async buscarPorCpfCnpj(cpfCnpj, empresaId) {
        return await prisma.cliente.findFirst({
            where: {
                cpfCnpj,
                empresaId
            }
        });
    }

    async atualizar(id, dados) {
        return await prisma.cliente.update({
            where: {
                id
            },
            data: dados
        });
    }

    async excluir(id) {
        return await prisma.cliente.delete({
            where: {
                id
            }
        });
    }

}

module.exports = new ClienteRepository();