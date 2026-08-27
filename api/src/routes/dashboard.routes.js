const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const { autorizar } = require("../middlewares/permissions.middleware");
const dashboardController = require("../controllers/dashboard.controller");

router.get("/financeiro", auth, autorizar("dashboard.financeiro"), dashboardController.buscarFinanceiro);
router.get("/", auth, autorizar("dashboard.visualizar"), dashboardController.buscarResumo);

module.exports = router;
