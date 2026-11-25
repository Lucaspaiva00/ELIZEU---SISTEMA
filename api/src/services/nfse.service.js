const crypto = require("crypto");
const nfseRepository = require("../repositories/nfse.repository");
const portalNacionalRepository = require("../repositories/portalNacional.repository");

function texto(v){ return String(v ?? "").trim(); }
function digitos(v){ return texto(v).replace(/\D/g,""); }
function numero(v){ return Number(v || 0); }
function esc(v){ return texto(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;"); }
function pend(lista, condicao, mensagem, destino){ if(condicao) lista.push({mensagem,destino}); }

class NfseService {
    async validar(vendaId, empresaId) {
        const venda = await nfseRepository.buscarVenda(vendaId, empresaId);
        if(!venda) throw new Error("Venda não encontrada.");
        const pendencias=[];
        pend(pendencias, venda.status !== "FATURADA", "A venda precisa estar faturada antes da emissão da NFS-e.", "venda");

        const empresa=venda.empresa;
        const fiscal=empresa?.configuracaoFiscal;
        pend(pendencias, !fiscal, "Configuração fiscal não cadastrada.", "fiscal");
        pend(pendencias, !empresa?.certificadoDigital?.ativo, "Certificado A1 não configurado.", "certificado");
        pend(pendencias, digitos(empresa?.cnpj).length!==14, "CNPJ do prestador inválido.", "empresa");
        pend(pendencias, !fiscal?.codigoMunicipio, "Código IBGE do município não configurado.", "fiscal");

        const cliente=venda.cliente;
        const doc=digitos(cliente?.cpfCnpj);
        pend(pendencias, ![11,14].includes(doc.length), "CPF/CNPJ do tomador inválido.", "cliente");
        pend(pendencias, !texto(cliente?.nome), "Nome do tomador não informado.", "cliente");

        const itens=(venda.itens||[]).filter(i=>i.tipo==="SERVICO");
        pend(pendencias, !itens.length, "A venda não possui serviços para emissão de NFS-e.", "servico");

        for(const item of itens){
            const servico=item.variacaoServico?.servico;
            pend(pendencias, !servico, `Serviço "${item.descricao}" não encontrado.`, "servico");
            if(!servico) continue;
            pend(pendencias, !digitos(servico.nfseCodigoServicoNacional), `Serviço "${servico.nome}" está sem código nacional de serviço.`, "servico");
            pend(pendencias, !texto(servico.nfseDescricaoFiscal || servico.descricao || servico.nome), `Serviço "${servico.nome}" está sem descrição fiscal.`, "servico");
        }

        return { venda, itens, pronta: pendencias.length===0, pendencias };
    }

    montarSnapshot(venda,itens){
        const fiscal=venda.empresa.configuracaoFiscal;
        return {
            ambiente:fiscal.ambiente,
            prestador:{
                cnpj:digitos(venda.empresa.cnpj),
                inscricaoMunicipal:fiscal.inscricaoMunicipal||null,
                codigoMunicipio:fiscal.codigoMunicipio,
                nome:venda.empresa.razaoSocial
            },
            tomador:{
                documento:digitos(venda.cliente.cpfCnpj),
                nome:venda.cliente.nome,
                email:venda.cliente.email||null,
                telefone:digitos(venda.cliente.telefone||venda.cliente.celular),
                endereco:{
                    cep:digitos(venda.cliente.cep),
                    logradouro:venda.cliente.endereco||null,
                    numero:venda.cliente.numero||null,
                    complemento:venda.cliente.complemento||null,
                    bairro:venda.cliente.bairro||null,
                    cidade:venda.cliente.cidade||null,
                    uf:venda.cliente.estado||null
                }
            },
            itens:itens.map(i=>({
                id:i.id,
                descricao:i.variacaoServico?.servico?.nfseDescricaoFiscal || i.descricao,
                codigoServicoNacional:digitos(i.variacaoServico?.servico?.nfseCodigoServicoNacional),
                codigoNbs:texto(i.variacaoServico?.servico?.nfseCodigoNbs)||null,
                aliquotaIss:i.variacaoServico?.servico?.nfseAliquotaIss===null?null:numero(i.variacaoServico?.servico?.nfseAliquotaIss),
                issRetido:Boolean(i.variacaoServico?.servico?.nfseIssRetido),
                quantidade:numero(i.quantidade),
                valorUnitario:numero(i.valorUnitario),
                desconto:numero(i.desconto),
                total:numero(i.total)
            })),
            totalServicos:itens.reduce((s,i)=>s+numero(i.total),0),
            dataCompetencia:new Date().toISOString().slice(0,10)
        };
    }

    async preparar(vendaId,empresaId){
        const validacao=await this.validar(vendaId,empresaId);
        if(!validacao.pronta) return {pronta:false,pendencias:validacao.pendencias,notaFiscalServico:validacao.venda.notaFiscalServico||null};
        if(validacao.venda.notaFiscalServico) return {pronta:true,existente:true,notaFiscalServico:validacao.venda.notaFiscalServico};
        const snapshot=this.montarSnapshot(validacao.venda,validacao.itens);
        const nota=await nfseRepository.criarPreparada(validacao.venda,snapshot);
        return {pronta:true,existente:false,notaFiscalServico:nota};
    }

    async consultarParametros(vendaId,empresaId){
        const validacao=await this.validar(vendaId,empresaId);
        const codigos=[...new Set(validacao.itens.map(i=>digitos(i.variacaoServico?.servico?.nfseCodigoServicoNacional)).filter(Boolean))];
        const convenio=await portalNacionalRepository.testar(empresaId);
        const servicos=[];
        for(const codigo of codigos){
            servicos.push({codigo,...await portalNacionalRepository.consultarServico(empresaId,codigo)});
        }
        return {convenio,servicos,pendencias:validacao.pendencias};
    }

    montarDpsBasica(nota){
        const s=nota.dadosEmissao;
        const primeiro=s.itens[0];
        const id=`ID${s.prestador.codigoMunicipio}${s.prestador.cnpj}${String(nota.serieDps).padStart(5,"0")}${String(nota.numeroDps).padStart(15,"0")}`;
        const agora=new Date().toISOString();
        const doc=s.tomador.documento;
        const docTag=doc.length===11?`<CPF>${doc}</CPF>`:`<CNPJ>${doc}</CNPJ>`;
        const descricao=s.itens.map(i=>i.descricao).join(" | ");
        return `<DPS xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.01"><infDPS Id="${id}"><tpAmb>${nota.ambiente==="PRODUCAO"?"1":"2"}</tpAmb><dhEmi>${agora}</dhEmi><verAplic>ElianSigs-1.0</verAplic><serie>${nota.serieDps}</serie><nDPS>${nota.numeroDps}</nDPS><dCompet>${s.dataCompetencia}</dCompet><tpEmit>1</tpEmit><cLocEmi>${s.prestador.codigoMunicipio}</cLocEmi><prest><CNPJ>${s.prestador.cnpj}</CNPJ>${s.prestador.inscricaoMunicipal?`<IM>${esc(s.prestador.inscricaoMunicipal)}</IM>`:""}</prest><toma>${docTag}<xNome>${esc(s.tomador.nome)}</xNome></toma><serv><locPrest><cLocPrestacao>${s.prestador.codigoMunicipio}</cLocPrestacao></locPrest><cServ><cTribNac>${primeiro.codigoServicoNacional}</cTribNac><xDescServ>${esc(descricao)}</xDescServ></cServ></serv><valores><vServPrest><vServ>${s.totalServicos.toFixed(2)}</vServ></vServPrest></valores></infDPS></DPS>`;
    }

    async gerarDps(vendaId,empresaId){
        const preparado=await this.preparar(vendaId,empresaId);
        if(!preparado.pronta) return preparado;
        const nota=await nfseRepository.buscarPorVenda(vendaId,empresaId);
        const xml=this.montarDpsBasica(nota);
        const hash=crypto.createHash("sha256").update(xml).digest("hex");
        const atualizada=await nfseRepository.atualizar(nota.id,{xmlDps:xml,motivoStatus:`DPS gerada para validação. SHA256 ${hash}`});
        return {pronta:true,notaFiscalServico:atualizada,xmlDps:xml,assinaturaPendente:true};
    }

    async emitir(vendaId,empresaId){
        const gerada=await this.gerarDps(vendaId,empresaId);
        if(!gerada.pronta) return gerada;
        return {
            pronta:false,
            pendencias:[{
                destino:"nfse",
                mensagem:"DPS montada, mas a transmissão permanece bloqueada até aplicar a assinatura XMLDSIG exigida pelo padrão nacional e validar o leiaute 1.01 completo."
            }],
            notaFiscalServico:gerada.notaFiscalServico
        };
    }

    buscarPorVenda(vendaId,empresaId){ return nfseRepository.buscarPorVenda(vendaId,empresaId); }
}

module.exports=new NfseService();
