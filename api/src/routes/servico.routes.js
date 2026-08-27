const express = require("express");
const auth = require("../middlewares/auth.middleware");
const { autorizar, autorizarQualquer } = require("../middlewares/permissions.middleware");
const controller = require("../controllers/servico.controller");

const router = express.Router();
const consultarServicos = autorizarQualquer(
    "servicos.visualizar",
    "orcamentos.visualizar",
    "fiscal.visualizar"
);

router.get("/categorias", auth, consultarServicos, controller.listarCategorias);
router.post("/categorias", auth, autorizar("servicos.gerenciar"), controller.criarCategoria);
router.post("/", auth, autorizar("servicos.gerenciar"), controller.criar);
router.get("/", auth, consultarServicos, controller.listar);
router.get("/:id", auth, consultarServicos, controller.buscarPorId);
router.put("/:id", auth, autorizar("servicos.gerenciar"), controller.atualizar);
router.delete("/:id", auth, autorizar("servicos.gerenciar"), controller.excluir);

module.exports = router;
