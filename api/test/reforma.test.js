const { test } = require('node:test');
const assert = require('node:assert/strict');
const rtc = require('../src/utils/classificacaoRtc');
const nfe = require('../src/services/nfe.service');
const produto = require('../src/services/produto.service');
const data = new Date('2026-10-13T12:00:00Z');

test('catálogo preserva códigos como strings e restringe NF-e/vigência', () => {
    assert.equal(rtc.validar('000', '000001', data), null);
    assert.match(rtc.validar('000', '000002', data), /não permite/);
    assert.match(rtc.validar('999', '999999', data), /não encontrado/);
    assert.match(rtc.validar('200', '000001', data), /não encontrado/);
    assert.match(rtc.validar('000', '000001', new Date('2024-01-01')), /vigente/);
    assert.ok(rtc.listar(data).every(c => c.permiteNfe));
});

test('vigência inclui limites e exclui período vencido', () => {
    const c = { inicio: '2026-01-01', fim: '2026-10-13' };
    assert.equal(rtc.vigente(c, data), true);
    assert.equal(rtc.vigente(c, new Date('2026-10-14')), false);
});

test('cadastro não aceita código inventado ou classificação de outro documento', () => {
    assert.throws(() => produto.prepararDados({ ibsCbsSituacaoTributaria: '999', ibsCbsClassificacaoTributaria: '999999' }), /não encontrado/);
    assert.throws(() => produto.prepararDados({ ibsCbsSituacaoTributaria: '000', ibsCbsClassificacaoTributaria: '000002' }), /não permite/);
    assert.equal(produto.prepararDados({}).ibsCbsSituacaoTributaria, null);
});

test('cadastro completo não atribui alíquota ou aprovação contábil', () => {
    const p = { ncm: '12345678', cfopPadrao: '5102', origemMercadoria: '0', ibsCbsSituacaoTributaria: '000', ibsCbsClassificacaoTributaria: '000001' };
    assert.equal(rtc.pendenciasProduto(p).length, 0);
    assert.ok(rtc.pendenciasProduto({ ...p, ibsCbsClassificacaoTributaria: null }).length);
    assert.equal(p.cbsAliquota, undefined);
});

function nota(rtcAtivo = false) {
    return { serie: 1, numero: 1, dadosEmissao: {
        documento: { naturezaOperacao: 'Teste' },
        emitente: { cnpj: '00000000000000', crt: 1, endereco: { uf: 'SP' } },
        destinatario: { cpfCnpj: '00000000000', endereco: { uf: 'SP' } },
        tributacaoPadrao: { rtcAtivo, icmsSituacaoTributaria: '102', pisSituacaoTributaria: '07', cofinsSituacaoTributaria: '07' },
        venda: { total: 10, formaPagamento: 'PIX' },
        itens: [{ numeroItem: 1, codigo: '1', descricao: 'Teste', ncm: '12345678', cfop: '5102', origemMercadoria: '0', quantidade: 1, valorUnitario: 10 }]
    } };
}

test('payload legado mantém ICMS/PIS/COFINS sem adicionar IBS/CBS', () => {
    const payload = nfe.montarPayloadFocus(nota());
    assert.equal(payload.items[0].icms_situacao_tributaria, '102');
    assert.equal(payload.items[0].pis_situacao_tributaria, '07');
    assert.equal(payload.items[0].cofins_situacao_tributaria, '07');
    assert.equal(payload.items[0].ibs_cbs_situacao_tributaria, undefined);
});

test('snapshot RTC não pode gerar payload sem tributos', () => {
    assert.throws(() => nfe.montarPayloadFocus(nota(true)), /Emissão IBS\/CBS indisponível/);
});

test('IS informado bloqueia payload mesmo com RTC desativado', () => {
    const n = nota();
    n.dadosEmissao.itens[0].isSituacaoTributaria = '000';
    assert.throws(() => nfe.montarPayloadFocus(n), /Imposto Seletivo indisponível/);
});

test('validação bloqueia RTC antes de reservar número ou transmitir', async () => {
    const repo = require('../src/repositories/nfe.repository');
    const original = repo.buscarVenda;
    repo.buscarVenda = async () => ({ status: 'FATURADA', empresa: { configuracaoFiscal: { rtcAtivo: true } }, cliente: {}, itens: [] });
    try {
        const resultado = await nfe.validar(1, 1);
        assert.equal(resultado.pronta, false);
        assert.ok(resultado.pendencias.some(p => p.mensagem === rtc.BLOQUEIO_EMISSAO));
    } finally { repo.buscarVenda = original; }
});
