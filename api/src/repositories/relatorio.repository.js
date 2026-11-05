const prisma = require("../config/prisma");

function n(valor){ return Number(valor || 0); }
function inicioDia(valor){
    if(!valor) return null;
    const d = /^\d{4}-\d{2}-\d{2}$/.test(String(valor)) ? new Date(`${valor}T00:00:00`) : new Date(valor);
    return Number.isNaN(d.getTime()) ? null : d;
}
function fimDia(valor){
    const d=inicioDia(valor);
    if(!d) return null;
    d.setHours(23,59,59,999);
    return d;
}
function periodoPadrao(inicio,fim){
    const hoje=new Date();
    const ini=inicioDia(inicio) || new Date(hoje.getFullYear(),hoje.getMonth(),1);
    const ate=fimDia(fim) || new Date(hoje.getFullYear(),hoje.getMonth()+1,0,23,59,59,999);
    return { inicio:ini, fim:ate };
}

class RelatorioRepository {
    async resumo(empresaId, filtros={}) {
        const periodo=periodoPadrao(filtros.inicio,filtros.fim);

        const [vendas, compras, recebimentos, pagamentos] = await Promise.all([
            prisma.venda.findMany({
                where:{ empresaId, status:{ not:"CANCELADA" }, dataVenda:{ gte:periodo.inicio, lte:periodo.fim } },
                include:{ cliente:true },
                orderBy:{ dataVenda:"desc" }
            }),
            prisma.compra.findMany({
                where:{ empresaId, status:"CONFIRMADA", dataCompra:{ gte:periodo.inicio, lte:periodo.fim } },
                include:{ fornecedor:true },
                orderBy:{ dataCompra:"desc" }
            }),
            prisma.contaReceber.findMany({
                where:{ empresaId, dataRecebimento:{ gte:periodo.inicio, lte:periodo.fim }, valorRecebido:{ gt:0 } },
                select:{ valorRecebido:true }
            }),
            prisma.contaPagar.findMany({
                where:{ empresaId, dataPagamento:{ gte:periodo.inicio, lte:periodo.fim }, valorPago:{ gt:0 } },
                select:{ valorPago:true }
            })
        ]);

        const receita = vendas.reduce((s,v)=>s+n(v.total),0);
        const custoItens = vendas.reduce((s,v)=>s+n(v.custoItensTotal),0);
        const custosInternos = vendas.reduce((s,v)=>s+n(v.custoInternoTotal),0);
        const lucro = receita - custoItens - custosInternos;
        const margem = receita > 0 ? (lucro/receita)*100 : 0;
        const recebido = recebimentos.reduce((s,c)=>s+n(c.valorRecebido),0);
        const pago = pagamentos.reduce((s,c)=>s+n(c.valorPago),0);
        const resultadoCaixa = recebido - pago;
        const totalCompras = compras.reduce((s,c)=>s+n(c.total),0);

        const porFornecedor = new Map();
        compras.forEach(c=>{
            const id=c.fornecedorId;
            const atual=porFornecedor.get(id)||{
                fornecedorId:id,
                nome:c.fornecedor?.nomeFantasia||c.fornecedor?.nome||"Fornecedor",
                compras:0,
                valor:0
            };
            atual.compras += 1;
            atual.valor += n(c.total);
            porFornecedor.set(id,atual);
        });

        const vendasRentabilidade = vendas.map(v=>{
            const total=n(v.total);
            const custo=n(v.custoItensTotal)+n(v.custoInternoTotal);
            const lucroVenda=total-custo;
            return {
                id:v.id,
                numero:v.numero,
                dataVenda:v.dataVenda,
                cliente:v.cliente?.nome||"Cliente",
                total,
                custo,
                lucro:lucroVenda,
                margem:total>0?(lucroVenda/total)*100:0
            };
        }).sort((a,b)=>b.lucro-a.lucro);

        return {
            periodo,
            dre:{
                receita,
                custoItens,
                custosInternos,
                lucro,
                margem,
                recebido,
                pago,
                resultadoCaixa,
                totalCompras
            },
            comprasPorFornecedor:[...porFornecedor.values()].sort((a,b)=>b.valor-a.valor),
            vendasRentabilidade
        };
    }

