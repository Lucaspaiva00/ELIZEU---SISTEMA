CREATE TABLE "Fornecedor" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "tipoPessoa" "TipoPessoa" NOT NULL,
    "nome" TEXT NOT NULL,
    "nomeFantasia" TEXT,
    "cpfCnpj" TEXT NOT NULL,
    "inscricaoEstadual" TEXT,
    "telefone" TEXT,
    "celular" TEXT,
    "email" TEXT,
    "cep" TEXT,
    "endereco" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "pixTipo" TEXT,
    "pixChave" TEXT,
    "bancoNome" TEXT,
    "bancoAgencia" TEXT,
    "bancoConta" TEXT,
    "observacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Fornecedor_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Fornecedor_empresaId_cpfCnpj_key" ON "Fornecedor"("empresaId", "cpfCnpj");
CREATE INDEX "Fornecedor_empresaId_nome_idx" ON "Fornecedor"("empresaId", "nome");
CREATE INDEX "Fornecedor_empresaId_ativo_idx" ON "Fornecedor"("empresaId", "ativo");

ALTER TABLE "Fornecedor"
ADD CONSTRAINT "Fornecedor_empresaId_fkey"
FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Fornecedor" (
    "empresaId","tipoPessoa","nome","nomeFantasia","cpfCnpj","inscricaoEstadual",
    "telefone","celular","email","cep","endereco","numero","complemento","bairro",
    "cidade","estado","pixTipo","pixChave","bancoNome","bancoAgencia","bancoConta",
    "observacoes","ativo","criadoEm","atualizadoEm"
)
SELECT
    "empresaId","tipoPessoa","nome","nomeFantasia","cpfCnpj","inscricaoEstadual",
    "telefone","celular","email","cep","endereco","numero","complemento","bairro",
    "cidade","estado","pixTipo","pixChave","bancoNome","bancoAgencia","bancoConta",
    "observacoes","ativo","criadoEm","atualizadoEm"
FROM "Cliente"
WHERE "ehFornecedor" = true
ON CONFLICT ("empresaId","cpfCnpj") DO NOTHING;

ALTER TABLE "ContaPagar" DROP CONSTRAINT IF EXISTS "ContaPagar_fornecedorId_fkey";

UPDATE "ContaPagar" cp
SET "fornecedorId" = f."id"
FROM "Cliente" c
JOIN "Fornecedor" f
  ON f."empresaId" = c."empresaId"
 AND f."cpfCnpj" = c."cpfCnpj"
WHERE cp."fornecedorId" = c."id";

ALTER TABLE "ContaPagar"
ADD CONSTRAINT "ContaPagar_fornecedorId_fkey"
FOREIGN KEY ("fornecedorId") REFERENCES "Fornecedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Cliente"
DROP COLUMN "ehCliente",
DROP COLUMN "ehFornecedor",
DROP COLUMN "pixTipo",
DROP COLUMN "pixChave",
DROP COLUMN "bancoNome",
DROP COLUMN "bancoAgencia",
DROP COLUMN "bancoConta";
