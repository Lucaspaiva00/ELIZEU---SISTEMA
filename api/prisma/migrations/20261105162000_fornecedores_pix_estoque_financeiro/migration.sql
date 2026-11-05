ALTER TABLE "Cliente"
ADD COLUMN "ehCliente" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "ehFornecedor" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "pixTipo" TEXT,
ADD COLUMN "pixChave" TEXT,
ADD COLUMN "bancoNome" TEXT,
ADD COLUMN "bancoAgencia" TEXT,
ADD COLUMN "bancoConta" TEXT;

ALTER TABLE "ContaPagar"
ADD COLUMN "fornecedorId" INTEGER;

ALTER TABLE "MovimentacaoEstoqueProduto"
ADD COLUMN "contaPagarId" INTEGER;

CREATE INDEX "ContaPagar_fornecedorId_idx" ON "ContaPagar"("fornecedorId");
CREATE INDEX "MovimentacaoEstoqueProduto_contaPagarId_idx" ON "MovimentacaoEstoqueProduto"("contaPagarId");

ALTER TABLE "ContaPagar"
ADD CONSTRAINT "ContaPagar_fornecedorId_fkey"
FOREIGN KEY ("fornecedorId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MovimentacaoEstoqueProduto"
ADD CONSTRAINT "MovimentacaoEstoqueProduto_contaPagarId_fkey"
FOREIGN KEY ("contaPagarId") REFERENCES "ContaPagar"("id") ON DELETE SET NULL ON UPDATE CASCADE;
