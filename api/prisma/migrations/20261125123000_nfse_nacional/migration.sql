ALTER TABLE "Servico"
ADD COLUMN "nfseCodigoServicoNacional" TEXT,
ADD COLUMN "nfseCodigoNbs" TEXT,
ADD COLUMN "nfseAliquotaIss" DECIMAL(7,4),
ADD COLUMN "nfseIssRetido" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "nfseLocalIncidencia" TEXT,
ADD COLUMN "nfseDescricaoFiscal" TEXT;

ALTER TABLE "ConfiguracaoFiscal"
ADD COLUMN "serieDps" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "proximoNumeroDps" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE "NotaFiscalServico" (
  "id" SERIAL NOT NULL,
  "empresaId" INTEGER NOT NULL,
  "vendaId" INTEGER NOT NULL,
  "status" "StatusNotaFiscal" NOT NULL DEFAULT 'PENDENTE_CONFIGURACAO',
  "ambiente" "AmbienteFiscal" NOT NULL,
  "serieDps" INTEGER NOT NULL,
  "numeroDps" INTEGER NOT NULL,
  "chaveAcesso" TEXT,
  "numeroNfse" TEXT,
  "codigoVerificacao" TEXT,
  "dadosEmissao" JSONB,
  "xmlDps" TEXT,
  "xmlNfse" TEXT,
  "respostaApi" JSONB,
  "motivoStatus" TEXT,
  "preparadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "transmitidaEm" TIMESTAMP(3),
  "autorizadaEm" TIMESTAMP(3),
  "canceladaEm" TIMESTAMP(3),
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotaFiscalServico_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotaFiscalServico_vendaId_key" ON "NotaFiscalServico"("vendaId");
CREATE UNIQUE INDEX "NotaFiscalServico_empresaId_serieDps_numeroDps_key" ON "NotaFiscalServico"("empresaId","serieDps","numeroDps");
CREATE INDEX "NotaFiscalServico_empresaId_status_idx" ON "NotaFiscalServico"("empresaId","status");
CREATE INDEX "NotaFiscalServico_vendaId_idx" ON "NotaFiscalServico"("vendaId");

ALTER TABLE "NotaFiscalServico" ADD CONSTRAINT "NotaFiscalServico_empresaId_fkey"
FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotaFiscalServico" ADD CONSTRAINT "NotaFiscalServico_vendaId_fkey"
FOREIGN KEY ("vendaId") REFERENCES "Venda"("id") ON DELETE CASCADE ON UPDATE CASCADE;
