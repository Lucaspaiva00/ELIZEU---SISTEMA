const categoriaService = require("../services/categoria.service");

class CategoriaController {

    async criar(req, res) {

        try {

            const categoria = await categoriaService.criar({
                ...req.body,
                empresaId: req.usuario.empresaId
            });

            return res.status(201).json({
                sucesso: true,
                categoria
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

            const categorias = await categoriaService.listar(
                req.usuario.empresaId
            );

            return res.json({
                sucesso: true,
                categorias
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

            const categoria = await categoriaService.buscarPorId(
                Number(req.params.id)
            );

            return res.json({
                sucesso: true,
                categoria
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

            const categoria = await categoriaService.atualizar(
                Number(req.params.id),
                req.body
            );

            return res.json({
                sucesso: true,
                categoria
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

            await categoriaService.excluir(Number(req.params.id));

            return res.json({
                sucesso: true,
                mensagem: "Categoria removida com sucesso."
            });

        } catch (error) {

            return res.status(400).json({
                sucesso: false,
                mensagem: error.message
            });

        }

    }

}

module.exports = new CategoriaController();