ALTER TABLE "Produto"
ADD COLUMN "estoqueAtual" DECIMAL(12,3) NOT NULL DEFAULT 0,
ADD COLUMN "estoqueMinimo" DECIMAL(12,3) NOT NULL DEFAULT 0;

CREATE TABLE "MovimentacaoEstoqueProduto" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "produtoId" INTEGER NOT NULL,
    "responsavelId" INTEGER,
    "tipo" "TipoMovimentacaoEstoque" NOT NULL,
    "origem" "OrigemMovimentacaoEstoque" NOT NULL DEFAULT 'AJUSTE_MANUAL',
    "quantidade" DECIMAL(12,3) NOT NULL,
    "saldoAnterior" DECIMAL(12,3) NOT NULL,
    "saldoPosterior" DECIMAL(12,3) NOT NULL,
    "dataMovimentacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MovimentacaoEstoqueProduto_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MovimentacaoEstoqueProduto_empresaId_dataMovimentacao_idx"
ON "MovimentacaoEstoqueProduto"("empresaId", "dataMovimentacao");

CREATE INDEX "MovimentacaoEstoqueProduto_produtoId_dataMovimentacao_idx"
ON "MovimentacaoEstoqueProduto"("produtoId", "dataMovimentacao");

ALTER TABLE "MovimentacaoEstoqueProduto"
ADD CONSTRAINT "MovimentacaoEstoqueProduto_empresaId_fkey"
FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MovimentacaoEstoqueProduto"
ADD CONSTRAINT "MovimentacaoEstoqueProduto_produtoId_fkey"
FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MovimentacaoEstoqueProduto"
ADD CONSTRAINT "MovimentacaoEstoqueProduto_responsavelId_fkey"
FOREIGN KEY ("responsavelId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
