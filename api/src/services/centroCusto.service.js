const repository = require("../repositories/centroCusto.repository");
class CentroCustoService {
    validar(dados){if(!dados.codigo?.trim())throw new Error("Informe o código do centro de custo.");if(!dados.nome?.trim())throw new Error("Informe o nome do centro de custo.");return{...dados,codigo:dados.codigo.trim().toUpperCase(),nome:dados.nome.trim(),descricao:dados.descricao?.trim()||null,ativo:dados.ativo===undefined?true:Boolean(dados.ativo)};}
    listar(empresaId,filtros){return repository.listar(empresaId,filtros.incluirInativos==="true");}
    async buscarPorId(id,empresaId){const item=await repository.buscarPorId(id,empresaId);if(!item)throw new Error("Centro de custo não encontrado.");return item;}
    criar(dados){return repository.criar(this.validar(dados));}
    async atualizar(id,dados){await this.buscarPorId(id,dados.empresaId);return repository.atualizar(id,this.validar(dados));}
    async desativar(id,empresaId){await this.buscarPorId(id,empresaId);return repository.desativar(id);}
}
module.exports = new CentroCustoService();
