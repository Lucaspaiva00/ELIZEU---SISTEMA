const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const controller = require("../controllers/venda.controller");
const nfeController = require("../controllers/nfe.controller");

router.get("/", auth, controller.listar);
router.put("/:id/faturar", auth, controller.faturar);
router.put("/:id/cancelar", auth, controller.cancelar);
router.get("/:id/nfe", auth, nfeController.buscar);
router.get("/:id/nfe/validar", auth, nfeController.validar);
router.post("/:id/nfe/preparar", auth, nfeController.preparar);
router.get("/:id", auth, controller.buscarPorId);

module.exports = router;
