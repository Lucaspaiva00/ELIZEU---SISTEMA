let compras = [];
let fornecedoresCompra = [];
let produtosCompra = [];
let sequenciaItemCompra = 0;

document.addEventListener("DOMContentLoaded", async () => {
  await carregarApoioCompra();
  await carregarCompras();
});

function moedaCompra(v){return Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});}
function dataCompra(v){return v?new Date(v).toLocaleDateString("pt-BR"):"—";}
function escCompra(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");}
function hojeIso(){const d=new Date();const off=d.getTimezoneOffset();return new Date(d.getTime()-off*60000).toISOString().slice(0,10);}
function em30Dias(){const d=new Date();d.setDate(d.getDate()+30);const off=d.getTimezoneOffset();return new Date(d.getTime()-off*60000).toISOString().slice(0,10);}

async function carregarApoioCompra(){
  const r=await get("/compras/apoio");
  if(!r?.sucesso){mostrarMensagem(r?.mensagem||"Erro ao carregar apoio de compras.");return;}
  fornecedoresCompra=r.fornecedores||[];
  produtosCompra=r.produtos||[];
  const sel=document.getElementById("compraFornecedor");
  sel.innerHTML='<option value="">Selecione...</option>'+fornecedoresCompra.map(f=>`<option value="${f.id}">${escCompra(f.nomeFantasia||f.nome)} — ${escCompra(f.cpfCnpj)}</option>`).join("");
}

async function carregarCompras(){
  const r=await get("/compras");
  if(!r?.sucesso){mostrarMensagem(r?.mensagem||"Erro ao carregar compras.");return;}
  compras=r.compras||[];
  renderizarCompras();
  atualizarKpisCompra();
}

function atualizarKpisCompra(){
  const validas=compras.filter(c=>c.status==="CONFIRMADA");
  const total=validas.reduce((s,c)=>s+Number(c.total||0),0);
  let aberto=0,vencido=0;
  validas.forEach(c=>(c.contasPagar||[]).forEach(p=>{
    const saldo=Math.max(0,Number(p.valorOriginal||0)-Number(p.valorPago||0));
    if(["PENDENTE","PARCIAL","ATRASADO"].includes(p.status)) aberto+=saldo;
    if(p.status==="ATRASADO") vencido+=saldo;
  }));
  document.getElementById("kpiCompras").textContent=validas.length;
  document.getElementById("kpiTotal").textContent=moedaCompra(total);
  document.getElementById("kpiAberto").textContent=moedaCompra(aberto);
  document.getElementById("kpiVencido").textContent=moedaCompra(vencido);
}

function renderizarCompras(){
  const q=(document.getElementById("pesquisaCompra")?.value||"").toLowerCase();
  const status=document.getElementById("statusCompraFiltro")?.value||"";
  const lista=compras.filter(c=>{
    const txt=[c.numero,c.numeroDocumento,c.fornecedor?.nome,c.fornecedor?.nomeFantasia].join(" ").toLowerCase();
    return (!q||txt.includes(q))&&(!status||c.status===status);
  });
  const tbody=document.getElementById("tabelaCompras");
  if(!lista.length){tbody.innerHTML='<tr><td colspan="9" class="text-center">Nenhuma compra encontrada.</td></tr>';return;}
  tbody.innerHTML=lista.map(c=>{
    const aberto=(c.contasPagar||[]).filter(p=>["PENDENTE","PARCIAL","ATRASADO"].includes(p.status)).reduce((s,p)=>s+Math.max(0,Number(p.valorOriginal)-Number(p.valorPago)),0);
    return `<tr>
      <td><strong>#${String(c.numero).padStart(5,"0")}</strong></td>
      <td>${dataCompra(c.dataCompra)}</td>
      <td><strong>${escCompra(c.fornecedor?.nomeFantasia||c.fornecedor?.nome||"—")}</strong></td>
      <td>${escCompra(c.numeroDocumento||"—")}</td>
      <td>${c.itens?.length||0}</td>
      <td><strong>${moedaCompra(c.total)}</strong></td>
      <td>${aberto>0?moedaCompra(aberto):'<span class="text-muted">Sem saldo</span>'}</td>
      <td><span class="status-chip ${c.status==="CONFIRMADA"?"status-ok":"status-cancel"}">${c.status==="CONFIRMADA"?"Confirmada":"Cancelada"}</span></td>
      <td><div class="table-actions">${c.status==="CONFIRMADA"?`<button class="btn btn-danger" title="Cancelar compra" onclick="cancelarCompra(${c.id})"><i class="fas fa-ban"></i></button>`:""}</div></td>
    </tr>`;
  }).join("");
}

function abrirNovaCompra(){
  document.getElementById("compraData").value=hojeIso();
  document.getElementById("compraVencimento").value=em30Dias();
  document.getElementById("compraDocumento").value="";
  document.getElementById("compraFornecedor").value="";
  document.getElementById("compraDesconto").value=0;
  document.getElementById("compraFrete").value=0;
  document.getElementById("compraOutras").value=0;
  document.getElementById("compraParcelas").value=1;
  document.getElementById("compraFormaPagamento").value="";
  document.getElementById("compraGerarFinanceiro").checked=true;
  document.getElementById("compraObservacoes").value="";
  document.getElementById("itensCompra").innerHTML="";
  adicionarItemCompra();
  alternarFinanceiroCompra();
  recalcularCompra();
  document.getElementById("modalCompra").classList.add("active");
}
function fecharCompra(){document.getElementById("modalCompra").classList.remove("active");}

function adicionarItemCompra(){
  const id=++sequenciaItemCompra;
  const div=document.createElement("div");
  div.className="purchase-item";
  div.dataset.item=id;
  div.innerHTML=`
    <div class="form-group produto-col"><label>Produto</label><select class="form-control item-produto" onchange="preencherCustoCompra(this);recalcularCompra()"><option value="">Selecione...</option>${produtosCompra.map(p=>`<option value="${p.id}" data-custo="${Number(p.ultimoCusto||p.custoMedio||0)}">${escCompra(p.codigo)} — ${escCompra(p.nome)} | Estoque: ${Number(p.estoqueAtual||0)}</option>`).join("")}</select></div>
    <div class="form-group"><label>Qtd.</label><input type="number" min="0.001" step="0.001" class="form-control item-qtd" value="1" oninput="recalcularCompra()"></div>
    <div class="form-group"><label>Custo unit.</label><input type="number" min="0.01" step="0.01" class="form-control item-custo" value="0" oninput="recalcularCompra()"></div>
    <div class="form-group"><label>Total</label><input class="form-control item-total" value="R$ 0,00" readonly></div>
    <button class="btn btn-danger" type="button" onclick="removerItemCompra(this)" title="Remover"><i class="fas fa-trash"></i></button>`;
  document.getElementById("itensCompra").appendChild(div);
}
function removerItemCompra(btn){const itens=document.querySelectorAll(".purchase-item");if(itens.length<=1){mostrarMensagem("A compra precisa ter ao menos um item.");return;}btn.closest(".purchase-item").remove();recalcularCompra();}
function preencherCustoCompra(sel){const opt=sel.selectedOptions[0];const custo=Number(opt?.dataset?.custo||0);if(custo>0)sel.closest(".purchase-item").querySelector(".item-custo").value=custo.toFixed(2);}

function obterItensCompra(){
  return [...document.querySelectorAll(".purchase-item")].map(el=>({
    produtoId:Number(el.querySelector(".item-produto").value),
    quantidade:Number(el.querySelector(".item-qtd").value),
    custoUnitario:Number(el.querySelector(".item-custo").value)
  }));
}

function recalcularCompra(){
  let subtotal=0;
  document.querySelectorAll(".purchase-item").forEach(el=>{
    const q=Number(el.querySelector(".item-qtd").value||0);
    const c=Number(el.querySelector(".item-custo").value||0);
    const t=q*c;subtotal+=t;
    el.querySelector(".item-total").value=moedaCompra(t);
  });
  const total=subtotal-Number(document.getElementById("compraDesconto").value||0)+Number(document.getElementById("compraFrete").value||0)+Number(document.getElementById("compraOutras").value||0);
  document.getElementById("compraSubtotal").textContent=moedaCompra(subtotal);
  document.getElementById("compraTotal").textContent=moedaCompra(total);
}
function alternarFinanceiroCompra(){document.getElementById("camposFinanceiroCompra").style.display=document.getElementById("compraGerarFinanceiro").checked?"grid":"none";}

async function salvarCompra(){
  const btn=document.getElementById("btnSalvarCompra");
  try{
    const fornecedorId=Number(document.getElementById("compraFornecedor").value);
    if(!fornecedorId)throw new Error("Selecione o fornecedor.");
    const itens=obterItensCompra();
    if(itens.some(i=>!i.produtoId||i.quantidade<=0||i.custoUnitario<=0))throw new Error("Revise produto, quantidade e custo de todos os itens.");
    const gerar=document.getElementById("compraGerarFinanceiro").checked;
    const payload={
      fornecedorId,itens,
      dataCompra:document.getElementById("compraData").value,
      numeroDocumento:document.getElementById("compraDocumento").value||null,
      desconto:Number(document.getElementById("compraDesconto").value||0),
      frete:Number(document.getElementById("compraFrete").value||0),
      outrasDespesas:Number(document.getElementById("compraOutras").value||0),
      gerarFinanceiro:gerar,
      formaPagamento:gerar?(document.getElementById("compraFormaPagamento").value||null):null,
      quantidadeParcelas:gerar?Number(document.getElementById("compraParcelas").value||1):1,
      primeiroVencimento:gerar?document.getElementById("compraVencimento").value:null,
      observacoes:document.getElementById("compraObservacoes").value||null
    };
    btn.disabled=true;btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Registrando...';
    const r=await post("/compras",payload);
    if(!r?.sucesso)throw new Error(r?.mensagem||"Erro ao registrar compra.");
    fecharCompra();await carregarApoioCompra();await carregarCompras();mostrarMensagem(r.mensagem||"Compra registrada.");
  }catch(e){mostrarMensagem(e.message||"Erro ao registrar compra.");}
  finally{btn.disabled=false;btn.innerHTML='<i class="fas fa-check"></i> Confirmar Compra';}
}

async function cancelarCompra(id){
  const motivo=prompt("Motivo do cancelamento da compra:");
  if(motivo===null)return;
  if(!motivo.trim()){mostrarMensagem("Informe o motivo do cancelamento.");return;}
  if(!confirm("O estoque será estornado e os títulos ainda não pagos serão cancelados. Continuar?"))return;
  const r=await post(`/compras/${id}/cancelar`,{motivo:motivo.trim()});
  if(!r?.sucesso){mostrarMensagem(r?.mensagem||"Erro ao cancelar compra.");return;}
  await carregarApoioCompra();await carregarCompras();mostrarMensagem(r.mensagem);
}