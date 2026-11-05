const repository = require("../repositories/auditoria.repository");

class AuditoriaController {
    async listar(req,res) {
        try {
            const resultado = await repository.listar(req.usuario.empresaId, req.query);
            return res.json({ sucesso:true, ...resultado });
        } catch (error) {
            return res.status(400).json({ sucesso:false, mensagem:error.message });
        }
    }
}

module.exports = new AuditoriaController();
