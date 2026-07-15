const express = require("express");

const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const usuarioController = require("../controllers/usuario.controller");

router.post("/", auth, usuarioController.criar);

router.get("/", auth, usuarioController.listar);

router.get("/:id", auth, usuarioController.buscarPorId);

router.put("/:id", auth, usuarioController.atualizar);

router.delete("/:id", auth, usuarioController.excluir);

module.exports = router;