const fornecedorService = require("../services/fornecedor.service");

class FornecedorController {
    async criar(req, res) {
        try {
            const fornecedor = await fornecedorService.criar({ ...req.body, empresaId: req.usuario.empresaId });
            res.status(201).json({ sucesso: true, fornecedor });
        } catch (error) {
            res.status(400).json({ sucesso: false, mensagem: error.message });
        }
    }

    async listar(req, res) {
        try {
            const fornecedores = await fornecedorService.listar(req.usuario.empresaId);
            res.json({ sucesso: true, fornecedores });
        } catch (error) {
            res.status(400).json({ sucesso: false, mensagem: error.message });
        }
    }

    async buscarPorId(req, res) {
        try {
            const fornecedor = await fornecedorService.buscarPorId(Number(req.params.id), req.usuario.empresaId);
            res.json({ sucesso: true, fornecedor });
        } catch (error) {
            res.status(404).json({ sucesso: false, mensagem: error.message });
        }
    }

    async atualizar(req, res) {
        try {
            const fornecedor = await fornecedorService.atualizar(Number(req.params.id), { ...req.body, empresaId: req.usuario.empresaId });
            res.json({ sucesso: true, fornecedor });
        } catch (error) {
            res.status(400).json({ sucesso: false, mensagem: error.message });
        }
    }

    async excluir(req, res) {
        try {
            const fornecedor = await fornecedorService.excluir(Number(req.params.id), req.usuario.empresaId);
            res.json({ sucesso: true, fornecedor, mensagem: "Fornecedor removido/inativado com sucesso." });
        } catch (error) {
            res.status(400).json({ sucesso: false, mensagem: error.message });
        }
    }
}

module.exports = new FornecedorController();
