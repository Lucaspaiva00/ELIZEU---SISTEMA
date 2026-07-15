const express = require("express");

const router = express.Router();

router.use("/auth", require("./auth.routes"));
router.use("/usuarios", require("./usuario.routes"));
router.use("/empresas", require("./empresa.routes"));
router.use("/categorias", require("./categoria.routes"));
router.use("/produtos", require("./produto.routes"));
router.use("/clientes", require("./cliente.routes"));
router.use("/orcamentos", require("./orcamento.routes"));
router.use("/dashboard", require("./dashboard.routes"));

module.exports = router;