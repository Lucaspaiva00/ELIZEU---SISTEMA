function autorizar(permissao) {
    return (req, res, next) => {
        const permissoes = Array.isArray(req.usuario?.permissoes)
            ? req.usuario.permissoes
            : [];

        const permitido =
            req.usuario?.perfil === "ADMIN" ||
            permissoes.includes(permissao);

        if (!permitido) {
            return res.status(403).json({
                sucesso: false,
                codigo: "ACESSO_NEGADO",
                mensagem:
                    "Seu usuário não possui permissão para realizar esta operação. " +
                    "Se necessário, solicite acesso a um administrador."
            });
        }

        return next();
    };
}

function autorizarQualquer(...permissoesNecessarias) {
    return (req, res, next) => {
        const permissoes = Array.isArray(req.usuario?.permissoes)
            ? req.usuario.permissoes
            : [];

        const permitido =
            req.usuario?.perfil === "ADMIN" ||
            permissoesNecessarias.some((permissao) => permissoes.includes(permissao));

        if (!permitido) {
            return res.status(403).json({
                sucesso: false,
                codigo: "ACESSO_NEGADO",
                mensagem:
                    "Seu usuário não possui permissão para acessar este recurso. " +
                    "Se necessário, solicite acesso a um administrador."
            });
        }

        return next();
    };
}

module.exports = { autorizar, autorizarQualquer };
