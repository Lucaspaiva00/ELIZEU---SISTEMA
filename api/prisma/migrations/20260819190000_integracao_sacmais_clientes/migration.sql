-- Integração SacMais: identificação e sincronização de clientes
ALTER TABLE "Cliente"
ADD COLUMN "sacmaisId" TEXT,
ADD COLUMN "origemCadastro" TEXT DEFAULT 'ERP',
ADD COLUMN "sincronizadoSacMaisEm" TIMESTAMP(3);

CREATE UNIQUE INDEX "Cliente_empresaId_sacmaisId_key"
ON "Cliente"("empresaId", "sacmaisId");

CREATE INDEX "Cliente_empresaId_sacmaisId_idx"
ON "Cliente"("empresaId", "sacmaisId");
