const prisma = require("../config/prisma");

class FocusNfeRepository {
    buscar(empresaId) {
        return prisma.integracaoFocusNfe.findUnique({ where: { empresaId } });
    }

    salvar(empresaId, dados) {
        return prisma.integracaoFocusNfe.upsert({
            where: { empresaId },
            update: dados,
            create: { empresaId, ...dados }
        });
    }

    registrarValidacao(empresaId, ambiente) {
        const campo = ambiente === "PRODUCAO"
            ? "ultimaValidacaoProducao"
            : "ultimaValidacaoHomologacao";

        return prisma.integracaoFocusNfe.update({
            where: { empresaId },
            data: { [campo]: new Date() }
        });
    }
}

module.exports = new FocusNfeRepository();
