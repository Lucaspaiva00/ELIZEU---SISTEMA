const dashboardRepository = require("../repositories/dashboard.repository");

class DashboardService {

    inicioDoDia(data) {
        const resultado = new Date(data);
        resultado.setHours(0, 0, 0, 0);
        return resultado;
    }

    fimDoDia(data) {
        const resultado = new Date(data);
        resultado.setHours(23, 59, 59, 999);
        return resultado;
    }

    converterData(valor, fimDoDia = false) {
        if (!valor) return null;

        const data = /^\d{4}-\d{2}-\d{2}$/.test(valor)
            ? new Date(`${valor}T12:00:00`)
            : new Date(valor);

        if (Number.isNaN(data.getTime())) {
            const erro = new Error(`Data invalida: ${valor}.`);
            erro.status = 400;
            throw erro;
        }

        return fimDoDia ? this.fimDoDia(data) : this.inicioDoDia(data);
    }

    calcularPeriodo(filtros = {}) {
        const agora = new Date();
        const periodo = String(filtros.periodo || "MENSAL").toUpperCase();
        const periodosValidos = [
            "DIARIO", "SEMANAL", "MENSAL", "TRIMESTRAL", "SEMESTRAL", "ANUAL"
        ];

        if (!periodosValidos.includes(periodo)) {
            const erro = new Error("Periodo invalido.");
            erro.status = 400;
            throw erro;
        }

        let dataInicio;
        let dataFim;

        if (periodo === "DIARIO") {
            dataInicio = this.inicioDoDia(agora);
            dataFim = this.fimDoDia(agora);
        } else if (periodo === "SEMANAL") {
            dataInicio = this.inicioDoDia(agora);
            dataInicio.setDate(dataInicio.getDate() - 6);
            dataFim = this.fimDoDia(agora);
        } else if (periodo === "MENSAL") {
            dataInicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
            dataFim = this.fimDoDia(new Date(agora.getFullYear(), agora.getMonth() + 1, 0));
        } else if (periodo === "TRIMESTRAL") {
            dataInicio = new Date(agora.getFullYear(), agora.getMonth() - 2, 1);
            dataFim = this.fimDoDia(new Date(agora.getFullYear(), agora.getMonth() + 1, 0));
        } else if (periodo === "SEMESTRAL") {
            dataInicio = new Date(agora.getFullYear(), agora.getMonth() - 5, 1);
            dataFim = this.fimDoDia(new Date(agora.getFullYear(), agora.getMonth() + 1, 0));
        } else {
            dataInicio = new Date(agora.getFullYear(), 0, 1);
            dataFim = this.fimDoDia(new Date(agora.getFullYear(), 11, 31));
        }

        dataInicio = this.converterData(filtros.dataInicio) || dataInicio;
        dataFim = this.converterData(filtros.dataFim, true) || dataFim;

        if (dataInicio > dataFim) {
            const erro = new Error("A data inicial nao pode ser maior que a data final.");
            erro.status = 400;
            throw erro;
        }

        return { periodo, dataInicio, dataFim };
    }

    async buscarFinanceiro(empresaId, filtros) {
        const intervalo = this.calcularPeriodo(filtros);
        return dashboardRepository.buscarFinanceiro(empresaId, intervalo);
    }

    async buscarResumo(empresaId) {

        return await dashboardRepository.buscarResumo(
            empresaId
        );

    }

}

module.exports = new DashboardService();
