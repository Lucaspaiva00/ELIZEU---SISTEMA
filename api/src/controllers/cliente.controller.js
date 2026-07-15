const clienteService = require("../services/cliente.service");

class ClienteController {

    async criar(req, res) {

        try {

            const cliente = await clienteService.criar({
                ...req.body,
                empresaId: req.usuario.empresaId
            });

            return res.status(201).json({
                sucesso: true,
                cliente
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

            const clientes = await clienteService.listar(
                req.usuario.empresaId
            );

            return res.json({
                sucesso: true,
                clientes
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

            const cliente = await clienteService.buscarPorId(
                Number(req.params.id)
            );

            return res.json({
                sucesso: true,
                cliente
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

            const cliente = await clienteService.atualizar(
                Number(req.params.id),
                {
                    ...req.body,
                    empresaId: req.usuario.empresaId
                }
            );

            return res.json({
                sucesso: true,
                cliente
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

            await clienteService.excluir(
                Number(req.params.id)
            );

            return res.json({
                sucesso: true,
                mensagem: "Cliente removido com sucesso."
            });

        } catch (error) {

            return res.status(400).json({
                sucesso: false,
                mensagem: error.message
            });

        }

    }

}

module.exports = new ClienteController();