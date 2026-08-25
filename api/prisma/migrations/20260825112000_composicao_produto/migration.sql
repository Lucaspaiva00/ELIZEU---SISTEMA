-- Composição de produtos/padrões para formação do custo base
ALTER TABLE "Produto"
ADD COLUMN "composicao" JSONB,
ADD COLUMN "custoComposicao" DECIMAL(12,2) NOT NULL DEFAULT 0;
