const express = require("express");
const auth = require("../middlewares/auth.middleware");
const { autorizarPerfis } = require("../middlewares/perfil.middleware");
const controller = require("../controllers/usuario.controller");

const router = express.Router();
const somenteAdmin = autorizarPerfis("ADMIN");

router.use(auth, somenteAdmin);
router.post("/", controller.criar);
router.get("/", controller.listar);
router.get("/:id", controller.buscarPorId);
router.put("/:id", controller.atualizar);
router.patch("/:id/status", controller.alterarStatus);
router.patch("/:id/senha", controller.redefinirSenha);

module.exports = router;
