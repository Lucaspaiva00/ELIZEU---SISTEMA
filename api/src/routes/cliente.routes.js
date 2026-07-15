const express = require("express");

const router = express.Router();

const auth = require("../middlewares/auth.middleware");

const clienteController = require("../controllers/cliente.controller");

router.post("/", auth, clienteController.criar);

router.get("/", auth, clienteController.listar);

router.get("/:id", auth, clienteController.buscarPorId);

router.put("/:id", auth, clienteController.atualizar);

router.delete("/:id", auth, clienteController.excluir);

module.exports = router;