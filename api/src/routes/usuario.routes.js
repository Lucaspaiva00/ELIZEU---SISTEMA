const express = require("express");
const auth = require("../middlewares/auth.middleware");
const { autorizar } = require("../middlewares/permissions.middleware");
const controller = require("../controllers/usuario.controller");

const router = express.Router();
const gerenciarUsuarios = autorizar("usuarios.gerenciar");

router.use(auth, gerenciarUsuarios);
router.get("/permissoes", controller.catalogoPermissoes);
router.post("/", controller.criar);
router.get("/", controller.listar);
router.get("/:id", controller.buscarPorId);
router.put("/:id", controller.atualizar);
router.patch("/:id/status", controller.alterarStatus);
router.patch("/:id/senha", controller.redefinirSenha);

module.exports = router;
