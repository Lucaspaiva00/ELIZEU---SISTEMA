const catalogo = require('../data/classificacoes-rtc.json');

function vigente(registro, data) {
    const dia = data.toISOString().slice(0, 10);
    return (!registro.inicio || registro.inicio.slice(0, 10) <= dia)
        && (!registro.fim || registro.fim.slice(0, 10) >= dia);
}

function listar(data = new Date()) {
    return catalogo.classificacoes.filter(c => c.permiteNfe && vigente(c, data));
}

function validar(cst, codigo, data = new Date()) {
    if (!/^\d{3}$/.test(cst || '') || !/^\d{6}$/.test(codigo || '')) {
        return 'Informe CST IBS/CBS (3 dígitos) e cClassTrib (6 dígitos).';
    }
    const classificacao = catalogo.classificacoes.find(c => c.codigo === codigo && c.cst === cst);
    if (!classificacao) return 'CST/cClassTrib não encontrado na tabela oficial integrada. Confira a classificação com o contador.';
    if (!classificacao.permiteNfe) return 'Esta classificação tributária não permite NF-e modelo 55.';
    if (!vigente(classificacao, data)) return 'Esta classificação tributária não está vigente na data informada.';
    return null;
}

// Completude cadastral não representa aprovação contábil nem validação de uma operação.
function pendenciasProduto(produto) {
    const pendencias = [];
    if (!/^\d{8}$/.test(produto.ncm || '')) pendencias.push('NCM deve possuir 8 dígitos.');
    if (!/^\d{4}$/.test(produto.cfopPadrao || '')) pendencias.push('CFOP padrão deve possuir 4 dígitos.');
    if (!/^[0-8]$/.test(produto.origemMercadoria || '')) pendencias.push('Informe a origem da mercadoria.');
    const erro = validar(produto.ibsCbsSituacaoTributaria, produto.ibsCbsClassificacaoTributaria);
    if (erro) pendencias.push(erro);
    return pendencias;
}

const BLOQUEIO_EMISSAO = 'Emissão IBS/CBS indisponível: o cálculo por operação, os grupos e totais do payload Focus ainda precisam ser implementados e homologados. A classificação cadastral não autoriza transmissão fiscal.';

module.exports = { catalogo, vigente, listar, validar, pendenciasProduto, BLOQUEIO_EMISSAO };
