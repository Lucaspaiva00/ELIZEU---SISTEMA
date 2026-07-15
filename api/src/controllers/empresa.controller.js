const empresaService = require("../services/empresa.service");

class EmpresaController {

    async criar(req, res) {

        try {

            const empresa = await empresaService.criar(req.body);

            return res.status(201).json({
                sucesso: true,
                mensagem: "Empresa cadastrada com sucesso.",
                empresa
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

            const empresas = await empresaService.listar();

            return res.json({
                sucesso: true,
                empresas
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

            const empresa = await empresaService.buscarPorId(
                Number(req.params.id)
            );

            return res.json({
                sucesso: true,
                empresa
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

            const empresa = await empresaService.atualizar(
                Number(req.params.id),
                req.body
            );

            return res.json({
                sucesso: true,
                mensagem: "Empresa atualizada com sucesso.",
                empresa
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

            await empresaService.excluir(Number(req.params.id));

            return res.json({
                sucesso: true,
                mensagem: "Empresa removida com sucesso."
            });

        } catch (error) {

            return res.status(400).json({
                sucesso: false,
                mensagem: error.message
            });

        }

    }

}

module.exports = new EmpresaController();