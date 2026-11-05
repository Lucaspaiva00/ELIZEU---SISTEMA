const prisma = require("../config/prisma");

function moduloDaRota(rota) {
    const limpa = String(rota || "").split("?")[0];
    const partes = limpa.split("/").filter(Boolean);
    return partes[1] || partes[0] || "sistema";
}

class AuditoriaRepository {
    async registrar(dados) {
        return prisma.auditoria.create({
            data: {
                empresaId: dados.empresaId,
                usuarioId: dados.usuarioId || null,
                usuarioNome: dados.usuarioNome || null,
                usuarioEmail: dados.usuarioEmail || null,
                metodo: dados.metodo,
                modulo: moduloDaRota(dados.rota),
                rota: String(dados.rota || "").slice(0, 500),
                statusHttp: Number(dados.statusHttp || 0),
                sucesso: Boolean(dados.sucesso),
                referencia: dados.referencia || null,
                ip: dados.ip ? String(dados.ip).slice(0, 120) : null,
                userAgent: dados.userAgent ? String(dados.userAgent).slice(0, 500) : null
            }
        });
    }

    async listar(empresaId, filtros = {}) {
        const pagina = Math.max(Number(filtros.pagina) || 1, 1);
        const limite = Math.min(Math.max(Number(filtros.limite) || 50, 1), 200);
        const where = { empresaId };

        if (filtros.modulo) where.modulo = String(filtros.modulo);
        if (filtros.usuarioId) where.usuarioId = Number(filtros.usuarioId);
        if (filtros.sucesso === "true") where.sucesso = true;
        if (filtros.sucesso === "false") where.sucesso = false;

        const [registros, total] = await Promise.all([
            prisma.auditoria.findMany({
                where,
                orderBy: { criadoEm: "desc" },
                skip: (pagina - 1) * limite,
                take: limite
            }),
            prisma.auditoria.count({ where })
        ]);

        return { registros, total, pagina, limite, paginas: Math.max(1, Math.ceil(total / limite)) };
    }
}

module.exports = new AuditoriaRepository();
