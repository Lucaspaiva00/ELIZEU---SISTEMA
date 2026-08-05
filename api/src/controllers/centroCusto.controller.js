const service = require("../services/centroCusto.service");
class CentroCustoController {
    async listar(req,res){try{return res.json({sucesso:true,centrosCusto:await service.listar(req.usuario.empresaId,req.query)});}catch(e){return res.status(400).json({sucesso:false,mensagem:e.message});}}
    async buscarPorId(req,res){try{return res.json({sucesso:true,centroCusto:await service.buscarPorId(Number(req.params.id),req.usuario.empresaId)});}catch(e){return res.status(404).json({sucesso:false,mensagem:e.message});}}
    async criar(req,res){try{return res.status(201).json({sucesso:true,centroCusto:await service.criar({...req.body,empresaId:req.usuario.empresaId})});}catch(e){return res.status(400).json({sucesso:false,mensagem:e.message});}}
    async atualizar(req,res){try{return res.json({sucesso:true,centroCusto:await service.atualizar(Number(req.params.id),{...req.body,empresaId:req.usuario.empresaId})});}catch(e){return res.status(400).json({sucesso:false,mensagem:e.message});}}
    async desativar(req,res){try{return res.json({sucesso:true,mensagem:"Centro de custo desativado.",centroCusto:await service.desativar(Number(req.params.id),req.usuario.empresaId)});}catch(e){return res.status(400).json({sucesso:false,mensagem:e.message});}}
}
module.exports = new CentroCustoController();
