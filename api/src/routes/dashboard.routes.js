const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const { autorizar } = require("../middlewares/permissions.middleware");
const despesasFixas = require("../services/despesasFixas.service");
const dashboardController = require("../controllers/dashboard.controller");

router.get("/financeiro", auth, autorizar("dashboard.financeiro"), dashboardController.buscarFinanceiro);
router.get("/despesas-fixas", auth, autorizar("dashboard.financeiro"), async (req, res, next) => {
    try {
        const dados = await despesasFixas.consultar(req.usuario.empresaId, despesasFixas.validarMes(req.query.mes));
        res.json({ sucesso: true, dados });
    } catch (erro) {
        if (erro.status === 400) return res.status(400).json({ sucesso: false, mensagem: erro.message });
        next(erro);
    }
});
router.put("/despesas-fixas", auth, autorizar("dashboard.financeiro"), autorizar("financeiro.configurar"), async (req, res, next) => {
    try {
        const dados = await despesasFixas.salvar(req.usuario.empresaId, despesasFixas.validarMes(req.body?.mes), req.body?.itens);
        res.json({ sucesso: true, dados });
    } catch (erro) {
        if (erro.status === 400) return res.status(400).json({ sucesso: false, mensagem: erro.message });
        next(erro);
    }
});
router.get("/alertas", auth, autorizar("dashboard.visualizar"), dashboardController.buscarAlertas);
router.get("/", auth, autorizar("dashboard.visualizar"), dashboardController.buscarResumo);

module.exports = router;
