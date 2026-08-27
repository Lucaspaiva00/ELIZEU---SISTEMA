const usuarioService = require("../services/usuario.service");

class UsuarioController {
    async criar(req, res) {
        try {
            const usuario = await usuarioService.criar({
                ...req.body,
                empresaId: req.usuario.empresaId
            });

            return res.status(201).json({
                sucesso: true,
                mensagem: "Usuário criado com sucesso.",
                usuario
            });
        } catch (error) {
            return res.status(400).json({ sucesso: false, mensagem: error.message });
        }
    }

    async listar(req, res) {
        try {
            const usuarios = await usuarioService.listar(req.usuario.empresaId);
            return res.json({ sucesso: true, usuarios });
        } catch (error) {
            return res.status(400).json({ sucesso: false, mensagem: error.message });
        }
    }

    async catalogoPermissoes(req, res) {
        return res.json({
            sucesso: true,
            ...usuarioService.catalogoPermissoes()
        });
    }

    async buscarPorId(req, res) {
        try {
            const usuario = await usuarioService.buscarPorId(
                Number(req.params.id),
                req.usuario.empresaId
            );

            return res.json({ sucesso: true, usuario });
        } catch (error) {
            return res.status(404).json({ sucesso: false, mensagem: error.message });
        }
    }

    async atualizar(req, res) {
        try {
            const usuario = await usuarioService.atualizar(
                Number(req.params.id),
                req.usuario.empresaId,
                req.body,
                req.usuario.id
            );

            return res.json({
                sucesso: true,
                mensagem: "Usuário e permissões atualizados com sucesso.",
                usuario
            });
        } catch (error) {
            return res.status(400).json({ sucesso: false, mensagem: error.message });
        }
    }

    async alterarStatus(req, res) {
        try {
            const usuario = await usuarioService.alterarStatus(
                Number(req.params.id),
                req.usuario.empresaId,
                req.body.ativo,
                req.usuario.id
            );

            return res.json({
                sucesso: true,
                mensagem: usuario.ativo ? "Usuário ativado." : "Usuário desativado.",
                usuario
            });
        } catch (error) {
            return res.status(400).json({ sucesso: false, mensagem: error.message });
        }
    }

    async redefinirSenha(req, res) {
        try {
            await usuarioService.redefinirSenha(
                Number(req.params.id),
                req.usuario.empresaId,
                req.body.novaSenha
            );

            return res.json({ sucesso: true, mensagem: "Senha redefinida com sucesso." });
        } catch (error) {
            return res.status(400).json({ sucesso: false, mensagem: error.message });
        }
    }
}

module.exports = new UsuarioController();
