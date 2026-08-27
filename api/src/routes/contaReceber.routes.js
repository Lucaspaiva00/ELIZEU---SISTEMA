const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const { autorizar } = require("../middlewares/permissions.middleware");
const contaReceberController = require("../controllers/contaReceber.controller");

router.post("/", auth, autorizar("contas_receber.criar"), contaReceberController.criar);
router.get("/", auth, autorizar("contas_receber.visualizar"), contaReceberController.listar);
router.get("/resumo", auth, autorizar("contas_receber.visualizar"), contaReceberController.resumo);
router.post("/:id/receber", auth, autorizar("contas_receber.receber"), contaReceberController.receber);
router.post("/:id/cancelar", auth, autorizar("contas_receber.cancelar"), contaReceberController.cancelar);
router.get("/:id", auth, autorizar("contas_receber.visualizar"), contaReceberController.buscarPorId);
router.put("/:id", auth, autorizar("contas_receber.editar"), contaReceberController.atualizar);

module.exports = router;
