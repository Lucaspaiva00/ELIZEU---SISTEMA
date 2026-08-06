CREATE TYPE "RegimeTributario" AS ENUM (
    'MEI',
    'SIMPLES_NACIONAL',
    'SIMPLES_NACIONAL_EXCESSO',
    'REGIME_NORMAL'
);

CREATE TYPE "AmbienteFiscal" AS ENUM ('HOMOLOGACAO', 'PRODUCAO');

CREATE TABLE "ConfiguracaoFiscal" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "regimeTributario" "RegimeTributario",
    "crt" INTEGER,
    "inscricaoMunicipal" TEXT,
    "cnaePrincipal" TEXT,
    "codigoMunicipio" TEXT,
    "ambiente" "AmbienteFiscal" NOT NULL DEFAULT 'HOMOLOGACAO',
    "serieNfe" INTEGER NOT NULL DEFAULT 1,
    "proximoNumeroNfe" INTEGER NOT NULL DEFAULT 1,
    "cfopPadrao" TEXT,
    "naturezaOperacao" TEXT,
    "emailFiscal" TEXT,
    "informacoesComplementares" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ConfiguracaoFiscal_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ConfiguracaoFiscal_crt_check" CHECK ("crt" IS NULL OR "crt" BETWEEN 1 AND 4),
    CONSTRAINT "ConfiguracaoFiscal_serie_check" CHECK ("serieNfe" BETWEEN 1 AND 999),
    CONSTRAINT "ConfiguracaoFiscal_numero_check" CHECK ("proximoNumeroNfe" > 0)
);

CREATE TABLE "CertificadoDigital" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "conteudoCriptografado" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "authTag" TEXT NOT NULL,
    "validade" TIMESTAMP(3),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "enviadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CertificadoDigital_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConfiguracaoFiscal_empresaId_key" ON "ConfiguracaoFiscal"("empresaId");
CREATE INDEX "ConfiguracaoFiscal_empresaId_ambiente_idx" ON "ConfiguracaoFiscal"("empresaId", "ambiente");
CREATE UNIQUE INDEX "CertificadoDigital_empresaId_key" ON "CertificadoDigital"("empresaId");
CREATE INDEX "CertificadoDigital_empresaId_ativo_idx" ON "CertificadoDigital"("empresaId", "ativo");

ALTER TABLE "ConfiguracaoFiscal"
ADD CONSTRAINT "ConfiguracaoFiscal_empresaId_fkey"
FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CertificadoDigital"
ADD CONSTRAINT "CertificadoDigital_empresaId_fkey"
FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
