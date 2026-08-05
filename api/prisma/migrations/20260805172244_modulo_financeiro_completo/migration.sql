/*
  Warnings:

  - A unique constraint covering the columns `[empresaId,nome]` on the table `CategoriaProduto` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "StatusOrcamento" AS ENUM ('RASCUNHO', 'ENVIADO', 'APROVADO', 'REJEITADO', 'CANCELADO', 'VENCIDO');

-- CreateEnum
CREATE TYPE "StatusVenda" AS ENUM ('CONFIRMADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "FormaPagamento" AS ENUM ('DINHEIRO', 'PIX', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'BOLETO', 'TRANSFERENCIA', 'CHEQUE', 'CREDITO_LOJA', 'OUTRO');

-- CreateEnum
CREATE TYPE "PeriodicidadeParcela" AS ENUM ('SEMANAL', 'QUINZENAL', 'MENSAL', 'BIMESTRAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL', 'PERSONALIZADA');

-- CreateEnum
CREATE TYPE "TipoContaFinanceira" AS ENUM ('CAIXA', 'CONTA_CORRENTE', 'POUPANCA', 'CARTEIRA_DIGITAL', 'OUTRA');

-- CreateEnum
CREATE TYPE "NaturezaFinanceira" AS ENUM ('RECEITA', 'DESPESA', 'AMBAS');

-- CreateEnum
CREATE TYPE "StatusTitulo" AS ENUM ('PENDENTE', 'PARCIAL', 'PAGO', 'ATRASADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "TipoMovimentacaoFinanceira" AS ENUM ('ENTRADA', 'SAIDA');

-- CreateEnum
CREATE TYPE "OrigemMovimentacaoFinanceira" AS ENUM ('CONTA_RECEBER', 'CONTA_PAGAR', 'VENDA', 'LANCAMENTO_MANUAL', 'TRANSFERENCIA', 'ESTORNO', 'AJUSTE');

-- CreateEnum
CREATE TYPE "TipoMovimentacaoEstoque" AS ENUM ('ENTRADA', 'SAIDA', 'AJUSTE_ENTRADA', 'AJUSTE_SAIDA', 'DEVOLUCAO', 'CANCELAMENTO_VENDA');

-- CreateEnum
CREATE TYPE "OrigemMovimentacaoEstoque" AS ENUM ('VENDA', 'COMPRA', 'AJUSTE_MANUAL', 'DEVOLUCAO', 'CANCELAMENTO', 'INVENTARIO');

-- AlterTable
ALTER TABLE "Orcamento" ADD COLUMN     "aprovadoEm" TIMESTAMP(3),
ADD COLUMN     "aprovadoPorId" INTEGER,
ADD COLUMN     "canceladoEm" TIMESTAMP(3),
ADD COLUMN     "criadoPorId" INTEGER,
ADD COLUMN     "dataValidade" TIMESTAMP(3),
ADD COLUMN     "formaPagamento" "FormaPagamento",
ADD COLUMN     "intervaloPersonalizadoDias" INTEGER,
ADD COLUMN     "motivoStatus" TEXT,
ADD COLUMN     "periodicidadeParcelas" "PeriodicidadeParcela" NOT NULL DEFAULT 'MENSAL',
ADD COLUMN     "primeiroVencimento" TIMESTAMP(3),
ADD COLUMN     "quantidadeParcelas" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "rejeitadoEm" TIMESTAMP(3),
ADD COLUMN     "status" "StatusOrcamento" NOT NULL DEFAULT 'RASCUNHO',
ADD COLUMN     "tabelaPrecoId" INTEGER;

-- CreateTable
CREATE TABLE "TabelaPreco" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "percentualAjuste" DECIMAL(7,3),
    "dataInicio" TIMESTAMP(3),
    "dataFim" TIMESTAMP(3),
    "padrao" BOOLEAN NOT NULL DEFAULT false,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TabelaPreco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemTabelaPreco" (
    "id" SERIAL NOT NULL,
    "tabelaPrecoId" INTEGER NOT NULL,
    "variacaoProdutoId" INTEGER NOT NULL,
    "preco" DECIMAL(12,2) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemTabelaPreco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venda" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "numero" INTEGER NOT NULL,
    "orcamentoId" INTEGER,
    "clienteId" INTEGER NOT NULL,
    "criadoPorId" INTEGER,
    "status" "StatusVenda" NOT NULL DEFAULT 'CONFIRMADA',
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "desconto" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "frete" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "outrasDespesas" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "formaPagamento" "FormaPagamento" NOT NULL,
    "quantidadeParcelas" INTEGER NOT NULL DEFAULT 1,
    "periodicidadeParcelas" "PeriodicidadeParcela" NOT NULL DEFAULT 'MENSAL',
    "primeiroVencimento" TIMESTAMP(3) NOT NULL,
    "dataVenda" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "canceladaEm" TIMESTAMP(3),
    "motivoCancelamento" TEXT,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Venda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemVenda" (
    "id" SERIAL NOT NULL,
    "vendaId" INTEGER NOT NULL,
    "variacaoProdutoId" INTEGER NOT NULL,
    "codigoProduto" TEXT,
    "sku" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "quantidade" DECIMAL(12,3) NOT NULL,
    "valorUnitario" DECIMAL(12,2) NOT NULL,
    "desconto" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "custoUnitario" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemVenda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContaFinanceira" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoContaFinanceira" NOT NULL DEFAULT 'CAIXA',
    "banco" TEXT,
    "agencia" TEXT,
    "numeroConta" TEXT,
    "saldoInicial" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "dataSaldoInicial" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "padrao" BOOLEAN NOT NULL DEFAULT false,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContaFinanceira_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoriaFinanceira" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "natureza" "NaturezaFinanceira" NOT NULL,
    "descricao" TEXT,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "categoriaPaiId" INTEGER,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoriaFinanceira_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CentroCusto" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CentroCusto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContaReceber" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "vendaId" INTEGER,
    "clienteId" INTEGER NOT NULL,
    "categoriaFinanceiraId" INTEGER,
    "centroCustoId" INTEGER,
    "descricao" TEXT NOT NULL,
    "numeroDocumento" TEXT,
    "parcelaNumero" INTEGER NOT NULL DEFAULT 1,
    "totalParcelas" INTEGER NOT NULL DEFAULT 1,
    "valorOriginal" DECIMAL(14,2) NOT NULL,
    "valorDesconto" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "valorJuros" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "valorMulta" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "valorRecebido" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "dataCompetencia" TIMESTAMP(3) NOT NULL,
    "dataEmissao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataVencimento" TIMESTAMP(3) NOT NULL,
    "dataRecebimento" TIMESTAMP(3),
    "formaPagamento" "FormaPagamento",
    "status" "StatusTitulo" NOT NULL DEFAULT 'PENDENTE',
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContaReceber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContaPagar" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "categoriaFinanceiraId" INTEGER,
    "centroCustoId" INTEGER,
    "fornecedorNome" TEXT,
    "fornecedorDocumento" TEXT,
    "descricao" TEXT NOT NULL,
    "numeroDocumento" TEXT,
    "parcelaNumero" INTEGER NOT NULL DEFAULT 1,
    "totalParcelas" INTEGER NOT NULL DEFAULT 1,
    "valorOriginal" DECIMAL(14,2) NOT NULL,
    "valorDesconto" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "valorJuros" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "valorMulta" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "valorPago" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "dataCompetencia" TIMESTAMP(3) NOT NULL,
    "dataEmissao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataVencimento" TIMESTAMP(3) NOT NULL,
    "dataPagamento" TIMESTAMP(3),
    "formaPagamento" "FormaPagamento",
    "status" "StatusTitulo" NOT NULL DEFAULT 'PENDENTE',
    "recorrente" BOOLEAN NOT NULL DEFAULT false,
    "recorrenciaGrupo" TEXT,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContaPagar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimentacaoFinanceira" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "contaFinanceiraId" INTEGER NOT NULL,
    "categoriaFinanceiraId" INTEGER,
    "centroCustoId" INTEGER,
    "contaReceberId" INTEGER,
    "contaPagarId" INTEGER,
    "criadoPorId" INTEGER,
    "tipo" "TipoMovimentacaoFinanceira" NOT NULL,
    "origem" "OrigemMovimentacaoFinanceira" NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(14,2) NOT NULL,
    "dataMovimentacao" TIMESTAMP(3) NOT NULL,
    "dataCompetencia" TIMESTAMP(3),
    "formaPagamento" "FormaPagamento",
    "documento" TEXT,
    "conciliada" BOOLEAN NOT NULL DEFAULT false,
    "conciliadaEm" TIMESTAMP(3),
    "transferenciaGrupo" TEXT,
    "estornada" BOOLEAN NOT NULL DEFAULT false,
    "estornadaEm" TIMESTAMP(3),
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MovimentacaoFinanceira_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimentacaoEstoque" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "variacaoProdutoId" INTEGER NOT NULL,
    "vendaId" INTEGER,
    "itemVendaId" INTEGER,
    "responsavelId" INTEGER,
    "tipo" "TipoMovimentacaoEstoque" NOT NULL,
    "origem" "OrigemMovimentacaoEstoque" NOT NULL,
    "quantidade" DECIMAL(12,3) NOT NULL,
    "saldoAnterior" DECIMAL(12,3) NOT NULL,
    "saldoPosterior" DECIMAL(12,3) NOT NULL,
    "dataMovimentacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimentacaoEstoque_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TabelaPreco_empresaId_ativa_idx" ON "TabelaPreco"("empresaId", "ativa");

-- CreateIndex
CREATE UNIQUE INDEX "TabelaPreco_empresaId_nome_key" ON "TabelaPreco"("empresaId", "nome");

-- CreateIndex
CREATE INDEX "ItemTabelaPreco_variacaoProdutoId_idx" ON "ItemTabelaPreco"("variacaoProdutoId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemTabelaPreco_tabelaPrecoId_variacaoProdutoId_key" ON "ItemTabelaPreco"("tabelaPrecoId", "variacaoProdutoId");

-- CreateIndex
CREATE UNIQUE INDEX "Venda_orcamentoId_key" ON "Venda"("orcamentoId");

-- CreateIndex
CREATE INDEX "Venda_empresaId_status_dataVenda_idx" ON "Venda"("empresaId", "status", "dataVenda");

-- CreateIndex
CREATE INDEX "Venda_clienteId_idx" ON "Venda"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "Venda_empresaId_numero_key" ON "Venda"("empresaId", "numero");

-- CreateIndex
CREATE INDEX "ItemVenda_vendaId_idx" ON "ItemVenda"("vendaId");

-- CreateIndex
CREATE INDEX "ItemVenda_variacaoProdutoId_idx" ON "ItemVenda"("variacaoProdutoId");

-- CreateIndex
CREATE INDEX "ContaFinanceira_empresaId_ativa_idx" ON "ContaFinanceira"("empresaId", "ativa");

-- CreateIndex
CREATE UNIQUE INDEX "ContaFinanceira_empresaId_nome_key" ON "ContaFinanceira"("empresaId", "nome");

-- CreateIndex
CREATE INDEX "CategoriaFinanceira_empresaId_natureza_idx" ON "CategoriaFinanceira"("empresaId", "natureza");

-- CreateIndex
CREATE UNIQUE INDEX "CategoriaFinanceira_empresaId_nome_key" ON "CategoriaFinanceira"("empresaId", "nome");

-- CreateIndex
CREATE INDEX "CentroCusto_empresaId_ativo_idx" ON "CentroCusto"("empresaId", "ativo");

-- CreateIndex
CREATE UNIQUE INDEX "CentroCusto_empresaId_codigo_key" ON "CentroCusto"("empresaId", "codigo");

-- CreateIndex
CREATE INDEX "ContaReceber_empresaId_status_dataVencimento_idx" ON "ContaReceber"("empresaId", "status", "dataVencimento");

-- CreateIndex
CREATE INDEX "ContaReceber_clienteId_idx" ON "ContaReceber"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "ContaReceber_vendaId_parcelaNumero_key" ON "ContaReceber"("vendaId", "parcelaNumero");

-- CreateIndex
CREATE INDEX "ContaPagar_empresaId_status_dataVencimento_idx" ON "ContaPagar"("empresaId", "status", "dataVencimento");

-- CreateIndex
CREATE INDEX "ContaPagar_recorrenciaGrupo_idx" ON "ContaPagar"("recorrenciaGrupo");

-- CreateIndex
CREATE INDEX "MovimentacaoFinanceira_empresaId_dataMovimentacao_idx" ON "MovimentacaoFinanceira"("empresaId", "dataMovimentacao");

-- CreateIndex
CREATE INDEX "MovimentacaoFinanceira_contaFinanceiraId_dataMovimentacao_idx" ON "MovimentacaoFinanceira"("contaFinanceiraId", "dataMovimentacao");

-- CreateIndex
CREATE INDEX "MovimentacaoFinanceira_contaReceberId_idx" ON "MovimentacaoFinanceira"("contaReceberId");

-- CreateIndex
CREATE INDEX "MovimentacaoFinanceira_contaPagarId_idx" ON "MovimentacaoFinanceira"("contaPagarId");

-- CreateIndex
CREATE INDEX "MovimentacaoFinanceira_transferenciaGrupo_idx" ON "MovimentacaoFinanceira"("transferenciaGrupo");

-- CreateIndex
CREATE INDEX "MovimentacaoEstoque_empresaId_dataMovimentacao_idx" ON "MovimentacaoEstoque"("empresaId", "dataMovimentacao");

-- CreateIndex
CREATE INDEX "MovimentacaoEstoque_variacaoProdutoId_dataMovimentacao_idx" ON "MovimentacaoEstoque"("variacaoProdutoId", "dataMovimentacao");

-- CreateIndex
CREATE INDEX "MovimentacaoEstoque_vendaId_idx" ON "MovimentacaoEstoque"("vendaId");

-- CreateIndex
CREATE INDEX "CategoriaProduto_empresaId_idx" ON "CategoriaProduto"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "CategoriaProduto_empresaId_nome_key" ON "CategoriaProduto"("empresaId", "nome");

-- CreateIndex
CREATE INDEX "Cliente_empresaId_nome_idx" ON "Cliente"("empresaId", "nome");

-- CreateIndex
CREATE INDEX "ItemOrcamento_orcamentoId_idx" ON "ItemOrcamento"("orcamentoId");

-- CreateIndex
CREATE INDEX "ItemOrcamento_variacaoProdutoId_idx" ON "ItemOrcamento"("variacaoProdutoId");

-- CreateIndex
CREATE INDEX "Orcamento_empresaId_status_idx" ON "Orcamento"("empresaId", "status");

-- CreateIndex
CREATE INDEX "Orcamento_clienteId_idx" ON "Orcamento"("clienteId");

-- CreateIndex
CREATE INDEX "Produto_empresaId_categoriaId_idx" ON "Produto"("empresaId", "categoriaId");

-- CreateIndex
CREATE INDEX "Usuario_empresaId_idx" ON "Usuario"("empresaId");

-- CreateIndex
CREATE INDEX "VariacaoProduto_produtoId_idx" ON "VariacaoProduto"("produtoId");

-- CreateIndex
CREATE INDEX "VariacaoProduto_codigoBarras_idx" ON "VariacaoProduto"("codigoBarras");

-- AddForeignKey
ALTER TABLE "TabelaPreco" ADD CONSTRAINT "TabelaPreco_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemTabelaPreco" ADD CONSTRAINT "ItemTabelaPreco_tabelaPrecoId_fkey" FOREIGN KEY ("tabelaPrecoId") REFERENCES "TabelaPreco"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemTabelaPreco" ADD CONSTRAINT "ItemTabelaPreco_variacaoProdutoId_fkey" FOREIGN KEY ("variacaoProdutoId") REFERENCES "VariacaoProduto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orcamento" ADD CONSTRAINT "Orcamento_tabelaPrecoId_fkey" FOREIGN KEY ("tabelaPrecoId") REFERENCES "TabelaPreco"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orcamento" ADD CONSTRAINT "Orcamento_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orcamento" ADD CONSTRAINT "Orcamento_aprovadoPorId_fkey" FOREIGN KEY ("aprovadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venda" ADD CONSTRAINT "Venda_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venda" ADD CONSTRAINT "Venda_orcamentoId_fkey" FOREIGN KEY ("orcamentoId") REFERENCES "Orcamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venda" ADD CONSTRAINT "Venda_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venda" ADD CONSTRAINT "Venda_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemVenda" ADD CONSTRAINT "ItemVenda_vendaId_fkey" FOREIGN KEY ("vendaId") REFERENCES "Venda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemVenda" ADD CONSTRAINT "ItemVenda_variacaoProdutoId_fkey" FOREIGN KEY ("variacaoProdutoId") REFERENCES "VariacaoProduto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContaFinanceira" ADD CONSTRAINT "ContaFinanceira_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoriaFinanceira" ADD CONSTRAINT "CategoriaFinanceira_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoriaFinanceira" ADD CONSTRAINT "CategoriaFinanceira_categoriaPaiId_fkey" FOREIGN KEY ("categoriaPaiId") REFERENCES "CategoriaFinanceira"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CentroCusto" ADD CONSTRAINT "CentroCusto_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContaReceber" ADD CONSTRAINT "ContaReceber_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContaReceber" ADD CONSTRAINT "ContaReceber_vendaId_fkey" FOREIGN KEY ("vendaId") REFERENCES "Venda"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContaReceber" ADD CONSTRAINT "ContaReceber_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContaReceber" ADD CONSTRAINT "ContaReceber_categoriaFinanceiraId_fkey" FOREIGN KEY ("categoriaFinanceiraId") REFERENCES "CategoriaFinanceira"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContaReceber" ADD CONSTRAINT "ContaReceber_centroCustoId_fkey" FOREIGN KEY ("centroCustoId") REFERENCES "CentroCusto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContaPagar" ADD CONSTRAINT "ContaPagar_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContaPagar" ADD CONSTRAINT "ContaPagar_categoriaFinanceiraId_fkey" FOREIGN KEY ("categoriaFinanceiraId") REFERENCES "CategoriaFinanceira"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContaPagar" ADD CONSTRAINT "ContaPagar_centroCustoId_fkey" FOREIGN KEY ("centroCustoId") REFERENCES "CentroCusto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoFinanceira" ADD CONSTRAINT "MovimentacaoFinanceira_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoFinanceira" ADD CONSTRAINT "MovimentacaoFinanceira_contaFinanceiraId_fkey" FOREIGN KEY ("contaFinanceiraId") REFERENCES "ContaFinanceira"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoFinanceira" ADD CONSTRAINT "MovimentacaoFinanceira_categoriaFinanceiraId_fkey" FOREIGN KEY ("categoriaFinanceiraId") REFERENCES "CategoriaFinanceira"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoFinanceira" ADD CONSTRAINT "MovimentacaoFinanceira_centroCustoId_fkey" FOREIGN KEY ("centroCustoId") REFERENCES "CentroCusto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoFinanceira" ADD CONSTRAINT "MovimentacaoFinanceira_contaReceberId_fkey" FOREIGN KEY ("contaReceberId") REFERENCES "ContaReceber"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoFinanceira" ADD CONSTRAINT "MovimentacaoFinanceira_contaPagarId_fkey" FOREIGN KEY ("contaPagarId") REFERENCES "ContaPagar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoFinanceira" ADD CONSTRAINT "MovimentacaoFinanceira_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoEstoque" ADD CONSTRAINT "MovimentacaoEstoque_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoEstoque" ADD CONSTRAINT "MovimentacaoEstoque_variacaoProdutoId_fkey" FOREIGN KEY ("variacaoProdutoId") REFERENCES "VariacaoProduto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoEstoque" ADD CONSTRAINT "MovimentacaoEstoque_vendaId_fkey" FOREIGN KEY ("vendaId") REFERENCES "Venda"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoEstoque" ADD CONSTRAINT "MovimentacaoEstoque_itemVendaId_fkey" FOREIGN KEY ("itemVendaId") REFERENCES "ItemVenda"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoEstoque" ADD CONSTRAINT "MovimentacaoEstoque_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
