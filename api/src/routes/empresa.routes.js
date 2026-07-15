const express = require("express");

const router = express.Router();

const auth = require("../middlewares/auth.middleware");

const empresaController = require("../controllers/empresa.controller");

router.post("/", auth, empresaController.criar);

router.get("/", auth, empresaController.listar);

router.get("/:id", auth, empresaController.buscarPorId);

router.put("/:id", auth, empresaController.atualizar);

router.delete("/:id", auth, empresaController.excluir);

module.exports = router;