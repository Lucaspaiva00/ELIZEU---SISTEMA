const jwt = require("jsonwebtoken");
const config = require("../config/jwt");

function gerarToken(usuario) {
    return jwt.sign(
        {
            id: usuario.id,
            empresaId: usuario.empresaId,
            perfil: usuario.perfil
        },
        config.secret,
        {
            expiresIn: config.expiresIn
        }
    );
}

module.exports = {
    gerarToken
};