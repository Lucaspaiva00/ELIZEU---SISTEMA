const NS = "http://www.portalfiscal.inf.br/nfe";
const PAGAMENTOS = { DINHEIRO: "01", CHEQUE: "02", CARTAO_CREDITO: "03", CARTAO_DEBITO: "04", BOLETO: "15", TRANSFERENCIA: "18", PIX: "17" };
const digitos = valor => String(valor ?? "").replace(/\D/g, "");
const pad = (valor, tamanho) => String(valor).padStart(tamanho, "0");
const dinheiro = valor => Number(valor).toFixed(2);

function elemento(nome, valor) {
    const texto = String(valor ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\r", "&#xD;");
    if (!texto) throw new Error(`Campo obrigatório da NF-e ausente: ${nome}.`);
    return `<${nome}>${texto}</${nome}>`;
}

function montarGrupo(nome, campos) {
    return `<${nome}>${Object.entries(campos).map(([campo, valor]) => elemento(campo, valor)).join("")}</${nome}>`;
}

function dataEmissao(data) {
    const formato = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23", timeZoneName: "longOffset"
    });
    const partes = Object.fromEntries(formato.formatToParts(data).map(({type, value}) => [type, value]));
    return `${partes.year}-${partes.month}-${partes.day}T${partes.hour}:${partes.minute}:${partes.second}${partes.timeZoneName.replace(/^GMT/, "")}`;
}

function chaveNfe(cnpj, serie, numero, dataHora, codigo) {
    const base = "52" + dataHora.slice(2, 4) + dataHora.slice(5, 7) + cnpj + "55" + pad(serie, 3) + pad(numero, 9) + "1" + codigo;
    const soma = [...base].reverse().reduce((total, digito, i) => total + Number(digito) * (i % 8 + 2), 0);
    return base + (soma % 11 < 2 ? 0 : 11 - soma % 11);
}

function endereco(nome, dados, codigoMunicipio) {
    const { logradouro, numero, complemento, bairro, cidade, uf } = dados;
    const cep = digitos(dados.cep);
    if (cep.length !== 8) throw new Error("O endereço da NF-e exige CEP com oito dígitos.");
    return montarGrupo(nome, {
        xLgr: logradouro, nro: numero, ...(complemento ? { xCpl: complemento } : {}),
        xBairro: bairro, cMun: codigoMunicipio, xMun: cidade, UF: uf, CEP: cep, cPais: 1058, xPais: "BRASIL"
    });
}

function montarItem(item, indice) {
    if (item.cfop !== "5101" || !/^[0-8]$/.test(String(item.origemMercadoria ?? "")) || !/^\d{8}$/.test(item.ncm)) {
        throw new Error(`Confira CFOP, NCM e origem do produto ${item.descricao}.`);
    }
    const quantidade = Number(item.quantidade);
    const unitario = Number(item.valorUnitario);
    const desconto = Number(item.desconto || 0);
    const bruto = Math.round(quantidade * unitario * 100);
    if (!Number.isFinite(bruto) || !Number.isFinite(desconto) || quantidade <= 0 || bruto <= 0 || desconto < 0 || Math.round(desconto * 100) >= bruto) {
        throw new Error(`Confira quantidade, preço e desconto do produto ${item.descricao}.`);
    }
    const produto = montarGrupo("prod", {
        cProd: item.codigo, cEAN: "SEM GTIN", xProd: item.descricao, NCM: item.ncm, CFOP: item.cfop,
        uCom: item.unidade, qCom: quantidade.toFixed(4), vUnCom: unitario.toFixed(10),
        vProd: dinheiro(bruto / 100), cEANTrib: "SEM GTIN", uTrib: item.unidade,
        qTrib: quantidade.toFixed(4), vUnTrib: unitario.toFixed(10),
        ...(desconto ? { vDesc: dinheiro(desconto) } : {}), indTot: 1
    });
    const icms = montarGrupo("ICMSSN102", { orig: item.origemMercadoria, CSOSN: "102" });
    return {
        bruto, desconto: Math.round(desconto * 100),
        xml: `<det nItem="${indice + 1}">${produto}<imposto><ICMS>${icms}</ICMS><PIS><PISNT><CST>06</CST></PISNT></PIS><COFINS><COFINSNT><CST>06</CST></COFINSNT></COFINS></imposto></det>`
    };
}

