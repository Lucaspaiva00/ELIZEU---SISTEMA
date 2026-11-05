CREATE TABLE "Auditoria" (
  "id" SERIAL NOT NULL,
  "empresaId" INTEGER NOT NULL,
  "usuarioId" INTEGER,
  "usuarioNome" TEXT,
  "usuarioEmail" TEXT,
  "metodo" TEXT NOT NULL,
  "modulo" TEXT NOT NULL,
  "rota" TEXT NOT NULL,
  "statusHttp" INTEGER NOT NULL,
  "sucesso" BOOLEAN NOT NULL,
  "referencia" TEXT,
  "ip" TEXT,
  "userAgent" TEXT,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Auditoria_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Auditoria_empresaId_criadoEm_idx" ON "Auditoria"("empresaId","criadoEm");
CREATE INDEX "Auditoria_usuarioId_criadoEm_idx" ON "Auditoria"("usuarioId","criadoEm");
CREATE INDEX "Auditoria_empresaId_modulo_criadoEm_idx" ON "Auditoria"("empresaId","modulo","criadoEm");

ALTER TABLE "Auditoria" ADD CONSTRAINT "Auditoria_empresaId_fkey"
FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Auditoria" ADD CONSTRAINT "Auditoria_usuarioId_fkey"
FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
