DO $$ BEGIN
  CREATE TYPE "StatusCompra" AS ENUM ('CONFIRMADA', 'CANCELADA');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "Produto"
ADD COLUMN IF NOT EXISTS "ultimoCusto" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "custoMedio" DECIMAL(12,2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "Compra" (
  "id" SERIAL NOT NULL,
  "empresaId" INTEGER NOT NULL,
  "fornecedorId" INTEGER NOT NULL,
  "numero" INTEGER NOT NULL,
  "status" "StatusCompra" NOT NULL DEFAULT 'CONFIRMADA',
  "dataCompra" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "numeroDocumento" TEXT,
  "formaPagamento" "FormaPagamento",
  "quantidadeParcelas" INTEGER NOT NULL DEFAULT 1,
  "primeiroVencimento" TIMESTAMP(3),
  "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "desconto" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "frete" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "outrasDespesas" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "total" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "observacoes" TEXT,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Compra_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ItemCompra" (
  "id" SERIAL NOT NULL,
  "compraId" INTEGER NOT NULL,
  "produtoId" INTEGER NOT NULL,
  "quantidade" DECIMAL(12,3) NOT NULL,
  "custoUnitario" DECIMAL(12,2) NOT NULL,
  "total" DECIMAL(14,2) NOT NULL,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ItemCompra_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ContaPagar" ADD COLUMN IF NOT EXISTS "compraId" INTEGER;
ALTER TABLE "MovimentacaoEstoqueProduto" ADD COLUMN IF NOT EXISTS "itemCompraId" INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS "Compra_empresaId_numero_key" ON "Compra"("empresaId","numero");
CREATE INDEX IF NOT EXISTS "Compra_empresaId_dataCompra_idx" ON "Compra"("empresaId","dataCompra");
CREATE INDEX IF NOT EXISTS "Compra_fornecedorId_dataCompra_idx" ON "Compra"("fornecedorId","dataCompra");
CREATE INDEX IF NOT EXISTS "ItemCompra_compraId_idx" ON "ItemCompra"("compraId");
CREATE INDEX IF NOT EXISTS "ItemCompra_produtoId_idx" ON "ItemCompra"("produtoId");
CREATE INDEX IF NOT EXISTS "ContaPagar_compraId_idx" ON "ContaPagar"("compraId");
CREATE INDEX IF NOT EXISTS "MovimentacaoEstoqueProduto_itemCompraId_idx" ON "MovimentacaoEstoqueProduto"("itemCompraId");

DO $$ BEGIN
  ALTER TABLE "Compra" ADD CONSTRAINT "Compra_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "Compra" ADD CONSTRAINT "Compra_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "Fornecedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "ItemCompra" ADD CONSTRAINT "ItemCompra_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "Compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "ItemCompra" ADD CONSTRAINT "ItemCompra_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "ContaPagar" ADD CONSTRAINT "ContaPagar_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "Compra"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "MovimentacaoEstoqueProduto" ADD CONSTRAINT "MovimentacaoEstoqueProduto_itemCompraId_fkey" FOREIGN KEY ("itemCompraId") REFERENCES "ItemCompra"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
