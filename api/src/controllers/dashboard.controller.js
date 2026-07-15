const dashboardService = require("../services/dashboard.service");

class DashboardController {

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