const https = require("https");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const prisma = require("../config/prisma");
const { descriptografarCertificado } = require("../utils/certificadoCrypto");

// Cadeia ICP-Brasil v10 indicada pela Secretaria da Economia de Goiás para a NF-e em produção.
const cadeiaProducaoGo = [
  "-----BEGIN CERTIFICATE-----\nMIIGrDCCBJSgAwIBAgIJANLVi0S/gZNCMA0GCSqGSIb3DQEBDQUAMIGYMQswCQYD\nVQQGEwJCUjETMBEGA1UECgwKSUNQLUJyYXNpbDE9MDsGA1UECww0SW5zdGl0dXRv\nIE5hY2lvbmFsIGRlIFRlY25vbG9naWEgZGEgSW5mb3JtYWNhbyAtIElUSTE1MDMG\nA1UEAwwsQXV0b3JpZGFkZSBDZXJ0aWZpY2Fkb3JhIFJhaXogQnJhc2lsZWlyYSB2\nMTAwHhcNMTkwNzAxMTkxNTU5WhcNMzIwNzAxMTIwMDU5WjCBmDELMAkGA1UEBhMC\nQlIxEzARBgNVBAoMCklDUC1CcmFzaWwxPTA7BgNVBAsMNEluc3RpdHV0byBOYWNp\nb25hbCBkZSBUZWNub2xvZ2lhIGRhIEluZm9ybWFjYW8gLSBJVEkxNTAzBgNVBAMM\nLEF1dG9yaWRhZGUgQ2VydGlmaWNhZG9yYSBSYWl6IEJyYXNpbGVpcmEgdjEwMIIC\nIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAk3AxKl1ZtP0pNyjChqO7qNkn\n+/sClZeqiV/Kd7KnnbkDbI2y3VWcUG7feCE/deIxot6GH6JXncRG794UZl+4doD0\nD0/cEwBd4DvrDSZm0RT40xhmYYOTxZDJxv+coTHdmsT5aNmSkktfjzYX4HQHh/7M\nem+kTOpT/3E4K6B7KVs9HkOT7nXx5yU1qYbVWqI0qpJM9mOTSFx8C9HiKcHvLCvt\n1ioXKPAmFuHPkayOcXP2MXeb+VRNjWKU4E+L2t5uZPKVx1M/9i1DztlLb4K8OfYg\nGaPDUSF1sxnoGk5qZHLleO6KjCpmuQepmgsBvxi2YNO7X2YUwQQx1AXNSolgtkAR\n5gt+1WzxhbFUhItQqlhqxgWHefLmiT5T/Ctz/P2v+zSO4efkkIzsi1iwD+ypZvM2\nlnIvB24RcSN6jzmCahLPX4CwjwIK6JsSoMVxIhpZHCguUP4LXqP8IWUZ6WgS/4zB\n7B9E0EICl2rM1PRy+6ulv+ZOW256e8a0pijUB+hXM1msUq9L92476FAAX8va3sP7\n+Uut94+bGHmubcTLImWUPrxNT7QyrvE3FyHicfiHioeFL2oV4cXTLZrEq2wS8R4P\nKPdSzNn5Z9e2uMEGYQaSNO+OwvVycpIhOBOqrm12wJ9ZhWKtM5UOo34/o37r5ZBI\nTYXAGbhqQDB9mWXwH+0CAwEAAaOB9jCB8zBOBgNVHSAERzBFMEMGBWBMAQEAMDow\nOAYIKwYBBQUHAgEWLGh0dHA6Ly9hY3JhaXouaWNwYnJhc2lsLmdvdi5ici9EUENh\nY3JhaXoucGRmMEAGA1UdHwQ5MDcwNaAzoDGGL2h0dHA6Ly9hY3JhaXouaWNwYnJh\nc2lsLmdvdi5ici9MQ1JhY3JhaXp2MTAuY3JsMB8GA1UdIwQYMBaAFHTzfv/8n1N6\n8Xzrqz6kptoYukVjMB0GA1UdDgQWBBR0837//J9TevF866s+pKbaGLpFYzAPBgNV\nHRMBAf8EBTADAQH/MA4GA1UdDwEB/wQEAwIBBjANBgkqhkiG9w0BAQ0FAAOCAgEA\neCNhBSuy/Ih/T+1VOtAJju85SrtoE3vET1qXASpmjQllDHG/ph7VFNRAkC+gha+B\nCbjoA5oJ/8wwl+Qdp1KGz6nXXFTLx3osU+kjm0srmBf9nyXHPqvFyvBeB0A7sYb7\nTmII9GKD20oCxsdkccR/oE/JuTaNnGq0GYZ2aDb5v62uLi21Y6P9UBiTxZqQ4ojW\nET6kXNjlK238jpXv17FR8Sg3VusCvX7Q8eJkavvHHZDeWck2fSA+ycAc2JeL2Z0B\nMSxGWpH32WM9J8+6XqCJUXHiWEV0zCE8wDYiYC+047pTxQI/gB/FcU7jvylh98DJ\nkQPHd/Tp6Og3ynlDA9n9uBbxYHVRZs9vsZ/7xTFaxRe+zk8dhgKgZ/3RrcMFB570\n2t8LFbyuUE/kQVY6rZ0QJ9qMWQ7VPLRwRhiMeU3k8WDJb/tBbOXHBqldTbWyQ+mp\nMEDWhbrzE/IED82wAuO23Tb05cYk2xC7+Izef8fSc3XdJDuPSbcDpWukzyCDtSEH\nisLiGEtIbYRiPsF3czlQPsnIEVoTTCWxHCH1zYR6zScSv18Qh69qVe2J40K5jZoP\nGEOhq/oKhVJQAdvAFW5Odp7mF3Tk9nivjjsctJSxY26LFiV5GRV+07SSse4ti0aO\njO5PLg5SWjfcOtBG2rz02EIvQAmLcb0kGBtfdj0lW/w=\n-----END CERTIFICATE-----",
  "-----BEGIN CERTIFICATE-----\nMIIHtDCCBZygAwIBAgIJANjGl6F55VD+MA0GCSqGSIb3DQEBDQUAMIGYMQswCQYD\nVQQGEwJCUjETMBEGA1UECgwKSUNQLUJyYXNpbDE9MDsGA1UECww0SW5zdGl0dXRv\nIE5hY2lvbmFsIGRlIFRlY25vbG9naWEgZGEgSW5mb3JtYWNhbyAtIElUSTE1MDMG\nA1UEAwwsQXV0b3JpZGFkZSBDZXJ0aWZpY2Fkb3JhIFJhaXogQnJhc2lsZWlyYSB2\nMTAwHhcNMjMwMzIyMTgwOTExWhcNMzIwNzAxMTIwMDU5WjB3MQswCQYDVQQGEwJC\nUjETMBEGA1UEChMKSUNQLUJyYXNpbDE1MDMGA1UECxMsQXV0b3JpZGFkZSBDZXJ0\naWZpY2Fkb3JhIFJhaXogQnJhc2lsZWlyYSB2MTAxHDAaBgNVBAMTE0FDIFNPTFVU\nSSBTU0wgRVYgRzQwggIiMA0GCSqGSIb3DQEBAQUAA4ICDwAwggIKAoICAQDHv3Kv\noEPrNrzImIPn17GI5vdoVxghsm6EVLMUjnM4JdCpDED+0BqZF0kycyZaiWt7jqSR\nvcGm66RKzSGcHJlUgahp9qcXAmSwMn00pwvgBKb+4htp48vQc1/5MWpaBzQW4Di/\ntWvNkh9URtMyhtltf2u3s9r5vgF12ff7mCu3oj0bDBIaGs/a9EtMKoCfw/ziKUp7\n11JYu1fbIWVOgbW9iHE24oiE33LGLm+uToCWpjGL3n9D+q+ryfIYFoes6gPCYYSt\nudDUB9lfpe83IOVcVslL3DmYd2oEncGCogO3qzaMSH3OVLMO4Rg5edERpMw5U0tA\nMeyO0k5/tmnFfUM476lZl+ce2Ol56p7R2yjKxHJizeCOSmwDE5FXz7ll+Zq9C7QW\nUzoPQtyT739UGEeBRTAz4KsO77frCtdifGRvX3lMfI8qeMnfvf08BK9e2dRkCHwD\niv23Aw7QIixDS9PiSsMxObgjHwroEqAAN2Mwz1B1zAuzZVUH7k6MyQQ/II/GDUpT\njT4VKnhjdIfz5aEFHx7By2XjMkx1hyeONLS/2SoDnKitE9yY/PASqWDCPCpSoJ+x\nfEdyZvoawEbJfL+CMhU5I7IXgf9f7gibghIc2CG4bf6dfVAdPcGkYkcjw21dtq/G\n1V2dHpOX67BbihThAVr8Z7NTgVAv4nC6MPpAywIDAQABo4ICHzCCAhswggEHBgNV\nHSAEgf8wgfwwQwYFYEwBAQAwOjA4BggrBgEFBQcCARYsaHR0cDovL2FjcmFpei5p\nY3BicmFzaWwuZ292LmJyL0RQQ2FjcmFpei5wZGYwUAYGYEwBAYECMEYwRAYIKwYB\nBQUHAgEWOGh0dHA6Ly9jY2QuYWNzb2x1dGkuY29tLmJyL2RvY3MvZHBjLWFjLXNv\nbHV0aS1zc2wtZXYucGRmMFAGBmBMAQIBcDBGMEQGCCsGAQUFBwIBFjhodHRwOi8v\nY2NkLmFjc29sdXRpLmNvbS5ici9kb2NzL2RwYy1hYy1zb2x1dGktc3NsLWV2LnBk\nZjAHBgVngQwBATAIBgZngQwBAgIwQAYDVR0fBDkwNzA1oDOgMYYvaHR0cDovL2Fj\ncmFpei5pY3BicmFzaWwuZ292LmJyL0xDUmFjcmFpenYxMC5jcmwwHwYDVR0jBBgw\nFoAUdPN+//yfU3rxfOurPqSm2hi6RWMwHQYDVR0OBBYEFP4GuSyVfi/m0Lio8S+3\n8i6F1dfAMA8GA1UdEwEB/wQFMAMBAf8wDgYDVR0PAQH/BAQDAgGGMB0GA1UdJQQW\nMBQGCCsGAQUFBwMBBggrBgEFBQcDAjBMBggrBgEFBQcBAQRAMD4wPAYIKwYBBQUH\nMAKGMGh0dHA6Ly9hY3JhaXouaWNwYnJhc2lsLmdvdi5ici9JQ1AtQnJhc2lsdjEw\nLmNydDANBgkqhkiG9w0BAQ0FAAOCAgEAABxayeHitwL18QeXSQvRZ2eiNb82IlYT\nuvER4JRMzZDWoamKOqmD7KXSSj+sdBThYiRkkNiVFiMn2qoYAdylI2I4w1npbxyr\nukfXQ7tadTEiMCFva0uHHw9lpBx+oyy9rcLM7qC5qquksyhC222Yt3WbqC6Fla+L\no3GlTOpogqexeyc9hgvAQxeMmq+xyDcjSLzKmmRmMKQ9y3w7wpufXTO/0K5uOLLZ\nsfyXZTw+MYYeIk2+GNv1qQBbWo3gmwlD1W0pJEHe+/KxiCRkDHpJY7Lk2Rm4bSDZ\nRr4Bn8bk/XJWpiu7Fm9b8piPKjTtstDYTzu40ccPRh9UCWDUz4nKF97dXjIgYf+a\nTA0vnKdlnpPUDeBVpfyXavhGf/akFh5AO7/v6xkzWOUlawn5g614mWhOQ6ITwmua\ny1spnpBO684d0bynFQfMoZGS5fdKoYKKDzp29xhBm3s9WD1f/oP79Ie0eDribpOv\nj3Xsjz72MTG4+UVxuv0OIYuXDc8x1foMzVOco6DxuLel6KG5RH+m0tWmX4ouCgBK\nTNUQC70AWHBa4PCF5YA7H8qVnH2EUBPo3rxOY0wN6GzyMbg9+D9l5e2Xcg7/ytqY\nBIBnZKLPjzS3OqUsM9UgUKGwcEnaHnmRxH8vyVEMGnoK1cZNf9uDM9sMGgQUzKwV\nwixwyINOM8U=\n-----END CERTIFICATE-----"
];

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
      rejectUnauthorized: true,
      ...(new URL(url).hostname === "nfe.sefaz.go.gov.br" ? { ca: cadeiaProducaoGo } : {}),
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
  autorizarHomologacao(empresaId, nfe, lote) {
    return this.autorizar(empresaId, nfe, lote, "HOMOLOGACAO");
  }

  async autorizar(empresaId, nfe, lote, ambiente, antesDeEnviar) {
    if (!["HOMOLOGACAO", "PRODUCAO"].includes(ambiente)) throw new Error("Ambiente de autorização inválido.");
    const tpAmb = ambiente === "PRODUCAO" ? "1" : "2";
    if (!nfe.infNFe.includes(`<tpAmb>${tpAmb}</tpAmb>`)) throw new Error("Ambiente do XML diverge do autorizador.");
    const empresa = await prisma.empresa.findUnique({ where: { id: empresaId }, include: { certificadoDigital: true } });
    if (!empresa?.certificadoDigital?.ativo) throw new Error("Certificado A1 não configurado.");
    const certificado = descriptografarCertificado(empresa.certificadoDigital);
    const pfx = Buffer.from(certificado.arquivoBase64, "base64");
    const xml = assinarNfe(nfe, pfx, certificado.senha);
    if (antesDeEnviar) await antesDeEnviar(xml);
    return this.enviarXmlAssinado({ xml, chave: nfe.chave, lote, ambiente, pfx, senha: certificado.senha });
  }

  async retransmitirProducao(empresaId, nota) {
    const { xmlEnvio, chaveAcesso, ambiente, id } = nota;
    if (ambiente !== "PRODUCAO" || !/^52\d{42}$/.test(chaveAcesso)
      || !xmlEnvio?.includes(`Id="NFe${chaveAcesso}"`)
      || !xmlEnvio.includes("<tpAmb>1</tpAmb>") || !xmlEnvio.includes("<Signature ")) {
      throw new Error("O XML assinado armazenado não corresponde à NF-e de produção.");
    }
    const empresa = await prisma.empresa.findUnique({ where: { id: empresaId }, include: { certificadoDigital: true } });
    if (!empresa?.certificadoDigital?.ativo) throw new Error("Certificado A1 não configurado.");
    const certificado = descriptografarCertificado(empresa.certificadoDigital);
    return this.enviarXmlAssinado({
      xml: xmlEnvio, chave: chaveAcesso, lote: id, ambiente,
      pfx: Buffer.from(certificado.arquivoBase64, "base64"), senha: certificado.senha
    });
  }

  async enviarXmlAssinado({ xml, chave, lote, ambiente, pfx, senha }) {
    const tpAmb = ambiente === "PRODUCAO" ? "1" : "2";
    const namespace = "http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4";
    const body = [
      '<soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Body>',
      `<nfeDadosMsg xmlns="${namespace}"><enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">`,
      `<idLote>${lote}</idLote><indSinc>1</indSinc>${xml}</enviNFe></nfeDadosMsg></soap12:Body></soap12:Envelope>`
    ].join("");
    const resposta = await request({
      url: ambiente === "PRODUCAO"
        ? "https://nfe.sefaz.go.gov.br/nfe/services/NFeAutorizacao4"
        : "https://homolog.sefaz.go.gov.br/nfe/services/NFeAutorizacao4",
      pfx, passphrase: senha, body,
      action: namespace + "/nfeAutorizacaoLote"
    });
    const protocolo = resposta.body.match(/<(?:[\w.-]+:)?infProt\b[^>]*>[\s\S]*?<\/(?:[\w.-]+:)?infProt>/)?.[0];
    const codigo = extrair(protocolo || resposta.body, "cStat");
    const motivo = extrair(protocolo || resposta.body, "xMotivo");
    const numeroProtocolo = extrair(protocolo, "nProt");
    const autorizada = resposta.status === 200 && codigo === "100"
      && extrair(protocolo, "tpAmb") === tpAmb && extrair(protocolo, "chNFe") === chave
      && /^\d{15}$/.test(numeroProtocolo || "");
    return {
      ...(ambiente === "PRODUCAO" ? { xmlRetorno: resposta.body } : {}),
      ambiente, autorizada, codigo, motivo, httpStatus: resposta.status,
      chave, protocolo: autorizada ? numeroProtocolo : null,
      recibo: extrair(resposta.body, "nRec")
    };
  }

  async consultarProtocolo(empresaId, chave, ambiente) {
    if (!/^52\d{42}$/.test(chave) || !["HOMOLOGACAO", "PRODUCAO"].includes(ambiente)) {
      throw new Error("Chave ou ambiente da NF-e inválido.");
    }
    const empresa = await prisma.empresa.findUnique({ where: { id: empresaId }, include: { certificadoDigital: true } });
    if (!empresa?.certificadoDigital?.ativo) throw new Error("Certificado A1 não configurado.");
    const certificado = descriptografarCertificado(empresa.certificadoDigital);
    const tpAmb = ambiente === "PRODUCAO" ? "1" : "2";
    const ns = "http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4";
    const host = tpAmb === "1" ? "nfe.sefaz.go.gov.br" : "homolog.sefaz.go.gov.br";
    const body = [
      '<soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Body>',
      `<nfeDadosMsg xmlns="${ns}"><consSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">`,
      `<tpAmb>${tpAmb}</tpAmb><xServ>CONSULTAR</xServ><chNFe>${chave}</chNFe>`,
      '</consSitNFe></nfeDadosMsg></soap12:Body></soap12:Envelope>'
    ].join("");
    const resposta = await request({
      url: `https://${host}/nfe/services/NFeConsultaProtocolo4`,
      pfx: Buffer.from(certificado.arquivoBase64, "base64"), passphrase: certificado.senha,
      body, action: ns + "/nfeConsultaNF"
    });
    const retorno = resposta.body.match(/<(?:[\w.-]+:)?retConsSitNFe\b[^>]*>[\s\S]*?<\/(?:[\w.-]+:)?retConsSitNFe>/)?.[0];
    const infProt = retorno?.match(/<(?:[\w.-]+:)?infProt\b[^>]*>[\s\S]*?<\/(?:[\w.-]+:)?infProt>/)?.[0];
    const codigo = extrair(retorno, "cStat");
    const motivo = extrair(retorno, "xMotivo");
    const protocolo = extrair(infProt, "nProt");
    const autorizada = resposta.status === 200 && codigo === "100" && extrair(infProt, "cStat") === "100"
      && extrair(infProt, "chNFe") === chave && extrair(infProt, "tpAmb") === tpAmb
      && /^\d{15}$/.test(protocolo || "");
    return { codigo, motivo, autorizada, protocolo, xmlRetorno: resposta.body, httpStatus: resposta.status };
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
