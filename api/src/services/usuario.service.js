const usuarioRepository = require("../repositories/usuario.repository");
const { gerarHash } = require("../utils/bcrypt");

class UsuarioService {

    async criar(dados) {

        const existe = await usuarioRepository.buscarPorEmail(dados.email);

        if (existe) {
            throw new Error("Já existe um usuário com este e-mail.");
        }

        dados.senha = await gerarHash(dados.senha);

        return await usuarioRepository.criar(dados);
    }

    async listar(empresaId) {
        return await usuarioRepository.listar(empresaId);
    }

    async buscarPorId(id) {

        const usuario = await usuarioRepository.buscarPorId(id);

        if (!usuario) {
            throw new Error("Usuário não encontrado.");
        }

        return usuario;
    }

    async atualizar(id, dados) {

        if (dados.senha) {
            dados.senha = await gerarHash(dados.senha);
        }

        return await usuarioRepository.atualizar(id, dados);
    }

    async excluir(id) {
        return await usuarioRepository.excluir(id);
    }

}

module.exports = new UsuarioService();