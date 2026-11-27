const prisma = require("../config/prisma");

const formatoDia = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" });
const diaLocal = data => formatoDia.format(data);

function validarMes(valor) {
    if (typeof valor !== "string" || !/^20\d{2}-(0[1-9]|1[0-2])$/.test(valor)) {
        const erro = new Error("Selecione um mês válido.");
        erro.status = 400;
        throw erro;
    }
    return valor;
}

function normalizarItens(itens) {
    if (!Array.isArray(itens) || itens.length > 100) {
        const erro = new Error("Informe até 100 despesas no mês.");
        erro.status = 400;
        throw erro;
    }
    return itens.map(item => {
        const descricao = typeof item?.descricao === "string" ? item.descricao.trim() : "";
        const valor = String(item?.valor ?? "");
        if (!descricao || descricao.length > 120 || !/^\d{1,8}(?:\.\d{1,2})?$/.test(valor) || Number(valor) <= 0) {
            const erro = new Error("Informe uma descrição e um valor positivo com até duas casas decimais para cada despesa.");
            erro.status = 400;
            throw erro;
        }
        return { descricao, centavos: Math.round(Number(valor) * 100) };
    });
}

function calcularCobertura({ mes, hoje, itens, vendas, diasNoMes }) {
    const despesas = itens.reduce((soma, item) => soma + item.centavos, 0);
    const porDia = new Map();
    for (const venda of vendas) {
        const dia = diaLocal(venda.dataVenda);
        if (!dia.startsWith(mes + "-") || dia > hoje) continue;
        porDia.set(dia, (porDia.get(dia) || 0) + Math.round(Number(venda.lucroEstimado) * 100));
    }
    let acumulado = 0;
    let dataCobertura = null;
    const dias = [];
    for (let i = 1; i <= diasNoMes; i++) {
        const data = `${mes}-${String(i).padStart(2, "0")}`;
        if (data > hoje) break;
        const lucro = porDia.get(data) || 0;
        acumulado += lucro;
        if (despesas > 0 && acumulado >= despesas && !dataCobertura) dataCobertura = data;
        dias.push({ data, lucro, acumulado, falta: Math.max(0, despesas - acumulado), saldo: acumulado - despesas });
    }
    return { mes, hoje, itens, despesas, lucro: acumulado, falta: Math.max(0, despesas - acumulado), saldo: acumulado - despesas, dataCobertura, dias };
}

async function consultar(empresaId, mes, db = prisma) {
    const hoje = diaLocal(new Date());
    const [ano, numeroMes] = mes.split("-").map(Number);
    const inicio = new Date(Date.UTC(ano, numeroMes - 1, 1));
    const fim = new Date(Date.UTC(ano, numeroMes, 1));
    const { itens = [] } = await db.despesaFixaMensal.findUnique({ where: { empresaId_mes: { empresaId, mes } } }) || {};
    const vendas = await db.venda.findMany({
        where: { empresaId, status: "FATURADA", dataVenda: { gte: inicio, lt: new Date(+fim + 86400000) } },
        select: { dataVenda: true, lucroEstimado: true }
    });
    return calcularCobertura({ mes, hoje, itens, vendas, diasNoMes: new Date(+fim - 86400000).getUTCDate() });
}

async function salvar(empresaId, mes, itens) {
    const dados = normalizarItens(itens);
    return prisma.$transaction(async db => {
        await db.despesaFixaMensal.upsert({
            where: { empresaId_mes: { empresaId, mes } },
            create: { empresaId, mes, itens: dados },
            update: { itens: dados }
        });
        return consultar(empresaId, mes, db);
    });
}

module.exports = { validarMes, consultar, salvar, calcularCobertura };
