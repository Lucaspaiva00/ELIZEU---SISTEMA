const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const controller = require("../controllers/venda.controller");

router.get("/", auth, controller.listar);
router.put("/:id/faturar", auth, controller.faturar);
router.put("/:id/cancelar", auth, controller.cancelar);
router.get("/:id", auth, controller.buscarPorId);

module.exports = router;
