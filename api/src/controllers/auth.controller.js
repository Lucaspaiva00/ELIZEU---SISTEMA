const authService = require("../services/auth.service");

class AuthController {
    async login(req, res) {
        try {
            const { email, senha } = req.body;

            if (!email || !senha) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "E-mail e senha são obrigatórios."
                });
            }

            const resultado = await authService.login(email, senha);

            return res.status(200).json({
                sucesso: true,
                mensagem: "Login realizado com sucesso.",
                ...resultado
            });
        } catch (error) {
            return res.status(401).json({
                sucesso: false,
                mensagem: error.message
            });
        }
    }

    async me(req, res) {
        return res.json({
            sucesso: true,
            usuario: {
                id: req.usuario.id,
                empresaId: req.usuario.empresaId,
                nome: req.usuario.nome,
                email: req.usuario.email,
                telefone: req.usuario.telefone,
                perfil: req.usuario.perfil,
                permissoes: req.usuario.permissoes,
                acessoPersonalizado: req.usuario.acessoPersonalizado
            }
        });
    }

    async bootstrap(req, res) {
        try {
            const resultado = await authService.bootstrap(req.body);

            return res.status(201).json({
                sucesso: true,
                mensagem: "Sistema inicializado com sucesso.",
                ...resultado
            });
        } catch (error) {
            return res.status(400).json({
                sucesso: false,
                mensagem: error.message
            });
        }
    }
}

module.exports = new AuthController();