function montarNfe(nota, codigoNumerico, data = new Date()) {
    const { emitente, destinatario, tributacaoPadrao, documento, itens, venda } = nota.dadosEmissao;
    const origem = emitente.endereco;
    const destino = destinatario.endereco;
    if (!["HOMOLOGACAO", "PRODUCAO"].includes(nota.ambiente)) throw new Error("Ambiente da NF-e inválido.");
    const homologacao = nota.ambiente === "HOMOLOGACAO";
    if (origem.uf !== "GO" || destino.uf !== "GO" || !/^52\d{5}$/.test(origem.codigoMunicipio)) {
        throw new Error("O primeiro fluxo cobre vendas internas em Goiás.");
    }
    if (String(emitente.crt) !== "1" || tributacaoPadrao.icmsSituacaoTributaria !== "102"
        || tributacaoPadrao.pisSituacaoTributaria !== "06" || tributacaoPadrao.cofinsSituacaoTributaria !== "06"
        || tributacaoPadrao.rtcAtivo || String(tributacaoPadrao.modalidadeFrete) !== "9"
        || Number(venda.desconto) || Number(venda.frete) || Number(venda.outrasDespesas)) {
        throw new Error("A configuração e os valores da venda precisam corresponder à operação simples de referência.");
    }
    const normalizarMunicipio = nome => String(nome ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toUpperCase();
    const mesmoMunicipio = normalizarMunicipio(origem.cidade) === normalizarMunicipio(destino.cidade);
    const cMunDest = destino.codigoMunicipio || (mesmoMunicipio ? origem.codigoMunicipio : null);
    if (!/^52\d{5}$/.test(cMunDest || "")) throw new Error("Informe o código IBGE do município do destinatário em Goiás.");
    if (!itens.length || itens.length > 990 || !/^\d{8}$/.test(codigoNumerico)
        || !Number.isInteger(nota.serie) || nota.serie < 1 || nota.serie > 889
        || !Number.isInteger(nota.numero) || nota.numero < 1 || nota.numero > 999999999) {
        throw new Error("Itens, série, numeração ou código de emissão da NF-e inválidos.");
    }

    const cnpj = digitos(emitente.cnpj);
    const doc = digitos(destinatario.cpfCnpj);
    const ie = digitos(emitente.inscricaoEstadual);
    const ieDest = digitos(destinatario.inscricaoEstadual);
    if (cnpj.length !== 14 || ![11, 14].includes(doc.length) || !ie) throw new Error("Confira os documentos fiscais do emitente e do destinatário.");
    const pagamento = PAGAMENTOS[venda.formaPagamento];
    if (!pagamento) throw new Error("Forma de pagamento ainda indisponível no leiaute de homologação.");
    const dhEmi = dataEmissao(data);
    const chave = chaveNfe(cnpj, nota.serie, nota.numero, dhEmi, codigoNumerico);
    const ide = montarGrupo("ide", {
        cUF: 52, cNF: codigoNumerico, natOp: documento.naturezaOperacao, mod: 55, serie: nota.serie,
        nNF: nota.numero, dhEmi, tpNF: 1, idDest: 1, cMunFG: origem.codigoMunicipio, tpImp: 1,
        tpEmis: 1, cDV: chave.at(-1), tpAmb: homologacao ? 2 : 1, finNFe: 1, indFinal: tributacaoPadrao.consumidorFinal ? 1 : 0,
        indPres: tributacaoPadrao.presencaComprador, indIntermed: 0, procEmi: 0, verProc: "ElianSigs-1.0"
    });
    const emit = `<emit>${elemento("CNPJ", cnpj)}${elemento("xNome", emitente.razaoSocial)}${endereco("enderEmit", origem, origem.codigoMunicipio)}${elemento("IE", ie)}<CRT>1</CRT></emit>`;
    const indIE = ieDest ? 1 : String(destinatario.inscricaoEstadual || "").trim().toUpperCase() === "ISENTO" ? 2 : 9;
    const dest = `<dest>${elemento(doc.length === 14 ? "CNPJ" : "CPF", doc)}${elemento("xNome", homologacao ? "NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL" : destinatario.nome)}${endereco("enderDest", destino, cMunDest)}${elemento("indIEDest", indIE)}${ieDest ? elemento("IE", ieDest) : ""}</dest>`;
    const produtos = itens.map(montarItem);
    const bruto = produtos.reduce((soma, item) => soma + item.bruto, 0);
    const desconto = produtos.reduce((soma, item) => soma + item.desconto, 0);
    const valor = dinheiro((bruto - desconto) / 100);
    const zeros = nomes => Object.fromEntries(nomes.split(" ").map(nome => [nome, "0.00"]));
    const totais = montarGrupo("ICMSTot", {
        ...zeros("vBC vICMS vICMSDeson vFCP vBCST vST vFCPST vFCPSTRet"),
        vProd: dinheiro(bruto / 100), ...zeros("vFrete vSeg"), vDesc: dinheiro(desconto / 100),
        ...zeros("vII vIPI vIPIDevol vPIS vCOFINS vOutro"), vNF: valor
    });
    const infNFe = `<infNFe xmlns="${NS}" Id="NFe${chave}" versao="4.00">${ide}${emit}${dest}${produtos.map(item => item.xml).join("")}<total>${totais}</total><transp><modFrete>9</modFrete></transp><pag>${montarGrupo("detPag", {tPag: pagamento, vPag: valor})}</pag></infNFe>`;
    return { chave, xml: `<NFe xmlns="${NS}">${infNFe}</NFe>`, infNFe };
}

function montarNfeHomologacao(nota, codigoNumerico, data) {
    if (nota.ambiente !== "HOMOLOGACAO") throw new Error("A prévia é exclusiva de homologação.");
    return montarNfe(nota, codigoNumerico, data);
}

module.exports = { montarNfe, montarNfeHomologacao, chaveNfe, dataEmissao };
