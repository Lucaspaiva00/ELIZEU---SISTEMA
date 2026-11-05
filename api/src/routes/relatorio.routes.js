const express=require("express");
const router=express.Router();
const auth=require("../middlewares/auth.middleware");
const { autorizarQualquer }=require("../middlewares/permissions.middleware");
const controller=require("../controllers/relatorio.controller");

const visualizar=autorizarQualquer("dashboard.financeiro","financeiro.configurar","produtos.visualizar");

router.get("/resumo",auth,visualizar,controller.resumo);
router.get("/estoque-inteligente",auth,visualizar,controller.estoqueInteligente);

module.exports=router;
