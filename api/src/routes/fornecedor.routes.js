const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const { autorizar } = require("../middlewares/permissions.middleware");
const controller = require("../controllers/fornecedor.controller");

router.get("/", auth, autorizar("fornecedores.visualizar"), controller.listar);
router.post("/", auth, autorizar("fornecedores.criar"), controller.criar);
router.get("/:id", auth, autorizar("fornecedores.visualizar"), controller.buscarPorId);
router.put("/:id", auth, autorizar("fornecedores.editar"), controller.atualizar);
router.delete("/:id", auth, autorizar("fornecedores.excluir"), controller.excluir);

module.exports = router;
