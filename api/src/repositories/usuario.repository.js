const prisma = require("../config/prisma");

const selecaoPublica = {
    id: true,
    empresaId: true,
    nome: true,
    email: true,
    telefone: true,
    perfil: true,
    ativo: true,
    ultimoLogin: true,
    criadoEm: true,
    atualizadoEm: true
};

class UsuarioRepository {

    async criar(dados) {
        return prisma.usuario.create({
            data: dados,
            select: selecaoPublica
        });
    }

    async buscarPorId(id, empresaId) {
        return prisma.usuario.findFirst({
            where: {
                id,
                empresaId
            },
            select: selecaoPublica
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
            select: selecaoPublica,
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
            data: dados,
            select: selecaoPublica
        });
    }

    async contarAdminsAtivos(empresaId) {
        return prisma.usuario.count({
            where: { empresaId, perfil: "ADMIN", ativo: true }
        });
    }

    async registrarUltimoLogin(id) {
        return prisma.usuario.update({
            where: { id },
            data: { ultimoLogin: new Date() }
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
