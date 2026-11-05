const repository = require("../repositories/relatorio.repository");

class RelatorioController {
    async resumo(req,res){
        try{
            const dados=await repository.resumo(req.usuario.empresaId,req.query);
            return res.json({sucesso:true,...dados});
        }catch(error){
            console.error("[Relatórios]",error);
            return res.status(400).json({sucesso:false,mensagem:error.message});
        }
    }

    async estoqueInteligente(req,res){
        try{
            const dados=await repository.estoqueInteligente(req.usuario.empresaId);
            return res.json({sucesso:true,...dados});
        }catch(error){
            console.error("[Estoque inteligente]",error);
            return res.status(400).json({sucesso:false,mensagem:error.message});
        }
    }
}

module.exports = new RelatorioController();
