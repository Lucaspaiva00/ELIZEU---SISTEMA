const express = require("express");
const auth = require("../middlewares/auth.middleware");
const controller = require("../controllers/servico.controller");

const router = express.Router();

router.get("/categorias", auth, controller.listarCategorias);
router.post("/categorias", auth, controller.criarCategoria);
router.post("/", auth, controller.criar);
router.get("/", auth, controller.listar);
router.get("/:id", auth, controller.buscarPorId);
router.put("/:id", auth, controller.atualizar);
router.delete("/:id", auth, controller.excluir);

module.exports = router;
