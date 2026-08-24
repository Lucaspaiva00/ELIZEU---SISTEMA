-- Renomeia o atributo comercial da variação sem perder os dados já existentes.
ALTER TABLE "VariacaoProduto" RENAME COLUMN "cor" TO "saida";

-- Custos internos do orçamento: aparecem somente para a equipe e entram no lucro.
ALTER TABLE "Orcamento"
    ADD COLUMN "custosInternos" JSONB,
    ADD COLUMN "custoItensTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN "custoInternoTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN "lucroEstimado" DECIMAL(12,2) NOT NULL DEFAULT 0;

ALTER TABLE "ItemOrcamento"
    ADD COLUMN "custoUnitario" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- Snapshot para que a venda mantenha o custo/lucro do momento da aprovação.
ALTER TABLE "Venda"
    ADD COLUMN "custosInternos" JSONB,
    ADD COLUMN "custoItensTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN "custoInternoTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN "lucroEstimado" DECIMAL(12,2) NOT NULL DEFAULT 0;
