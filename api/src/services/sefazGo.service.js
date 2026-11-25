const https = require("https");
const prisma = require("../config/prisma");
const { descriptografarCertificado } = require("../utils/certificadoCrypto");

const URLS = {
  HOMOLOGACAO: "https://homolog.sefaz.go.gov.br/nfe/services/NFeStatusServico4",
  PRODUCAO: "https://nfe.sefaz.go.gov.br/nfe/services/NFeStatusServico4"
};

function extrair(xml, tag){
  const m=String(xml||"").match(new RegExp(`<${tag}>([^<]*)<\\/${tag}>`,"i"));
  return m?m[1]:null;
}

function request({url,pfx,passphrase,body}){
  return new Promise((resolve,reject)=>{
    const req=https.request(url,{
      method:"POST",
      pfx,
      passphrase,
      minVersion:"TLSv1.2",
      headers:{
        "Content-Type":"application/soap+xml; charset=utf-8",
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

class SefazGoService {
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
