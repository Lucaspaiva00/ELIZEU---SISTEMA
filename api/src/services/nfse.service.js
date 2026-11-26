const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const nfseRepository = require("../repositories/nfse.repository");
const portalNacionalRepository = require("../repositories/portalNacional.repository");
const prisma = require("../config/prisma");
const { descriptografarCertificado } = require("../utils/certificadoCrypto");

function texto(v){ return String(v ?? "").trim(); }
function digitos(v){ return texto(v).replace(/\D/g,""); }
function numero(v){ return Number(v || 0); }
function esc(v){ return texto(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;"); }
function pend(lista, condicao, mensagem, destino){ if(condicao) lista.push({mensagem,destino}); }

const formatoDataHoraDps = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZoneName: "longOffset"
});

function dataHoraDps(data) {
    const { year, month, day, hour, minute, second, timeZoneName } =
        Object.fromEntries(formatoDataHoraDps.formatToParts(data).map(({ type, value }) => [type, value]));
    const offset = timeZoneName.replace(/^GMT/, "");
    return `${year}-${month}-${day}T${hour}:${minute}:${second}${offset}`;
}

function canonicalizarXmlControlado(xml) {
    return String(xml)
        .replace(/^\s*<\?xml[^>]*\?>\s*/i, "")
        .replace(/\r\n?/g, "\n")
        .replace(/>\s+</g, "><")
        .trim();
}

function extrairCertificadoFinal(certificado) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "elian-nfse-"));
    const pfxPath = path.join(dir, "cert.pfx");
    try {
        fs.writeFileSync(pfxPath, Buffer.from(certificado.arquivoBase64, "base64"), { mode: 0o600 });
        const args = ["pkcs12", "-in", pfxPath, "-clcerts", "-nokeys", "-passin", "env:ELIAN_PFX_PASS"];
        const env = { ...process.env, ELIAN_PFX_PASS: certificado.senha };
        return execFileSync("openssl", args, { env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    } finally {
        try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {}
    }
}

function extrairChavePrivada(certificado) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "elian-nfse-key-"));
    const pfxPath = path.join(dir, "cert.pfx");
    try {
        fs.writeFileSync(pfxPath, Buffer.from(certificado.arquivoBase64, "base64"), { mode: 0o600 });
        const args = ["pkcs12", "-in", pfxPath, "-nocerts", "-nodes", "-passin", "env:ELIAN_PFX_PASS"];
        const env = { ...process.env, ELIAN_PFX_PASS: certificado.senha };
        return execFileSync("openssl", args, { env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    } finally {
        try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {}
    }
}

function certificadoBase64(pem) {
    return pem.replace(/-----BEGIN CERTIFICATE-----/g, "").replace(/-----END CERTIFICATE-----/g, "").replace(/\s+/g, "");
}

function assinarXmlDps(xml, certificado) {
    const infMatch = xml.match(/<infDPS\b[\s\S]*?<\/infDPS>/);
    if (!infMatch) throw new Error("DPS inválida: elemento infDPS não encontrado.");

    const infDps = canonicalizarXmlControlado(infMatch[0]);
    const idMatch = infDps.match(/\bId="([^"]+)"/);
    if (!idMatch) throw new Error("DPS inválida: Id da infDPS não encontrado.");
    const id = idMatch[1];

    const digestValue = crypto.createHash("sha256").update(infDps, "utf8").digest("base64");
    const signedInfo = [
        '<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">',
        '<CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>',
        '<SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>',
        `<Reference URI="#${id}">`,
        '<Transforms><Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/><Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/></Transforms>',
        '<DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>',
        `<DigestValue>${digestValue}</DigestValue>`,
        '</Reference>',
        '</SignedInfo>'
    ].join("");

    const privateKeyPem = extrairChavePrivada(certificado);
    const signer = crypto.createSign("RSA-SHA256");
    signer.update(signedInfo, "utf8");
    signer.end();
    const signatureValue = signer.sign(privateKeyPem, "base64");
    const certPem = extrairCertificadoFinal(certificado);

    const signature = [
        '<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">',
        signedInfo,
        `<SignatureValue>${signatureValue}</SignatureValue>`,
        `<KeyInfo><X509Data><X509Certificate>${certificadoBase64(certPem)}</X509Certificate></X509Data></KeyInfo>`,
        '</Signature>'
    ].join("");

    return xml.replace("</infDPS>", "</infDPS>" + signature);
}

