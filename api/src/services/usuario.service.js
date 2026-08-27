const usuarioRepository = require("../repositories/usuario.repository");
const controleAcessoRepository = require("../repositories/controleAcesso.repository");
const { gerarHash } = require("../utils/bcrypt");
const {
    normalizarPermissoes,
    resolverPermissoes,
    permissoesPadraoPerfil,
    catalogoParaCliente,
    PERFIS_PADRAO
} = require("../config/permissoes");

const PERFIS = ["ADMIN", "GERENTE", "VENDEDOR", "FINANCEIRO", "ESTOQUE", "FISCAL"];

function emailNormalizado(email) {
    return String(email || "").trim().toLowerCase();
}

class UsuarioService {
    validarDados(dados, criacao = false) {
        if (!String(dados.nome || "").trim()) {
            throw new Error("Informe o nome do usuário.");
        }

        if (!/^\S+@\S+\.\S+$/.test(emailNormalizado(dados.email))) {
            throw new Error("Informe um e-mail válido.");
        }

        if (!PERFIS.includes(dados.perfil)) {
            throw new Error("Perfil de usuário inválido.");
        }

        if (criacao && String(dados.senha || "").length < 6) {
            throw new Error("A senha inicial deve possuir pelo menos 6 caracteres.");
        }

        if (dados.permissoes !== undefined && dados.permissoes !== null && !Array.isArray(dados.permissoes)) {
            throw new Error("As permissões informadas são inválidas.");
        }
    }

    async anexarControleAcesso(usuario) {
        if (!usuario) return usuario;

        const personalizadas = await controleAcessoRepository.buscar(usuario.id);

        return {
            ...usuario,
            permissoes: resolverPermissoes(usuario.perfil, personalizadas),
            permissoesPadrao: permissoesPadraoPerfil(usuario.perfil),
            acessoPersonalizado: Array.isArray(personalizadas)
        };
    }

    async persistirPermissoes(usuarioId, perfil, permissoes) {
        if (perfil === "ADMIN") {
            await controleAcessoRepository.remover(usuarioId);
            return;
        }

        if (permissoes === undefined) {
            return;
        }

        if (permissoes === null) {
            await controleAcessoRepository.remover(usuarioId);
            return;
        }

        const normalizadas = normalizarPermissoes(permissoes);
        const padrao = permissoesPadraoPerfil(perfil);
        const iguaisAoPadrao =
            normalizadas.length === padrao.length &&
            [...normalizadas].sort().every((item, indice) => item === [...padrao].sort()[indice]);

        if (iguaisAoPadrao) {
            await controleAcessoRepository.remover(usuarioId);
            return;
        }

        await controleAcessoRepository.salvar(usuarioId, normalizadas);
    }

    async criar(dados) {
        this.validarDados(dados, true);
        const email = emailNormalizado(dados.email);

        if (await usuarioRepository.buscarPorEmail(email)) {
            throw new Error("Já existe um usuário com este e-mail.");
        }

        const usuario = await usuarioRepository.criar({
            empresaId: dados.empresaId,
            nome: String(dados.nome).trim(),
            email,
            telefone: String(dados.telefone || "").trim() || null,
            perfil: dados.perfil,
            ativo: dados.ativo ?? true,
            senha: await gerarHash(dados.senha)
        });

        await this.persistirPermissoes(usuario.id, usuario.perfil, dados.permissoes);

        return this.anexarControleAcesso(usuario);
    }

    async listar(empresaId) {
        const usuarios = await usuarioRepository.listar(empresaId);
        return Promise.all(usuarios.map((usuario) => this.anexarControleAcesso(usuario)));
    }

    async buscarPorId(id, empresaId) {
        const usuario = await usuarioRepository.buscarPorId(id, empresaId);
        if (!usuario) throw new Error("Usuário não encontrado.");
        return this.anexarControleAcesso(usuario);
    }

    async atualizar(id, empresaId, dados, usuarioLogadoId) {
        const atual = await this.buscarPorId(id, empresaId);
        this.validarDados(dados);

        const email = emailNormalizado(dados.email);
        const outro = await usuarioRepository.buscarPorEmail(email);

        if (outro && outro.id !== id) {
            throw new Error("Já existe outro usuário com este e-mail.");
        }

        const ativo = dados.ativo ?? atual.ativo;

        if (id === usuarioLogadoId && !ativo) {
            throw new Error("Você não pode desativar o próprio usuário.");
        }

        if (atual.perfil === "ADMIN" && (dados.perfil !== "ADMIN" || !ativo)) {
            const quantidade = await usuarioRepository.contarAdminsAtivos(empresaId);
            if (quantidade <= 1) {
                throw new Error("A empresa precisa manter ao menos um administrador ativo.");
            }
        }

        const usuario = await usuarioRepository.atualizar(id, {
            nome: String(dados.nome).trim(),
            email,
            telefone: String(dados.telefone || "").trim() || null,
            perfil: dados.perfil,
            ativo
        });

        await this.persistirPermissoes(id, usuario.perfil, dados.permissoes);

        return this.anexarControleAcesso(usuario);
    }

    async alterarStatus(id, empresaId, ativo, usuarioLogadoId) {
        const usuario = await this.buscarPorId(id, empresaId);

        if (id === usuarioLogadoId && !ativo) {
            throw new Error("Você não pode desativar o próprio usuário.");
        }

        if (usuario.perfil === "ADMIN" && !ativo) {
            const quantidade = await usuarioRepository.contarAdminsAtivos(empresaId);
            if (quantidade <= 1) {
                throw new Error("A empresa precisa manter ao menos um administrador ativo.");
            }
        }

        const atualizado = await usuarioRepository.atualizar(id, { ativo: Boolean(ativo) });
        return this.anexarControleAcesso(atualizado);
    }

    async redefinirSenha(id, empresaId, novaSenha) {
        await this.buscarPorId(id, empresaId);

        if (String(novaSenha || "").length < 6) {
            throw new Error("A nova senha deve possuir pelo menos 6 caracteres.");
        }

        return usuarioRepository.atualizar(id, { senha: await gerarHash(novaSenha) });
    }

    catalogoPermissoes() {
        return {
            grupos: catalogoParaCliente(),
            perfisPadrao: Object.fromEntries(
                Object.keys(PERFIS_PADRAO).map((perfil) => [
                    perfil,
                    permissoesPadraoPerfil(perfil)
                ])
            )
        };
    }
}

module.exports = new UsuarioService();
