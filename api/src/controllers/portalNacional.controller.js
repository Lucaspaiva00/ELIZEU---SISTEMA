const repository = require("../repositories/portalNacional.repository");

class PortalNacionalController {
    async status(req,res){
        try{
            const status=await repository.status(req.usuario.empresaId);
            return res.json({sucesso:true,status});
        }catch(error){
            return res.status(400).json({sucesso:false,mensagem:error.message});
        }
    }

    async testar(req,res){
        try{
            const resultado=await repository.testar(req.usuario.empresaId);
            const ok=resultado.statusHttp >= 200 && resultado.statusHttp < 300;
            return res.status(ok?200:400).json({
                sucesso:ok,
                mensagem:ok
                    ? "Conexão com o Portal Nacional validada com o certificado A1."
                    : "O Portal Nacional respondeu, mas rejeitou a consulta. Revise os dados fiscais.",
                resultado
            });
        }catch(error){
            return res.status(400).json({sucesso:false,mensagem:error.message});
        }
    }
}

module.exports = new PortalNacionalController();
