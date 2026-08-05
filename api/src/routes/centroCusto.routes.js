const express = require("express");
const auth = require("../middlewares/auth.middleware");
const controller = require("../controllers/centroCusto.controller");
const router = express.Router();
router.get("/", auth, controller.listar); router.post("/", auth, controller.criar); router.get("/:id", auth, controller.buscarPorId); router.put("/:id", auth, controller.atualizar); router.delete("/:id", auth, controller.desativar);
module.exports = router;
