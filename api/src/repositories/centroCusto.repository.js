const prisma = require("../config/prisma");
class CentroCustoRepository {
    listar(empresaId,incluirInativos){return prisma.centroCusto.findMany({where:{empresaId,...(incluirInativos?{}:{ativo:true})},include:{_count:{select:{contasReceber:true,contasPagar:true,movimentacoes:true}}},orderBy:{nome:"asc"}});}
    buscarPorId(id,empresaId){return prisma.centroCusto.findFirst({where:{id,empresaId},include:{_count:{select:{contasReceber:true,contasPagar:true,movimentacoes:true}}}});}
    criar(dados){return prisma.centroCusto.create({data:{empresaId:dados.empresaId,codigo:dados.codigo,nome:dados.nome,descricao:dados.descricao,ativo:dados.ativo}});}
    atualizar(id,dados){return prisma.centroCusto.update({where:{id},data:{codigo:dados.codigo,nome:dados.nome,descricao:dados.descricao,ativo:dados.ativo}});}
    desativar(id){return prisma.centroCusto.update({where:{id},data:{ativo:false}});}
}
module.exports = new CentroCustoRepository();
