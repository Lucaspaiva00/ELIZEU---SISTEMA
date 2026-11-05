const prisma = require("../config/prisma");

class ClienteResumoRepository {
    async buscar(id, empresaId) {
        const cliente = await prisma.cliente.findFirst({ where: { id, empresaId } });
        if (!cliente) throw new Error("Cliente não encontrado.");

        const [orcamentos, vendas, contas] = await Promise.all([
            prisma.orcamento.findMany({
                where: { empresaId, clienteId: id },
                select: { id:true, numero:true, status:true, total:true, criadoEm:true },
                orderBy: { criadoEm:"desc" }
            }),
            prisma.venda.findMany({
                where: { empresaId, clienteId: id },
                select: { id:true, numero:true, status:true, total:true, dataVenda:true, lucroEstimado:true },
                orderBy: { dataVenda:"desc" }
            }),
            prisma.contaReceber.findMany({
                where: { empresaId, clienteId: id },
                select: { id:true, descricao:true, valorOriginal:true, valorRecebido:true, status:true, dataVencimento:true, dataRecebimento:true },
                orderBy: { dataVencimento:"desc" }
            })
        ]);

        const vendasValidas = vendas.filter(v => v.status !== "CANCELADA");
        const totalComprado = vendasValidas.reduce((s,v)=>s+Number(v.total||0),0);
        const recebido = contas.reduce((s,c)=>s+Number(c.valorRecebido||0),0);
        const emAberto = contas.filter(c=>["PENDENTE","PARCIAL","ATRASADO"].includes(c.status))
            .reduce((s,c)=>s+Math.max(0,Number(c.valorOriginal||0)-Number(c.valorRecebido||0)),0);
        const vencido = contas.filter(c=>c.status==="ATRASADO")
            .reduce((s,c)=>s+Math.max(0,Number(c.valorOriginal||0)-Number(c.valorRecebido||0)),0);

        const timeline = [];
        orcamentos.forEach(o=>timeline.push({ tipo:"ORCAMENTO", data:o.criadoEm, titulo:`Orçamento #${String(o.numero).padStart(5,"0")}`, descricao:o.status, valor:Number(o.total||0) }));
        vendas.forEach(v=>timeline.push({ tipo:"VENDA", data:v.dataVenda, titulo:`Venda #${String(v.numero).padStart(5,"0")}`, descricao:v.status, valor:Number(v.total||0) }));
        contas.forEach(c=>{
            if(Number(c.valorRecebido||0)>0 && c.dataRecebimento){
                timeline.push({ tipo:"RECEBIMENTO", data:c.dataRecebimento, titulo:"Recebimento registrado", descricao:c.descricao, valor:Number(c.valorRecebido||0) });
            }
        });
        timeline.sort((a,b)=>new Date(b.data)-new Date(a.data));

        return {
            cliente,
            indicadores:{
                totalComprado,
                quantidadeVendas:vendasValidas.length,
                ticketMedio:vendasValidas.length ? totalComprado/vendasValidas.length : 0,
                recebido, emAberto, vencido,
                quantidadeOrcamentos:orcamentos.length
            },
            timeline:timeline.slice(0,30),
            orcamentos:orcamentos.slice(0,10),
            vendas:vendas.slice(0,10),
            contas:contas.slice(0,10)
        };
    }
}

module.exports = new ClienteResumoRepository();
