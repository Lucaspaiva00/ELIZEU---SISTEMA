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

    catalogoEdicao(empresaId) {
        return vendaRepository.catalogoEdicao(empresaId);
    }

    editar(id, dados) {
        return vendaRepository.editar(id, dados);
    }

    faturar(id, dados) {
        return vendaRepository.faturar(id, dados);
    }

    cancelar(id, empresaId, motivo) {
        return vendaRepository.cancelar(id, empresaId, motivo);
    }
}

module.exports = new VendaService();
