const jwt = require("jsonwebtoken");
const config = require("../config/jwt");
const prisma = require("../config/prisma");
const controleAcessoRepository = require("../repositories/controleAcesso.repository");
const { resolverPermissoes } = require("../config/permissoes");

module.exports = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            sucesso: false,
            mensagem: "Sua sessão não foi identificada. Entre novamente no sistema."
        });
    }

    const [tipo, token] = authHeader.split(" ");

    if (tipo !== "Bearer" || !token) {
        return res.status(401).json({
            sucesso: false,
            mensagem: "Sessão inválida. Entre novamente no sistema."
        });
    }

    try {
        const decoded = jwt.verify(token, config.secret);

        const usuario = await prisma.usuario.findFirst({
            where: {
                id: Number(decoded.id),
                empresaId: Number(decoded.empresaId)
            },
            select: {
                id: true,
                empresaId: true,
                nome: true,
                email: true,
                telefone: true,
                perfil: true,
                ativo: true
            }
        });

        if (!usuario) {
            return res.status(401).json({
                sucesso: false,
                mensagem: "Usuário não encontrado. Entre novamente no sistema."
            });
        }

        if (!usuario.ativo) {
            return res.status(401).json({
                sucesso: false,
                codigo: "USUARIO_BLOQUEADO",
                mensagem: "Seu acesso ao sistema foi bloqueado por um administrador."
            });
        }

        const personalizadas = await controleAcessoRepository.buscar(usuario.id);
        const permissoes = resolverPermissoes(usuario.perfil, personalizadas);

        req.usuario = {
            ...usuario,
            permissoes,
            acessoPersonalizado: Array.isArray(personalizadas)
        };

        return next();
    } catch (error) {
        if (error?.name === "JsonWebTokenError" || error?.name === "TokenExpiredError") {
            return res.status(401).json({
                sucesso: false,
                mensagem: "Sua sessão expirou. Entre novamente no sistema."
            });
        }

        console.error("[Auth] Erro ao validar sessão:", error);

        return res.status(500).json({
            sucesso: false,
            mensagem: "Não foi possível validar sua sessão neste momento."
        });
    }
};
