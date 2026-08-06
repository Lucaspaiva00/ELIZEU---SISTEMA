const servicoService = require("../services/servico.service");

class ServicoController {
    async listarCategorias(req, res) {
        try {
            const categorias = await servicoService.listarCategorias(req.usuario.empresaId);
            return res.json({ sucesso: true, categorias });
        } catch (error) {
            return res.status(400).json({ sucesso: false, mensagem: error.message });
        }
    }

    async criarCategoria(req, res) {
        try {
            const categoria = await servicoService.criarCategoria({ ...req.body, empresaId: req.usuario.empresaId });
            return res.status(201).json({ sucesso: true, categoria });
        } catch (error) {
            return res.status(400).json({ sucesso: false, mensagem: error.message });
        }
    }

    async criar(req, res) {
        try {
            const servico = await servicoService.criar({ ...req.body, empresaId: req.usuario.empresaId });
            return res.status(201).json({ sucesso: true, servico });
        } catch (error) {
            return res.status(400).json({ sucesso: false, mensagem: error.message });
        }
    }

    async listar(req, res) {
        try {
            const servicos = await servicoService.listar(req.usuario.empresaId);
            return res.json({ sucesso: true, servicos });
        } catch (error) {
            return res.status(400).json({ sucesso: false, mensagem: error.message });
        }
    }

    async buscarPorId(req, res) {
        try {
            const servico = await servicoService.buscarPorId(Number(req.params.id), req.usuario.empresaId);
            return res.json({ sucesso: true, servico });
        } catch (error) {
            return res.status(404).json({ sucesso: false, mensagem: error.message });
        }
    }

    async atualizar(req, res) {
        try {
            const servico = await servicoService.atualizar(Number(req.params.id), { ...req.body, empresaId: req.usuario.empresaId });
            return res.json({ sucesso: true, servico });
        } catch (error) {
            return res.status(400).json({ sucesso: false, mensagem: error.message });
        }
    }

    async excluir(req, res) {
        try {
            await servicoService.excluir(Number(req.params.id), req.usuario.empresaId);
            return res.json({ sucesso: true, mensagem: "Serviço removido com sucesso." });
        } catch (error) {
            return res.status(400).json({ sucesso: false, mensagem: error.message });
        }
    }
}

module.exports = new ServicoController();
