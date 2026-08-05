const dashboardService = require("../services/dashboard.service");

class DashboardController {

    async buscarFinanceiro(req, res) {

        try {

            const dashboard = await dashboardService.buscarFinanceiro(
                req.usuario.empresaId,
                req.query
            );

            return res.json({
                sucesso: true,
                dashboard
            });

        } catch (erro) {

            console.error(erro);

            const status = erro.status || 500;

            return res.status(status).json({
                sucesso: false,
                mensagem: status === 500
                    ? "Erro ao carregar dashboard financeiro."
                    : erro.message
            });

        }

    }

    async buscarResumo(req, res) {

        try {

            const resumo =
                await dashboardService.buscarResumo(
                    req.usuario.empresaId
                );

            return res.json({

                sucesso: true,

                resumo

            });

        } catch (erro) {

            console.error(erro);

            return res.status(500).json({

                sucesso: false,

                mensagem:
                    "Erro ao carregar dashboard."

            });

        }

    }

}

module.exports = new DashboardController();
