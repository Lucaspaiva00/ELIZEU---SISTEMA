const prisma = require("../config/prisma");
const { normalizarPermissoes } = require("../config/permissoes");

class ControleAcessoRepository {
    async garantirEstrutura() {
        // Fallback seguro para ambientes cujo Start Command não executa migrations.
        // A migration formal continua no projeto e usa IF NOT EXISTS.
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "UsuarioControleAcesso" (
                "usuarioId" INTEGER NOT NULL,
                "permissoes" JSONB NOT NULL,
                "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "UsuarioControleAcesso_pkey" PRIMARY KEY ("usuarioId"),
                CONSTRAINT "UsuarioControleAcesso_usuarioId_fkey"
                    FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id")
                    ON DELETE CASCADE ON UPDATE CASCADE
            )
        `);

        await prisma.$executeRawUnsafe(`
            CREATE INDEX IF NOT EXISTS "UsuarioControleAcesso_usuarioId_idx"
            ON "UsuarioControleAcesso"("usuarioId")
        `);
    }

    async buscar(usuarioId) {
        const id = Number(usuarioId);
        if (!Number.isInteger(id) || id <= 0) return null;

        const registro = await prisma.usuarioControleAcesso.findUnique({
            where: { usuarioId: id },
            select: { permissoes: true }
        });

        if (!registro) return null;

        return Array.isArray(registro.permissoes)
            ? normalizarPermissoes(registro.permissoes)
            : [];
    }

    async salvar(usuarioId, permissoes) {
        const id = Number(usuarioId);
        const lista = normalizarPermissoes(permissoes);

        await prisma.usuarioControleAcesso.upsert({
            where: { usuarioId: id },
            create: {
                usuarioId: id,
                permissoes: lista
            },
            update: {
                permissoes: lista
            }
        });

        return lista;
    }

    async remover(usuarioId) {
        const id = Number(usuarioId);
        await prisma.usuarioControleAcesso.deleteMany({
            where: { usuarioId: id }
        });
    }
}

module.exports = new ControleAcessoRepository();