    async estoqueInteligente(empresaId) {
        const hoje=new Date();
        const inicio90=new Date(hoje);
        inicio90.setDate(inicio90.getDate()-90);

        const produtos = await prisma.produto.findMany({
            where:{ empresaId, ativo:true, controlaEstoque:true },
            include:{
                categoria:true,
                variacoes:{
                    where:{ ativo:true },
                    select:{
                        id:true,
                        estoqueAtual:true,
                        movimentacoesEstoque:{
                            where:{
                                dataMovimentacao:{ gte:inicio90 },
                                tipo:{ in:["SAIDA","AJUSTE_SAIDA"] },
                                origem:{ not:"CANCELAMENTO" }
                            },
                            select:{ quantidade:true, origem:true }
                        }
                    }
                },
                movimentacoesEstoque:{
                    where:{
                        dataMovimentacao:{ gte:inicio90 },
                        tipo:{ in:["SAIDA","AJUSTE_SAIDA"] },
                        origem:{ not:"CANCELAMENTO" }
                    },
                    select:{ quantidade:true, origem:true }
                }
            },
            orderBy:{ nome:"asc" }
        });

        const itens=produtos.map(p=>{
            const saidaPrincipal=(p.movimentacoesEstoque||[]).reduce((s,m)=>s+n(m.quantidade),0);
            const saidaVariacoes=(p.variacoes||[]).reduce((s,v)=>
                s+(v.movimentacoesEstoque||[]).reduce((x,m)=>x+n(m.quantidade),0),0);
            const consumo90=Math.max(saidaPrincipal,saidaVariacoes);
            const consumoDia=consumo90/90;
            const demanda30=consumoDia*30;
            const minimo=n(p.estoqueMinimo);
            const atual=n(p.estoqueAtual);
            const seguranca=Math.max(minimo,demanda30*0.20);
            const alvo=Math.max(minimo,demanda30+seguranca);
            const sugerido=Math.max(0,Math.ceil((alvo-atual)*1000)/1000);
            const coberturaDias=consumoDia>0?atual/consumoDia:null;
            const estoqueEstimadoMedio=Math.max(1,atual+(consumo90/2));
            const giro90=consumo90/estoqueEstimadoMedio;
            const custo=n(p.custoMedio||p.ultimoCusto);
            const valorEstoque=atual*custo;

            let situacao="SAUDAVEL";
            if(atual<=minimo) situacao="REPOR";
            else if(coberturaDias!==null && coberturaDias<30) situacao="ATENCAO";
            else if(consumo90===0 && atual>0) situacao="PARADO";

            return {
                id:p.id,
                codigo:p.codigo,
                nome:p.nome,
                categoria:p.categoria?.nome||"",
                unidadeMedida:p.unidadeMedida,
                estoqueAtual:atual,
                estoqueMinimo:minimo,
                custoMedio:custo,
                valorEstoque,
                consumo90,
                demanda30,
                coberturaDias,
                giro90,
                sugestaoCompra:sugerido,
                custoReposicao:sugerido*custo,
                situacao
            };
        });

        const resumo={
            valorEstoque:itens.reduce((s,i)=>s+i.valorEstoque,0),
            custoReposicao:itens.reduce((s,i)=>s+i.custoReposicao,0),
            precisamReposicao:itens.filter(i=>i.sugestaoCompra>0).length,
            parados:itens.filter(i=>i.situacao==="PARADO").length
        };

        return {
            resumo,
            itens:itens.sort((a,b)=>{
                const peso={REPOR:0,ATENCAO:1,PARADO:2,SAUDAVEL:3};
                return (peso[a.situacao]-peso[b.situacao]) || (b.custoReposicao-a.custoReposicao);
            })
        };
    }
}

module.exports = new RelatorioRepository();
