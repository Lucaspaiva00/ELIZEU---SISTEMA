const vendaRepository = require("../repositories/venda.repository");

class VendaService {
    listar(empresaId) {
        return vendaRepository.listar(empresaId);
    }

    async buscarPorId(id, empresaId) {
        const venda = await vendaRepository.buscarPorId(id, empresaId);
        if (!venda) throw new Error("Venda não encontrada.");
        return venda;
    }

    faturar(id, dados) {
        return vendaRepository.faturar(id, dados);
    }

    cancelar(id, empresaId, motivo) {
        return vendaRepository.cancelar(id, empresaId, motivo);
    }
}

module.exports = new VendaService();
