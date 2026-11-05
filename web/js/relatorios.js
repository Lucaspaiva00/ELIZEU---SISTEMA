function moedaRel(v){return Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});}
function numRel(v,d=2){return Number(v||0).toLocaleString("pt-BR",{maximumFractionDigits:d});}
function dataRel(v){return v?new Date(v).toLocaleDateString("pt-BR"):"—";}
function escRel(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");}
function isoLocal(d){const off=d.getTimezoneOffset();return new Date(d.getTime()-off*60000).toISOString().slice(0,10);}

document.addEventListener("DOMContentLoaded",()=>{
 const hoje=new Date();
 document.getElementById("relFim").value=isoLocal(hoje);
 document.getElementById("relInicio").value=isoLocal(new Date(hoje.getFullYear(),hoje.getMonth(),1));
 carregarRelatorios();
});

async function carregarRelatorios(){
 await Promise.all([carregarResumoRelatorio(),carregarEstoqueInteligente()]);
}

async function carregarResumoRelatorio(){
 const inicio=document.getElementById("relInicio").value;
 const fim=document.getElementById("relFim").value;
 const r=await get(`/relatorios/resumo?inicio=${encodeURIComponent(inicio)}&fim=${encodeURIComponent(fim)}`);
 if(!r?.sucesso){mostrarMensagem(r?.mensagem||"Erro ao carregar relatórios.");return;}
 const d=r.dre||{};
 document.getElementById("rpReceita").textContent=moedaRel(d.receita);
 document.getElementById("rpLucro").textContent=moedaRel(d.lucro);
 document.getElementById("rpMargem").textContent=`Margem ${numRel(d.margem)}%`;
 document.getElementById("rpCaixa").textContent=moedaRel(d.resultadoCaixa);
 document.getElementById("rpCaixaDetalhe").textContent=`${moedaRel(d.recebido)} recebido • ${moedaRel(d.pago)} pago`;
 document.getElementById("rpCompras").textContent=moedaRel(d.totalCompras);
 document.getElementById("dreReceita").textContent=moedaRel(d.receita);
 document.getElementById("dreCustoItens").textContent=moedaRel(d.custoItens);
 document.getElementById("dreCustosInternos").textContent=moedaRel(d.custosInternos);
 document.getElementById("dreResultado").textContent=moedaRel(d.lucro);
 document.getElementById("dreMargem").textContent=`${numRel(d.margem)}%`;
 document.getElementById("dreRecebido").textContent=moedaRel(d.recebido);
 document.getElementById("drePago").textContent=moedaRel(d.pago);

 const fornecedores=r.comprasPorFornecedor||[];
 document.getElementById("tblFornecedores").innerHTML=fornecedores.length?fornecedores.map(f=>`<tr><td><strong>${escRel(f.nome)}</strong></td><td>${f.compras}</td><td><strong>${moedaRel(f.valor)}</strong></td></tr>`).join(""):'<tr><td colspan="3" class="text-center">Sem compras no período.</td></tr>';

 const vendas=r.vendasRentabilidade||[];
 document.getElementById("tblRentabilidade").innerHTML=vendas.length?vendas.map(v=>`<tr><td>#${String(v.numero).padStart(5,"0")}</td><td>${dataRel(v.dataVenda)}</td><td>${escRel(v.cliente)}</td><td>${moedaRel(v.total)}</td><td>${moedaRel(v.custo)}</td><td><strong>${moedaRel(v.lucro)}</strong></td><td>${numRel(v.margem)}%</td></tr>`).join(""):'<tr><td colspan="7" class="text-center">Sem vendas no período.</td></tr>';
}

async function carregarEstoqueInteligente(){
 const r=await get("/relatorios/estoque-inteligente");
 if(!r?.sucesso){mostrarMensagem(r?.mensagem||"Erro ao analisar estoque.");return;}
 const s=r.resumo||{};
 document.getElementById("estValor").textContent=moedaRel(s.valorEstoque);
 document.getElementById("estRepor").textContent=s.precisamReposicao||0;
 document.getElementById("estCustoReposicao").textContent=moedaRel(s.custoReposicao);
 document.getElementById("estParados").textContent=s.parados||0;
 const itens=r.itens||[];
 const cls={REPOR:"st-repor",ATENCAO:"st-atencao",PARADO:"st-parado",SAUDAVEL:"st-saudavel"};
 const nomes={REPOR:"Repor",ATENCAO:"Atenção",PARADO:"Parado",SAUDAVEL:"Saudável"};
 document.getElementById("tblEstoqueInteligente").innerHTML=itens.length?itens.map(i=>`<tr>
   <td><strong>${escRel(i.codigo)} — ${escRel(i.nome)}</strong><br><small>${escRel(i.categoria||"")}</small></td>
   <td>${numRel(i.estoqueAtual,3)} ${escRel(i.unidadeMedida||"UN")}</td>
   <td>${numRel(i.consumo90,3)}</td>
   <td>${i.coberturaDias===null?"Sem consumo":numRel(i.coberturaDias,0)+" dias"}</td>
   <td>${numRel(i.giro90,2)}x / 90d</td>
   <td><strong>${numRel(i.sugestaoCompra,3)} ${escRel(i.unidadeMedida||"UN")}</strong></td>
   <td>${moedaRel(i.custoReposicao)}</td>
   <td><span class="status-pill ${cls[i.situacao]||"st-saudavel"}">${nomes[i.situacao]||i.situacao}</span></td>
 </tr>`).join(""):'<tr><td colspan="8" class="text-center">Nenhum produto controlado em estoque.</td></tr>';
}
