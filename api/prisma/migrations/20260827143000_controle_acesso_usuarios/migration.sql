CREATE TABLE IF NOT EXISTS "UsuarioControleAcesso" (
    "usuarioId" INTEGER NOT NULL,
    "permissoes" JSONB NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UsuarioControleAcesso_pkey" PRIMARY KEY ("usuarioId"),
    CONSTRAINT "UsuarioControleAcesso_usuarioId_fkey"
        FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "UsuarioControleAcesso_usuarioId_idx"
ON "UsuarioControleAcesso"("usuarioId");
