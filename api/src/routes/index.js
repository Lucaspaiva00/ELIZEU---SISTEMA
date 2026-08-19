const express = require("express");

const router = express.Router();

router.use("/auth", require("./auth.routes"));
router.use("/usuarios", require("./usuario.routes"));
router.use("/empresas", require("./empresa.routes"));
router.use("/categorias", require("./categoria.routes"));
router.use("/produtos", require("./produto.routes"));
router.use("/servicos", require("./servico.routes"));
router.use("/clientes", require("./cliente.routes"));
router.use("/orcamentos", require("./orcamento.routes"));
router.use("/vendas", require("./venda.routes"));
router.use("/contas-receber", require("./contaReceber.routes"));
router.use("/contas-pagar", require("./contaPagar.routes"));
router.use("/contas-financeiras", require("./contaFinanceira.routes"));
router.use("/movimentacoes-financeiras", require("./movimentacaoFinanceira.routes"));
router.use("/categorias-financeiras", require("./categoriaFinanceira.routes"));
router.use("/centros-custo", require("./centroCusto.routes"));
router.use("/dashboard", require("./dashboard.routes"));
router.use("/integracoes/sacmais", require("./sacmais.routes"));

module.exports = router;
