const prisma = require("../config/prisma");

class ClienteRepository {

    async criar(dados) {
        return await prisma.cliente.create({
            data: dados
        });
    }

    async listar(empresaId) {
        return await prisma.cliente.findMany({
            where: {
                empresaId
            },
            orderBy: {
                nome: "asc"
            }
        });
    }

    async buscarPorId(id) {
        return await prisma.cliente.findUnique({
            where: {
                id
            }
        });
    }

    async buscarPorCpfCnpj(cpfCnpj, empresaId) {
        return await prisma.cliente.findFirst({
            where: {
                cpfCnpj,
                empresaId
            }
        });
    }

    async atualizar(id, dados) {
        return await prisma.cliente.update({
            where: {
                id
            },
            data: dados
        });
    }

    async obterVinculosHistoricos(id) {
        const [orcamentos, vendas, contasReceber] = await Promise.all([
            prisma.orcamento.count({ where: { clienteId: id } }),
            prisma.venda.count({ where: { clienteId: id } }),
            prisma.contaReceber.count({ where: { clienteId: id } })
        ]);

        return {
            orcamentos,
            vendas,
            contasReceber,
            total: orcamentos + vendas + contasReceber
        };
    }

    async excluir(id) {
        const vinculos = await this.obterVinculosHistoricos(id);

        if (vinculos.total > 0) {
            // Não apagamos fisicamente um cliente que participa do histórico
            // comercial/financeiro. Isso preserva orçamentos, vendas e contas.
            const cliente = await prisma.cliente.update({
                where: { id },
                data: { ativo: false }
            });

            return {
                excluido: false,
                inativado: true,
                cliente,
                vinculos
            };
        }

        const cliente = await prisma.cliente.delete({
            where: { id }
        });

        return {
            excluido: true,
            inativado: false,
            cliente,
            vinculos
        };
    }

}

module.exports = new ClienteRepository();
