ALTER TABLE "ConfiguracaoFiscal"
ADD COLUMN "rtcAtivo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "cbsAliquotaPadrao" DECIMAL(7,4),
ADD COLUMN "ibsUfAliquotaPadrao" DECIMAL(7,4),
ADD COLUMN "ibsMunAliquotaPadrao" DECIMAL(7,4);

ALTER TABLE "Produto"
ADD COLUMN "ibsCbsSituacaoTributaria" TEXT,
ADD COLUMN "ibsCbsClassificacaoTributaria" TEXT,
ADD COLUMN "isSituacaoTributaria" TEXT,
ADD COLUMN "isClassificacaoTributaria" TEXT,
ADD COLUMN "isAliquota" DECIMAL(7,4);
