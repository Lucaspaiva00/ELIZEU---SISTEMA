const repository = require("../repositories/clienteResumo.repository");

class ClienteResumoController {
    async buscar(req,res){
        try{
            const resumo = await repository.buscar(Number(req.params.id), req.usuario.empresaId);
            return res.json({ sucesso:true, resumo });
        }catch(error){
            return res.status(404).json({ sucesso:false, mensagem:error.message });
        }
    }
}

module.exports = new ClienteResumoController();
