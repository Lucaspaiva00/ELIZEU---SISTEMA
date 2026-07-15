const express = require("express");

const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const categoriaController = require("../controllers/categoria.controller");

router.post("/", auth, categoriaController.criar);

router.get("/", auth, categoriaController.listar);

router.get("/:id", auth, categoriaController.buscarPorId);

router.put("/:id", auth, categoriaController.atualizar);

router.delete("/:id", auth, categoriaController.excluir);

module.exports = router;