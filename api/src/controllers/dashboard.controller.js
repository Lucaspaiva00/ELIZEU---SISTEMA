const dashboardService = require("../services/dashboard.service");

class DashboardController {

    async buscarResumo(req, res) {

        try {

            const resumo = await dashboardService.buscarResumo(
                req.usuario.empresaId
            );

            return res.json({
                sucesso: true,
                resumo
            });

        } catch (error) {

            return res.status(500).json({
                sucesso: false,
                mensagem: error.message
            });

        }

    }

}

module.exports = new DashboardController();