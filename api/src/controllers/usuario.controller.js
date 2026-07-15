const usuarioService = require("../services/usuario.service");

class UsuarioController {

    async criar(req, res) {

        try {

            const usuario = await usuarioService.criar(req.body);

            return res.status(201).json({
                sucesso: true,
                mensagem: "Usuário criado com sucesso.",
                usuario
            });

        } catch (error) {

            return res.status(400).json({
                sucesso: false,
                mensagem: error.message
            });

        }

    }

    async listar(req, res) {

        try {

            const usuarios = await usuarioService.listar(req.usuario.empresaId);

            return res.json({
                sucesso: true,
                usuarios
            });

        } catch (error) {

            return res.status(400).json({
                sucesso: false,
                mensagem: error.message
            });

        }

    }

    async buscarPorId(req, res) {

        try {

            const usuario = await usuarioService.buscarPorId(Number(req.params.id));

            return res.json({
                sucesso: true,
                usuario
            });

        } catch (error) {

            return res.status(404).json({
                sucesso: false,
                mensagem: error.message
            });

        }

    }

    async atualizar(req, res) {

        try {

            const usuario = await usuarioService.atualizar(
                Number(req.params.id),
                req.body
            );

            return res.json({
                sucesso: true,
                mensagem: "Usuário atualizado com sucesso.",
                usuario
            });

        } catch (error) {

            return res.status(400).json({
                sucesso: false,
                mensagem: error.message
            });

        }

    }

    async excluir(req, res) {

        try {

            await usuarioService.excluir(Number(req.params.id));

            return res.json({
                sucesso: true,
                mensagem: "Usuário removido com sucesso."
            });

        } catch (error) {

            return res.status(400).json({
                sucesso: false,
                mensagem: error.message
            });

        }

    }

}

module.exports = new UsuarioController();