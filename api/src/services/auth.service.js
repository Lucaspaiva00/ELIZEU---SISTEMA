const usuarioRepository = require("../repositories/usuario.repository");
const empresaRepository = require("../repositories/empresa.repository");

const { gerarToken } = require("../utils/jwt");

const {
    gerarHash,
    compararHash
} = require("../utils/bcrypt");

class AuthService {

    async login(email, senha) {

        const usuario = await usuarioRepository.buscarPorEmail(email);

        if (!usuario) {
            throw new Error("E-mail ou senha inválidos.");
        }

        if (!usuario.ativo) {
            throw new Error("Usuário desativado.");
        }

        const senhaValida = await compararHash(senha, usuario.senha);

        if (!senhaValida) {
            throw new Error("E-mail ou senha inválidos.");
        }

        return {
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                perfil: usuario.perfil,
                empresaId: usuario.empresaId
            },
            token: gerarToken(usuario)
        };
    }
    async bootstrap(dados) {

        const quantidade = await empresaRepository.contar();

        if (quantidade > 0) {
            throw new Error("Sistema já inicializado.");
        }

        const empresa = await empresaRepository.criar({
            razaoSocial: dados.razaoSocial,
            nomeFantasia: dados.nomeFantasia,
            cnpj: dados.cnpj,
            email: dados.email,
            telefone: dados.telefone
        });

        const senha = await gerarHash(dados.senha);

        const usuario = await usuarioRepository.criar({

            empresaId: empresa.id,

            nome: dados.nome,

            email: dados.emailUsuario,

            senha,

            perfil: "ADMIN"

        });

        return {
            empresa,
            usuario
        };

    }

}


module.exports = new AuthService();