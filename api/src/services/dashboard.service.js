const dashboardRepository = require("../repositories/dashboard.repository");

class DashboardService {

    async buscarResumo(empresaId) {

        return await dashboardRepository.buscarResumo(
            empresaId
        );

    }

}

module.exports = new DashboardService();