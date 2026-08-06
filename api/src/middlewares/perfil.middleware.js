function autorizarPerfis(...perfisPermitidos) {
    return (req, res, next) => {
        if (!req.usuario || !perfisPermitidos.includes(req.usuario.perfil)) {
            return res.status(403).json({
                sucesso: false,
                mensagem: "Você não possui permissão para realizar esta ação."
            });
        }

        return next();
    };
}

module.exports = { autorizarPerfis };
