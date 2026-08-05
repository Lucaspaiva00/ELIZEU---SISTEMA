const express = require("express");

const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const contaReceberController = require("../controllers/contaReceber.controller");

router.post("/", auth, contaReceberController.criar);
router.get("/", auth, contaReceberController.listar);
router.get("/resumo", auth, contaReceberController.resumo);

router.post("/:id/receber", auth, contaReceberController.receber);
router.post("/:id/cancelar", auth, contaReceberController.cancelar);

router.get("/:id", auth, contaReceberController.buscarPorId);
router.put("/:id", auth, contaReceberController.atualizar);

module.exports = router;
