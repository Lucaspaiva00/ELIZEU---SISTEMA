-- Novas unidades utilizadas por serviços.
ALTER TYPE "UnidadeMedida" ADD VALUE IF NOT EXISTS 'H';
ALTER TYPE "UnidadeMedida" ADD VALUE IF NOT EXISTS 'DIA';
ALTER TYPE "UnidadeMedida" ADD VALUE IF NOT EXISTS 'M2';
ALTER TYPE "UnidadeMedida" ADD VALUE IF NOT EXISTS 'M3';

CREATE TYPE "TipoItemComercial" AS ENUM ('PRODUTO', 'SERVICO');

CREATE TABLE "CategoriaServico" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CategoriaServico_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Servico" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "categoriaId" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "unidadeMedida" "UnidadeMedida" NOT NULL DEFAULT 'UN',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Servico_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VariacaoServico" (
    "id" SERIAL NOT NULL,
    "servicoId" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT,
    "precoCusto" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "precoVenda" DECIMAL(12,2) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VariacaoServico_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ItemTabelaPrecoServico" (
    "id" SERIAL NOT NULL,
    "tabelaPrecoId" INTEGER NOT NULL,
    "variacaoServicoId" INTEGER NOT NULL,
    "preco" DECIMAL(12,2) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ItemTabelaPrecoServico_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ItemOrcamento" ADD COLUMN "tipo" "TipoItemComercial" NOT NULL DEFAULT 'PRODUTO';
ALTER TABLE "ItemOrcamento" ADD COLUMN "variacaoServicoId" INTEGER;
ALTER TABLE "ItemOrcamento" ALTER COLUMN "variacaoProdutoId" DROP NOT NULL;

ALTER TABLE "ItemVenda" ADD COLUMN "tipo" "TipoItemComercial" NOT NULL DEFAULT 'PRODUTO';
ALTER TABLE "ItemVenda" ADD COLUMN "variacaoServicoId" INTEGER;
ALTER TABLE "ItemVenda" ALTER COLUMN "variacaoProdutoId" DROP NOT NULL;

CREATE UNIQUE INDEX "CategoriaServico_empresaId_nome_key" ON "CategoriaServico"("empresaId", "nome");
CREATE INDEX "CategoriaServico_empresaId_idx" ON "CategoriaServico"("empresaId");
CREATE UNIQUE INDEX "Servico_empresaId_codigo_key" ON "Servico"("empresaId", "codigo");
CREATE INDEX "Servico_empresaId_categoriaId_idx" ON "Servico"("empresaId", "categoriaId");
CREATE UNIQUE INDEX "VariacaoServico_codigo_key" ON "VariacaoServico"("codigo");
CREATE INDEX "VariacaoServico_servicoId_idx" ON "VariacaoServico"("servicoId");
CREATE UNIQUE INDEX "ItemTabelaPrecoServico_tabelaPrecoId_variacaoServicoId_key" ON "ItemTabelaPrecoServico"("tabelaPrecoId", "variacaoServicoId");
CREATE INDEX "ItemTabelaPrecoServico_variacaoServicoId_idx" ON "ItemTabelaPrecoServico"("variacaoServicoId");
CREATE INDEX "ItemOrcamento_variacaoServicoId_idx" ON "ItemOrcamento"("variacaoServicoId");
CREATE INDEX "ItemVenda_variacaoServicoId_idx" ON "ItemVenda"("variacaoServicoId");

ALTER TABLE "CategoriaServico" ADD CONSTRAINT "CategoriaServico_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Servico" ADD CONSTRAINT "Servico_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Servico" ADD CONSTRAINT "Servico_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "CategoriaServico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VariacaoServico" ADD CONSTRAINT "VariacaoServico_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ItemTabelaPrecoServico" ADD CONSTRAINT "ItemTabelaPrecoServico_tabelaPrecoId_fkey" FOREIGN KEY ("tabelaPrecoId") REFERENCES "TabelaPreco"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ItemTabelaPrecoServico" ADD CONSTRAINT "ItemTabelaPrecoServico_variacaoServicoId_fkey" FOREIGN KEY ("variacaoServicoId") REFERENCES "VariacaoServico"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ItemOrcamento" ADD CONSTRAINT "ItemOrcamento_variacaoServicoId_fkey" FOREIGN KEY ("variacaoServicoId") REFERENCES "VariacaoServico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ItemVenda" ADD CONSTRAINT "ItemVenda_variacaoServicoId_fkey" FOREIGN KEY ("variacaoServicoId") REFERENCES "VariacaoServico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Garante que cada item seja exclusivamente produto ou serviço.
ALTER TABLE "ItemOrcamento" ADD CONSTRAINT "ItemOrcamento_tipo_referencia_check" CHECK (
    ("tipo" = 'PRODUTO' AND "variacaoProdutoId" IS NOT NULL AND "variacaoServicoId" IS NULL)
    OR
    ("tipo" = 'SERVICO' AND "variacaoProdutoId" IS NULL AND "variacaoServicoId" IS NOT NULL)
);

ALTER TABLE "ItemVenda" ADD CONSTRAINT "ItemVenda_tipo_referencia_check" CHECK (
    ("tipo" = 'PRODUTO' AND "variacaoProdutoId" IS NOT NULL AND "variacaoServicoId" IS NULL)
    OR
    ("tipo" = 'SERVICO' AND "variacaoProdutoId" IS NULL AND "variacaoServicoId" IS NOT NULL)
);
