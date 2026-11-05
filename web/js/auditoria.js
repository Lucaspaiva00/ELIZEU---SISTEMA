let timerAuditoria=null;

document.addEventListener("DOMContentLoaded", carregarAuditoria);

function escAudit(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");}

async function carregarAuditoria(){
    clearTimeout(timerAuditoria);
    timerAuditoria=setTimeout(async()=>{
        const modulo=document.getElementById("filtroModulo")?.value?.trim()||"";
        const sucesso=document.getElementById("filtroSucesso")?.value||"";
        const qs=new URLSearchParams({limite:"100"});
        if(modulo)qs.set("modulo",modulo);
        if(sucesso)qs.set("sucesso",sucesso);
        const r=await get(`/auditoria?${qs.toString()}`);
        const tbody=document.getElementById("tabelaAuditoria");
        if(!r?.sucesso){tbody.innerHTML='<tr><td colspan="6" class="text-center">Não foi possível carregar a auditoria.</td></tr>';return;}
        const lista=r.registros||[];
        if(!lista.length){tbody.innerHTML='<tr><td colspan="6" class="text-center">Nenhuma alteração registrada.</td></tr>';return;}
        tbody.innerHTML=lista.map(a=>`<tr>
            <td>${new Date(a.criadoEm).toLocaleString("pt-BR")}</td>
            <td><strong>${escAudit(a.usuarioNome||"Sistema")}</strong><br><small>${escAudit(a.usuarioEmail||"")}</small></td>
            <td><span class="badge badge-secondary">${escAudit(a.modulo)}</span></td>
            <td><strong>${escAudit(a.metodo)}</strong></td>
            <td><small>${escAudit(a.rota)}</small></td>
            <td><span class="badge ${a.sucesso?"badge-success":"badge-danger"}">${a.statusHttp}</span></td>
        </tr>`).join("");
    },250);
}