const opcaoSimplesPorRegime = {
    MEI: 2,
    SIMPLES_NACIONAL: 3,
    SIMPLES_NACIONAL_EXCESSO: 3,
    REGIME_NORMAL: 1
};

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
        pend(pendencias, !fiscal?.inscricaoMunicipal, "Inscrição municipal não configurada.", "fiscal");
        pend(pendencias, !opcaoSimplesPorRegime[fiscal?.regimeTributario], "Regime tributário não configurado.", "fiscal");
        pend(pendencias, !fiscal?.cnaePrincipal, "CNAE principal não configurado.", "fiscal");

        const cliente=venda.cliente;
        const doc=digitos(cliente?.cpfCnpj);
        pend(pendencias, ![11,14].includes(doc.length), "CPF/CNPJ do tomador inválido.", "cliente");
        pend(pendencias, !texto(cliente?.nome), "Nome do tomador não informado.", "cliente");

        const itens=(venda.itens||[]).filter(i=>i.tipo==="SERVICO");
        const codigosServico=[...new Set(itens.map(i=>digitos(i.variacaoServico?.servico?.nfseCodigoServicoNacional)).filter(Boolean))];
        pend(pendencias, codigosServico.length>1, "A venda possui serviços com códigos nacionais diferentes. A emissão precisa ser separada por código de serviço.", "servico");
        pend(pendencias, !itens.length, "A venda não possui serviços para emissão de NFS-e.", "servico");

        for(const item of itens){
            const servico=item.variacaoServico?.servico;
            pend(pendencias, !servico, `Serviço "${item.descricao}" não encontrado.`, "servico");
            if(!servico) continue;
            pend(pendencias, !digitos(servico.nfseCodigoServicoNacional), `Serviço "${servico.nome}" está sem código nacional de serviço.`, "servico");
            pend(pendencias, !texto(servico.nfseCodigoNbs), `Serviço "${servico.nome}" está sem NBS 2.0.`, "servico");
            pend(pendencias, !texto(servico.nfseDescricaoFiscal || servico.descricao || servico.nome), `Serviço "${servico.nome}" está sem descrição fiscal.`, "servico");
        }
        return { venda, itens, pronta: pendencias.length===0, pendencias };
    }

    montarSnapshot(venda,itens){
        const fiscal=venda.empresa.configuracaoFiscal;
        return {
            ambiente:fiscal.ambiente,
            prestador:{ cnpj:digitos(venda.empresa.cnpj), inscricaoMunicipal:fiscal.inscricaoMunicipal||null, codigoMunicipio:fiscal.codigoMunicipio, nome:venda.empresa.razaoSocial },
            tomador:{
                documento:digitos(venda.cliente.cpfCnpj), nome:venda.cliente.nome, email:venda.cliente.email||null,
                telefone:digitos(venda.cliente.telefone||venda.cliente.celular),
                endereco:{ cep:digitos(venda.cliente.cep), logradouro:venda.cliente.endereco||null, numero:venda.cliente.numero||null, complemento:venda.cliente.complemento||null, bairro:venda.cliente.bairro||null, cidade:venda.cliente.cidade||null, uf:venda.cliente.estado||null }
            },
            itens:itens.map(i=>({
                id:i.id, descricao:i.variacaoServico?.servico?.nfseDescricaoFiscal || i.descricao,
                codigoServicoNacional:digitos(i.variacaoServico?.servico?.nfseCodigoServicoNacional),
                codigoNbs:texto(i.variacaoServico?.servico?.nfseCodigoNbs)||null,
                aliquotaIss:i.variacaoServico?.servico?.nfseAliquotaIss===null?null:numero(i.variacaoServico?.servico?.nfseAliquotaIss),
                issRetido:Boolean(i.variacaoServico?.servico?.nfseIssRetido),
                quantidade:numero(i.quantidade), valorUnitario:numero(i.valorUnitario), desconto:numero(i.desconto), total:numero(i.total)
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
        for(const codigo of codigos) servicos.push({codigo,...await portalNacionalRepository.consultarServico(empresaId,codigo)});
        return {convenio,servicos,pendencias:validacao.pendencias};
    }

    montarDpsBasica(nota, regimeTributario){
        const s=nota.dadosEmissao;
        const primeiro=s.itens[0];
        const id=`DPS${s.prestador.codigoMunicipio}2${s.prestador.cnpj}${String(nota.serieDps).padStart(5,"0")}${String(nota.numeroDps).padStart(15,"0")}`;
        const agora=dataHoraDps(new Date());
        const doc=s.tomador.documento;
        const docTag=doc.length===11?`<CPF>${doc}</CPF>`:`<CNPJ>${doc}</CNPJ>`;
        const descricao=s.itens.map(i=>i.descricao).join(" | ");
        const homologacao = nota.ambiente === "HOMOLOGACAO";
        const opcaoSimples = opcaoSimplesPorRegime[regimeTributario];
        if (!opcaoSimples) throw new Error("Regime tributário não configurado para a DPS.");
        const apuracaoSimples = opcaoSimples === 3
            ? `<regApTribSN>${regimeTributario === "SIMPLES_NACIONAL_EXCESSO" ? 2 : 1}</regApTribSN>`
            : "";
        const regime = `<regTrib><opSimpNac>${opcaoSimples}</opSimpNac>${apuracaoSimples}<regEspTrib>0</regEspTrib></regTrib>`;
        const descricaoServico = `<xDescServ>${esc(descricao)}</xDescServ>`;
        const codigoNbs = `<cNBS>${esc(primeiro.codigoNbs)}</cNBS>`;
        const classificacaoServico = homologacao ? codigoNbs + descricaoServico : descricaoServico + codigoNbs;
        const retencaoIss = primeiro.issRetido ? 2 : 1;
        const aliquota = primeiro.aliquotaIss > 0 ? `<pAliq>${primeiro.aliquotaIss.toFixed(2)}</pAliq>` : "";
        const tributos = `<trib><tribMun><tribISSQN>1</tribISSQN><tpRetISSQN>${retencaoIss}</tpRetISSQN>${aliquota}</tribMun><totTrib><indTotTrib>0</indTotTrib></totTrib></trib>`;
        return `<?xml version="1.0" encoding="UTF-8"?><DPS xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.01"><infDPS xmlns="http://www.sped.fazenda.gov.br/nfse" Id="${id}"><tpAmb>${nota.ambiente==="PRODUCAO"?"1":"2"}</tpAmb><dhEmi>${agora}</dhEmi><verAplic>ElianSigs-1.0</verAplic><serie>${nota.serieDps}</serie><nDPS>${nota.numeroDps}</nDPS><dCompet>${s.dataCompetencia}</dCompet><tpEmit>1</tpEmit>${homologacao ? "<finNFSe>0</finNFSe>" : ""}<cLocEmi>${s.prestador.codigoMunicipio}</cLocEmi><prest><CNPJ>${s.prestador.cnpj}</CNPJ><IM>${esc(s.prestador.inscricaoMunicipal)}</IM>${regime}</prest><toma>${docTag}<xNome>${esc(s.tomador.nome)}</xNome></toma>${homologacao ? "<indDest>0</indDest>" : ""}<serv><locPrest><cLocPrestacao>${s.prestador.codigoMunicipio}</cLocPrestacao></locPrest><cServ><cTribNac>${primeiro.codigoServicoNacional}</cTribNac>${classificacaoServico}</cServ></serv><valores><vServPrest><vServ>${s.totalServicos.toFixed(2)}</vServ></vServPrest>${tributos}</valores></infDPS></DPS>`;
    }

    async gerarDps(vendaId,empresaId){
        const preparado=await this.preparar(vendaId,empresaId);
        if(!preparado.pronta) return preparado;
        const nota=await nfseRepository.buscarPorVenda(vendaId,empresaId);
        if (nota.status === "AUTORIZADA") throw new Error("Esta NFS-e já foi autorizada.");
        const empresa=await prisma.empresa.findUnique({
            where:{id:empresaId},include:{certificadoDigital:true,configuracaoFiscal:true}
        });
        const xml=this.montarDpsBasica(nota, empresa?.configuracaoFiscal?.regimeTributario);
        if(!empresa?.certificadoDigital?.ativo) throw new Error("Certificado A1 não configurado.");
        const certificado=descriptografarCertificado(empresa.certificadoDigital);
        const xmlAssinado=assinarXmlDps(xml,certificado);
        const hash=crypto.createHash("sha256").update(xmlAssinado).digest("hex");
        const atualizada=await nfseRepository.atualizar(nota.id,{xmlDps:xmlAssinado,motivoStatus:`DPS assinada para transmissão. SHA256 ${hash}`});
        return {pronta:true,notaFiscalServico:atualizada,xmlDps:xmlAssinado,assinaturaPendente:false};
    }

    async emitir(vendaId,empresaId){
        const gerada=await this.gerarDps(vendaId,empresaId);
        if(!gerada.pronta) return gerada;
        const resposta=await portalNacionalRepository.enviarDps(empresaId, gerada.xmlDps, gerada.notaFiscalServico.ambiente);
        const dados=resposta.resposta || {};
        const sucesso=Boolean(resposta.statusHttp>=200 && resposta.statusHttp<300 && dados?.chaveAcesso && dados?.nfseXmlGZipB64);
        let xmlNfse=null;
        if(sucesso){
            try { xmlNfse=require("zlib").gunzipSync(Buffer.from(dados.nfseXmlGZipB64,"base64")).toString("utf8"); } catch (_) { xmlNfse=null; }
        }
        const atualizada=await nfseRepository.atualizar(gerada.notaFiscalServico.id,{
            respostaApi:typeof dados === "object" && !Array.isArray(dados)
                ? { ...dados, statusHttp: resposta.statusHttp }
                : { statusHttp: resposta.statusHttp, resposta: dados },
            xmlNfse,
            status:sucesso?"AUTORIZADA":"REJEITADA",
            motivoStatus:sucesso?`NFS-e autorizada pela SEFIN Nacional. Chave ${dados.chaveAcesso}.`:JSON.stringify(dados).slice(0,4000),
            transmitidaEm:new Date(),
            autorizadaEm:sucesso?new Date():null
        });
        return {pronta:true,notaFiscalServico:atualizada,retorno:dados};
    }

    buscarPorVenda(vendaId,empresaId){ return nfseRepository.buscarPorVenda(vendaId,empresaId); }
}
module.exports=new NfseService();
