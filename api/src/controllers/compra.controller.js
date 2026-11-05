const compraService = require("../services/compra.service");

class CompraController {
    async listar(req,res) {
        try {
            const compras = await compraService.listar(req.usuario.empresaId, req.query);
            return res.json({ sucesso:true, compras });
        } catch (e) {
            return res.status(400).json({ sucesso:false, mensagem:e.message });
        }
    }
    async buscarPorId(req,res) {
        try {
            const compra = await compraService.buscarPorId(Number(req.params.id), req.usuario.empresaId);
            if (!compra) return res.status(404).json({ sucesso:false, mensagem:"Compra não encontrada." });
            return res.json({ sucesso:true, compra });
        } catch (e) {
            return res.status(400).json({ sucesso:false, mensagem:e.message });
        }
    }
    async apoio(req,res) {
        try {
            const apoio = await compraService.apoio(req.usuario.empresaId);
            return res.json({ sucesso:true, ...apoio });
        } catch(e) {
            return res.status(400).json({ sucesso:false, mensagem:e.message });
        }
    }
    async criar(req,res) {
        try {
            const compra = await compraService.criar({
                ...req.body,
                empresaId:req.usuario.empresaId,
                usuarioId:req.usuario.id
            });
            return res.status(201).json({ sucesso:true, mensagem:"Compra registrada. Estoque e financeiro atualizados.", compra });
        } catch(e) {
            return res.status(400).json({ sucesso:false, mensagem:e.message });
        }
    }
    async cancelar(req,res) {
        try {
            const compra = await compraService.cancelar(req.params.id, {
                ...req.body,
                empresaId:req.usuario.empresaId,
                usuarioId:req.usuario.id
            });
            return res.json({ sucesso:true, mensagem:"Compra cancelada e estoque estornado.", compra });
        } catch(e) {
            return res.status(400).json({ sucesso:false, mensagem:e.message });
        }
    }
    async resumoFornecedor(req,res) {
        try {
            const resumo = await compraService.resumoFornecedor(Number(req.params.fornecedorId), req.usuario.empresaId);
            return res.json({ sucesso:true, resumo });
        } catch(e) {
            return res.status(400).json({ sucesso:false, mensagem:e.message });
        }
    }
}
module.exports = new CompraController();
