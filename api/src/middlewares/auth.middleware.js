const jwt = require("jsonwebtoken");

const config = require("../config/jwt");

module.exports = (req, res, next) => {

    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            sucesso: false,
            mensagem: "Token não informado."
        });
    }

    const [, token] = authHeader.split(" ");

    try {

        const decoded = jwt.verify(token, config.secret);

        req.usuario = decoded;

        next();

    } catch (error) {

        return res.status(401).json({
            sucesso: false,
            mensagem: "Token inválido."
        });

    }

};