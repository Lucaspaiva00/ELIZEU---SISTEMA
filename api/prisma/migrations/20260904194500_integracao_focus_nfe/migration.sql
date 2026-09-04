-- Integração Focus NFe + parâmetros tributários padrão

ALTER TABLE "ConfiguracaoFiscal"
ADD COLUMN "icmsSituacaoTributariaPadrao" TEXT,
ADD COLUMN "pisSituacaoTributariaPadrao" TEXT,
ADD COLUMN "cofinsSituacaoTributariaPadrao" TEXT,
ADD COLUMN "modalidadeFrete" INTEGER NOT NULL DEFAULT 9,
ADD COLUMN "presencaComprador" INTEGER NOT NULL DEFAULT 9,
ADD COLUMN "consumidorFinal" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "emitirNfeAoFaturar" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "IntegracaoFocusNfe" (
  "id" SERIAL NOT NULL,
  "empresaId" INTEGER NOT NULL,
  "tokenHomologacaoCriptografado" TEXT,
  "tokenHomologacaoIv" TEXT,
  "tokenHomologacaoAuthTag" TEXT,
  "tokenProducaoCriptografado" TEXT,
  "tokenProducaoIv" TEXT,
  "tokenProducaoAuthTag" TEXT,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "ultimaValidacaoHomologacao" TIMESTAMP(3),
  "ultimaValidacaoProducao" TIMESTAMP(3),
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IntegracaoFocusNfe_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IntegracaoFocusNfe_empresaId_key" ON "IntegracaoFocusNfe"("empresaId");
CREATE INDEX "IntegracaoFocusNfe_empresaId_ativo_idx" ON "IntegracaoFocusNfe"("empresaId", "ativo");

ALTER TABLE "IntegracaoFocusNfe"
ADD CONSTRAINT "IntegracaoFocusNfe_empresaId_fkey"
FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NotaFiscal"
ADD COLUMN "referenciaFocus" TEXT,
ADD COLUMN "statusFocus" TEXT,
ADD COLUMN "caminhoDanfe" TEXT,
ADD COLUMN "caminhoXml" TEXT,
ADD COLUMN "respostaFocus" JSONB;

CREATE UNIQUE INDEX "NotaFiscal_referenciaFocus_key" ON "NotaFiscal"("referenciaFocus");
