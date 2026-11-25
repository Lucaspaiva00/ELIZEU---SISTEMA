const https = require("https");
const zlib = require("zlib");
const prisma = require("../config/prisma");
const { descriptografarCertificado } = require("../utils/certificadoCrypto");

const ENDPOINT = "https://www1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx";
const ACTION = "http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe/nfeDistDFeInteresse";

function tag(xml, nome) {
    const m = String(xml || "").match(new RegExp(`<${nome}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${nome}>`, "i"));
    return m ? m[1].trim() : null;
}
function tags(xml, nome) {
    const re = new RegExp(`<${nome}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${nome}>`, "gi");
    return [...String(xml || "").matchAll(re)].map(m => m[1].trim());
}
function unescapeXml(valor) {
    return String(valor || "")
      .replace(/&lt;/g,"<").replace(/&gt;/g,">")
      .replace(/&quot;/g,'"').replace(/&apos;/g,"'")
      .replace(/&amp;/g,"&");
}
function requestSoap({ pfx, passphrase, body }) {
    return new Promise((resolve, reject) => {
        const req = https.request(ENDPOINT, {
            method: "POST",
            pfx,
            passphrase,
            minVersion: "TLSv1.2",
            headers: {
                "Content-Type": `application/soap+xml; charset=utf-8; action="${ACTION}"`,
                "Accept": "application/soap+xml, text/xml",
                "Content-Length": Buffer.byteLength(body)
            }
        }, res => {
            const chunks=[];
            res.on("data", c=>chunks.push(c));
            res.on("end", ()=>resolve({status:res.statusCode, body:Buffer.concat(chunks).toString("utf8")}));
        });
        req.on("error", reject);
        req.setTimeout(30000, ()=>req.destroy(new Error("Tempo limite no Ambiente Nacional da NF-e.")));
        req.write(body);
        req.end();
    });
}

class NfeDistribuicaoService {
    async recuperarPorChave(empresaId, chave) {
        const empresa = await prisma.empresa.findUnique({
            where:{id:empresaId},
            include:{certificadoDigital:true}
        });
        if(!empresa?.certificadoDigital?.ativo) throw new Error("Certificado A1 não configurado.");

        const cnpj=String(empresa.cnpj||"").replace(/\D/g,"");
        if(cnpj.length!==14) throw new Error("CNPJ do emitente inválido.");
        const ch=String(chave||"").replace(/\D/g,"");
        if(ch.length!==44) throw new Error("Chave NF-e inválida.");

        const cert=descriptografarCertificado(empresa.certificadoDigital);
        const body=`<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
  <soap:Body>
    <nfeDistDFeInteresse xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe">
      <nfeDadosMsg>
        <distDFeInt xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01">
          <tpAmb>1</tpAmb>
          <cUFAutor>52</cUFAutor>
          <CNPJ>${cnpj}</CNPJ>
          <consChNFe><chNFe>${ch}</chNFe></consChNFe>
        </distDFeInt>
      </nfeDadosMsg>
    </nfeDistDFeInteresse>
  </soap:Body>
</soap:Envelope>`;

        const resp=await requestSoap({
            pfx:Buffer.from(cert.arquivoBase64,"base64"),
            passphrase:cert.senha,
            body
        });

        const conteudo=unescapeXml(resp.body);
        const cStat=tag(conteudo,"cStat");
        const xMotivo=tag(conteudo,"xMotivo");
        const zipMatch=conteudo.match(/<docZip[^>]*>([A-Za-z0-9+/=\r\n]+)<\/docZip>/i);

        if(!zipMatch){
            return {httpStatus:resp.status,cStat,xMotivo,xml:null};
        }

        const compactado=Buffer.from(zipMatch[1].replace(/\s/g,""),"base64");
        const xml=zlib.gunzipSync(compactado).toString("utf8");
        return {httpStatus:resp.status,cStat,xMotivo,xml};
    }

    resumirXml(xml) {
        if(!xml) return null;
        const infNfe=tag(xml,"infNFe") || xml;
        const dets=tags(infNfe,"det");
        const itens=dets.map(det=>({
            cProd:tag(det,"cProd"),
            xProd:tag(det,"xProd"),
            NCM:tag(det,"NCM"),
            CFOP:tag(det,"CFOP"),
            uCom:tag(det,"uCom"),
            orig:tag(det,"orig"),
            CSOSN:tag(det,"CSOSN"),
            CST_ICMS:tag(tag(det,"ICMS")||"","CST"),
            CST_PIS:tag(tag(det,"PIS")||"","CST"),
            CST_COFINS:tag(tag(det,"COFINS")||"","CST")
        }));
        return {
            emitente:{
                CNPJ:tag(tag(infNfe,"emit")||"","CNPJ"),
                xNome:tag(tag(infNfe,"emit")||"","xNome"),
                xFant:tag(tag(infNfe,"emit")||"","xFant"),
                IE:tag(tag(infNfe,"emit")||"","IE"),
                CRT:tag(tag(infNfe,"emit")||"","CRT")
            },
            ide:{
                natOp:tag(tag(infNfe,"ide")||"","natOp"),
                mod:tag(tag(infNfe,"ide")||"","mod"),
                serie:tag(tag(infNfe,"ide")||"","serie"),
                nNF:tag(tag(infNfe,"ide")||"","nNF")
            },
            endereco:{
                xLgr:tag(tag(tag(infNfe,"emit")||"","enderEmit")||"","xLgr"),
                nro:tag(tag(tag(infNfe,"emit")||"","enderEmit")||"","nro"),
                xBairro:tag(tag(tag(infNfe,"emit")||"","enderEmit")||"","xBairro"),
                cMun:tag(tag(tag(infNfe,"emit")||"","enderEmit")||"","cMun"),
                xMun:tag(tag(tag(infNfe,"emit")||"","enderEmit")||"","xMun"),
                UF:tag(tag(tag(infNfe,"emit")||"","enderEmit")||"","UF"),
                CEP:tag(tag(tag(infNfe,"emit")||"","enderEmit")||"","CEP"),
                fone:tag(tag(tag(infNfe,"emit")||"","enderEmit")||"","fone")
            },
            itens,
            infCpl:tag(infNfe,"infCpl")
        };
    }
}

module.exports=new NfeDistribuicaoService();
