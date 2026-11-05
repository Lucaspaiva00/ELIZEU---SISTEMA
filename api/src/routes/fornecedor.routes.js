const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const { autorizar } = require("../middlewares/permissions.middleware");
const controller = require("../controllers/fornecedor.controller");

router.get("/", auth, autorizar("clientes.visualizar"), controller.listar);
router.post("/", auth, autorizar("clientes.criar"), controller.criar);
router.get("/:id", auth, autorizar("clientes.visualizar"), controller.buscarPorId);
router.put("/:id", auth, autorizar("clientes.editar"), controller.atualizar);
router.delete("/:id", auth, autorizar("clientes.excluir"), controller.excluir);

module.exports = router;
