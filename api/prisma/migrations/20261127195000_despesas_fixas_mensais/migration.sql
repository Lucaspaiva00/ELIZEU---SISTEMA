CREATE TABLE "DespesaFixaMensal" (
    "empresaId" INTEGER NOT NULL,
    "mes" TEXT NOT NULL,
    "itens" JSONB NOT NULL,
    CONSTRAINT "DespesaFixaMensal_pkey" PRIMARY KEY ("empresaId", "mes"),
    CONSTRAINT "DespesaFixaMensal_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
