const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const { autorizar, autorizarQualquer } = require("../middlewares/permissions.middleware");
const clienteController = require("../controllers/cliente.controller");

const consultarClientes = autorizarQualquer(
    "clientes.visualizar",
    "orcamentos.visualizar",
    "contas_receber.visualizar"
);

router.post("/", auth, autorizar("clientes.criar"), clienteController.criar);
router.get("/", auth, consultarClientes, clienteController.listar);
router.get("/:id", auth, consultarClientes, clienteController.buscarPorId);
router.put("/:id", auth, autorizar("clientes.editar"), clienteController.atualizar);
router.delete("/:id", auth, autorizar("clientes.excluir"), clienteController.excluir);

module.exports = router;
