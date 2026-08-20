-- CreateEnum
CREATE TYPE "StatusNotaFiscal" AS ENUM (
  'PENDENTE_CONFIGURACAO',
  'PRONTA_TRANSMISSAO',
  'TRANSMITINDO',
  'AUTORIZADA',
  'REJEITADA',
  'ERRO',
  'CANCELADA'
);

-- CreateTable
CREATE TABLE "NotaFiscal" (
  "id" SERIAL NOT NULL,
  "empresaId" INTEGER NOT NULL,
  "vendaId" INTEGER NOT NULL,
  "status" "StatusNotaFiscal" NOT NULL DEFAULT 'PENDENTE_CONFIGURACAO',
  "ambiente" "AmbienteFiscal" NOT NULL,
  "modelo" INTEGER NOT NULL DEFAULT 55,
  "serie" INTEGER NOT NULL,
  "numero" INTEGER NOT NULL,
  "chaveAcesso" TEXT,
  "protocolo" TEXT,
  "naturezaOperacao" TEXT,
  "dadosEmissao" JSONB,
  "xmlEnvio" TEXT,
  "xmlRetorno" TEXT,
  "motivoStatus" TEXT,
  "preparadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "transmitidaEm" TIMESTAMP(3),
  "autorizadaEm" TIMESTAMP(3),
  "canceladaEm" TIMESTAMP(3),
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "NotaFiscal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotaFiscal_vendaId_key" ON "NotaFiscal"("vendaId");
CREATE UNIQUE INDEX "NotaFiscal_empresaId_serie_numero_key" ON "NotaFiscal"("empresaId", "serie", "numero");
CREATE INDEX "NotaFiscal_empresaId_status_idx" ON "NotaFiscal"("empresaId", "status");
CREATE INDEX "NotaFiscal_vendaId_idx" ON "NotaFiscal"("vendaId");

ALTER TABLE "NotaFiscal"
ADD CONSTRAINT "NotaFiscal_empresaId_fkey"
FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NotaFiscal"
ADD CONSTRAINT "NotaFiscal_vendaId_fkey"
FOREIGN KEY ("vendaId") REFERENCES "Venda"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
