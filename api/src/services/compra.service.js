const compraRepository = require("../repositories/compra.repository");

const FORMAS = ["DINHEIRO","PIX","CARTAO_CREDITO","CARTAO_DEBITO","BOLETO","TRANSFERENCIA","CHEQUE","CREDITO_LOJA","OUTRO"];

function numeroPositivo(valor, nome) {
    const n = Number(valor);
    if (!Number.isFinite(n) || n <= 0) throw new Error(`${nome} deve ser maior que zero.`);
    return n;
}
function numeroNaoNegativo(valor, nome) {
    const n = Number(valor || 0);
    if (!Number.isFinite(n) || n < 0) throw new Error(`${nome} não pode ser negativo.`);
    return n;
}
function dataValida(valor, nome, obrigatoria=false) {
    if (!valor) {
        if (obrigatoria) throw new Error(`Informe ${nome}.`);
        return null;
    }
    const d = /^\d{4}-\d{2}-\d{2}$/.test(String(valor)) ? new Date(`${valor}T12:00:00`) : new Date(valor);
    if (Number.isNaN(d.getTime())) throw new Error(`${nome} inválida.`);
    return d;
}

class CompraService {
    listar(empresaId, filtros) {
        return compraRepository.listar(empresaId, filtros);
    }
    buscarPorId(id, empresaId) {
        return compraRepository.buscarPorId(id, empresaId);
    }
    apoio(empresaId) {
        return compraRepository.apoio(empresaId);
    }
    resumoFornecedor(fornecedorId, empresaId) {
        return compraRepository.resumoFornecedor(fornecedorId, empresaId);
    }

    async criar(dados) {
        const fornecedorId = Number(dados.fornecedorId);
        if (!Number.isInteger(fornecedorId) || fornecedorId <= 0) throw new Error("Selecione um fornecedor.");

        if (!Array.isArray(dados.itens) || !dados.itens.length) throw new Error("Adicione pelo menos um produto à compra.");

        const vistos = new Set();
        const itens = dados.itens.map((item, indice) => {
            const produtoId = Number(item.produtoId);
            if (!Number.isInteger(produtoId) || produtoId <= 0) throw new Error(`Produto inválido no item ${indice + 1}.`);
            if (vistos.has(produtoId)) throw new Error("O mesmo produto não deve aparecer duas vezes na mesma compra.");
            vistos.add(produtoId);
            return {
                produtoId,
                quantidade: numeroPositivo(item.quantidade, `Quantidade do item ${indice + 1}`),
                custoUnitario: numeroPositivo(item.custoUnitario, `Custo do item ${indice + 1}`)
            };
        });

        const gerarFinanceiro = dados.gerarFinanceiro !== false;
        const formaPagamento = dados.formaPagamento || null;
        if (formaPagamento && !FORMAS.includes(formaPagamento)) throw new Error("Forma de pagamento inválida.");

        const quantidadeParcelas = gerarFinanceiro ? Number(dados.quantidadeParcelas || 1) : 1;
        if (!Number.isInteger(quantidadeParcelas) || quantidadeParcelas < 1 || quantidadeParcelas > 60) {
            throw new Error("A quantidade de parcelas deve estar entre 1 e 60.");
        }

        const primeiroVencimento = gerarFinanceiro
            ? dataValida(dados.primeiroVencimento, "o primeiro vencimento", true)
            : null;

        return compraRepository.criar({
            empresaId: dados.empresaId,
            usuarioId: dados.usuarioId,
            fornecedorId,
            itens,
            dataCompra: dataValida(dados.dataCompra, "Data da compra") || new Date(),
            numeroDocumento: String(dados.numeroDocumento || "").trim() || null,
            formaPagamento,
            gerarFinanceiro,
            quantidadeParcelas,
            primeiroVencimento,
            desconto: numeroNaoNegativo(dados.desconto, "Desconto"),
            frete: numeroNaoNegativo(dados.frete, "Frete"),
            outrasDespesas: numeroNaoNegativo(dados.outrasDespesas, "Outras despesas"),
            observacoes: String(dados.observacoes || "").trim() || null
        });
    }

    cancelar(id, dados) {
        const compraId = Number(id);
        if (!Number.isInteger(compraId) || compraId <= 0) throw new Error("Compra inválida.");
        const motivo = String(dados.motivo || "").trim();
        if (!motivo) throw new Error("Informe o motivo do cancelamento.");
        return compraRepository.cancelar(compraId, dados.empresaId, dados.usuarioId, motivo);
    }
}

module.exports = new CompraService();
