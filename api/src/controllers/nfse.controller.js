const nfseService=require("../services/nfse.service");

class NfseController{
 async validar(req,res){try{const r=await nfseService.validar(Number(req.params.id),req.usuario.empresaId);return res.json({sucesso:true,pronta:r.pronta,pendencias:r.pendencias,notaFiscalServico:r.venda.notaFiscalServico||null});}catch(e){return res.status(400).json({sucesso:false,mensagem:e.message});}}
 async parametros(req,res){try{return res.json({sucesso:true,...await nfseService.consultarParametros(Number(req.params.id),req.usuario.empresaId)});}catch(e){return res.status(422).json({sucesso:false,mensagem:e.message});}}
 async preparar(req,res){try{const r=await nfseService.preparar(Number(req.params.id),req.usuario.empresaId);if(!r.pronta)return res.status(422).json({sucesso:false,mensagem:"Existem pendências para a NFS-e.",...r});return res.json({sucesso:true,...r});}catch(e){return res.status(422).json({sucesso:false,mensagem:e.message});}}
 async gerarDps(req,res){try{const r=await nfseService.gerarDps(Number(req.params.id),req.usuario.empresaId);if(!r.pronta)return res.status(422).json({sucesso:false,...r});return res.json({sucesso:true,...r});}catch(e){return res.status(422).json({sucesso:false,mensagem:e.message});}}
 async emitir(req,res){try{const r=await nfseService.emitir(Number(req.params.id),req.usuario.empresaId);if(!r.pronta)return res.status(422).json({sucesso:false,mensagem:"NFS-e ainda bloqueada para transmissão.",...r});return res.json({sucesso:true,...r});}catch(e){return res.status(422).json({sucesso:false,mensagem:e.message});}}
 async buscar(req,res){try{return res.json({sucesso:true,notaFiscalServico:await nfseService.buscarPorVenda(Number(req.params.id),req.usuario.empresaId)});}catch(e){return res.status(400).json({sucesso:false,mensagem:e.message});}}
}
module.exports=new NfseController();
