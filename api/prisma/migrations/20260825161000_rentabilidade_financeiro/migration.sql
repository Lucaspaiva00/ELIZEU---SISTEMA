-- Formação de preço dos produtos compostos
ALTER TABLE "Produto"
ADD COLUMN "margemLucroPadrao" DECIMAL(7,3) NOT NULL DEFAULT 0;

-- Vínculo dos custos internos da venda com Contas a Pagar
ALTER TABLE "ContaPagar"
ADD COLUMN "vendaId" INTEGER,
ADD COLUMN "custoInternoIndice" INTEGER;

CREATE UNIQUE INDEX "ContaPagar_vendaId_custoInternoIndice_key"
ON "ContaPagar"("vendaId", "custoInternoIndice");

CREATE INDEX "ContaPagar_vendaId_idx"
ON "ContaPagar"("vendaId");

ALTER TABLE "ContaPagar"
ADD CONSTRAINT "ContaPagar_vendaId_fkey"
FOREIGN KEY ("vendaId") REFERENCES "Venda"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
