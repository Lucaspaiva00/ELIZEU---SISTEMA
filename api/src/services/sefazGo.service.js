const https = require("https");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const prisma = require("../config/prisma");
const { descriptografarCertificado } = require("../utils/certificadoCrypto");

const URLS = {
  HOMOLOGACAO: "https://homolog.sefaz.go.gov.br/nfe/services/NFeStatusServico4",
  PRODUCAO: "https://nfe.sefaz.go.gov.br/nfe/services/NFeStatusServico4"
};

function extrair(xml, tag){
  const m=String(xml||"").match(new RegExp(`<(?:[\\w.-]+:)?${tag}>([^<]*)<\\/(?:[\\w.-]+:)?${tag}>`,"i"));
  return m?m[1]:null;
}

function request({url,pfx,passphrase,body,action}){
  return new Promise((resolve,reject)=>{
    const req=https.request(url,{
      method:"POST",
      pfx,
      passphrase,
      minVersion:"TLSv1.2",
      headers:{
        "Content-Type": action ? `application/soap+xml; charset=utf-8; action="${action}"` : "application/soap+xml; charset=utf-8",
        "Accept":"application/soap+xml, text/xml",
        "Content-Length":Buffer.byteLength(body)
      }
    },res=>{
      const chunks=[];
      res.on("data",c=>chunks.push(c));
      res.on("end",()=>resolve({status:res.statusCode,body:Buffer.concat(chunks).toString("utf8")}));
    });
    req.on("error",reject);
    req.setTimeout(30000,()=>req.destroy(new Error("Tempo limite ao consultar a SEFAZ Goiás.")));
    req.write(body);
    req.end();
  });
}


function assinarNfe(nfe, pfx, senha) {
  const pem = execFileSync("openssl", ["pkcs12", "-nodes", "-passin", "env:ELIAN_NFE_A1"], {
    input: pfx, encoding: "utf8", env: { ...process.env, ELIAN_NFE_A1: senha },
    stdio: ["pipe", "pipe", "pipe"]
  });
  const chavePem = pem.match(/-----BEGIN (?:RSA )?PRIVATE KEY-----[\s\S]+?-----END (?:RSA )?PRIVATE KEY-----/)?.[0];
  const chave = chavePem && crypto.createPrivateKey(chavePem);
  if (!chave) throw new Error("Chave privada do A1 não encontrada.");
  const certificados = pem.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g) || [];
  const certificado = certificados.map(bloco => new crypto.X509Certificate(bloco)).find(cert => cert.checkPrivateKey(chave));
  if (!certificado) throw new Error("O A1 não contém o certificado correspondente à chave.");
  const ds = "http://www.w3.org/2000/09/xmldsig#";
  const c14n = "http://www.w3.org/TR/2001/REC-xml-c14n-20010315";
  const digest = crypto.createHash("sha1").update(nfe.infNFe).digest("base64");
  const info = [
    `<SignedInfo xmlns="${ds}"><CanonicalizationMethod Algorithm="${c14n}"></CanonicalizationMethod>`,
    `<SignatureMethod Algorithm="${ds}rsa-sha1"></SignatureMethod><Reference URI="#NFe${nfe.chave}">`,
    `<Transforms><Transform Algorithm="${ds}enveloped-signature"></Transform><Transform Algorithm="${c14n}"></Transform></Transforms>`,
    `<DigestMethod Algorithm="${ds}sha1"></DigestMethod><DigestValue>${digest}</DigestValue></Reference></SignedInfo>`
  ].join("");
  const assinatura = crypto.sign("RSA-SHA1", Buffer.from(info), chave).toString("base64");
  const xmlSignature = `<Signature xmlns="${ds}">${info}<SignatureValue>${assinatura}</SignatureValue><KeyInfo><X509Data><X509Certificate>${certificado.raw.toString("base64")}</X509Certificate></X509Data></KeyInfo></Signature>`;
  return nfe.xml.replace("</NFe>", xmlSignature + "</NFe>");
}

class SefazGoService {
  async autorizarHomologacao(empresaId, nfe, lote) {
    if (!nfe.infNFe.includes("<tpAmb>2</tpAmb>")) throw new Error("Somente XML de homologação pode ser enviado neste fluxo.");
    const empresa = await prisma.empresa.findUnique({ where: { id: empresaId }, include: { certificadoDigital: true } });
    if (!empresa?.certificadoDigital?.ativo) throw new Error("Certificado A1 não configurado.");
    const certificado = descriptografarCertificado(empresa.certificadoDigital);
    const pfx = Buffer.from(certificado.arquivoBase64, "base64");
    const xml = assinarNfe(nfe, pfx, certificado.senha);
    const namespace = "http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4";
    const body = [
      '<soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Body>',
      `<nfeDadosMsg xmlns="${namespace}"><enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">`,
      `<idLote>${lote}</idLote><indSinc>1</indSinc>${xml}</enviNFe></nfeDadosMsg></soap12:Body></soap12:Envelope>`
    ].join("");
    const resposta = await request({
      url: "https://homolog.sefaz.go.gov.br/nfe/services/NFeAutorizacao4",
      pfx, passphrase: certificado.senha, body,
      action: namespace + "/nfeAutorizacaoLote"
    });
    const protocolo = resposta.body.match(/<(?:[\w.-]+:)?infProt\b[^>]*>[\s\S]*?<\/(?:[\w.-]+:)?infProt>/)?.[0];
    const codigo = extrair(protocolo || resposta.body, "cStat");
    const motivo = extrair(protocolo || resposta.body, "xMotivo");
    const numeroProtocolo = extrair(protocolo, "nProt");
    const autorizada = resposta.status === 200 && codigo === "100"
      && extrair(protocolo, "tpAmb") === "2" && extrair(protocolo, "chNFe") === nfe.chave
      && /^\d{15}$/.test(numeroProtocolo || "");
    return {
      ambiente: "HOMOLOGACAO", autorizada, codigo, motivo, httpStatus: resposta.status,
      chave: nfe.chave, protocolo: autorizada ? numeroProtocolo : null,
      recibo: extrair(resposta.body, "nRec")
    };
  }

  async testarStatus(empresaId,ambiente="HOMOLOGACAO"){
    const empresa=await prisma.empresa.findUnique({where:{id:empresaId},include:{certificadoDigital:true}});
    if(!empresa?.certificadoDigital?.ativo) throw new Error("Certificado A1 não configurado.");
    const cert=descriptografarCertificado(empresa.certificadoDigital);
    const tpAmb=ambiente==="PRODUCAO"?"1":"2";
    const xml=`<consStatServ xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>${tpAmb}</tpAmb><cUF>52</cUF><xServ>STATUS</xServ></consStatServ>`;
    const body=`<?xml version="1.0" encoding="UTF-8"?>
<soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeStatusServico4">${xml}</nfeDadosMsg>
  </soap12:Body>
</soap12:Envelope>`;
    const resp=await request({
      url:URLS[ambiente]||URLS.HOMOLOGACAO,
      pfx:Buffer.from(cert.arquivoBase64,"base64"),
      passphrase:cert.senha,
      body
    });
    return {
      httpStatus:resp.status,
      cStat:extrair(resp.body,"cStat"),
      xMotivo:extrair(resp.body,"xMotivo"),
      tpAmb:extrair(resp.body,"tpAmb"),
      dhRecbto:extrair(resp.body,"dhRecbto")
    };
  }
}
module.exports=new SefazGoService();
