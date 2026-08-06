const prisma = require("../config/prisma");

const includeCompleto = {
    categoria: true,
    variacoes: {
        orderBy: { descricao: "asc" }
    }
};

class ServicoRepository {
    listarCategorias(empresaId) {
        return prisma.categoriaServico.findMany({
            where: { empresaId },
            orderBy: { nome: "asc" }
        });
    }

    criarCategoria(dados) {
        return prisma.categoriaServico.create({ data: dados });
    }

    async criar(dados) {
        return prisma.$transaction(async (tx) => {
            const servico = await tx.servico.create({
                data: {
                    empresaId: dados.empresaId,
                    categoriaId: dados.categoriaId,
                    codigo: dados.codigo,
                    nome: dados.nome,
                    descricao: dados.descricao || null,
                    unidadeMedida: dados.unidadeMedida || "UN",
                    ativo: dados.ativo ?? true
                }
            });

            if (dados.variacoes?.length) {
                await tx.variacaoServico.createMany({
                    data: dados.variacoes.map((variacao) => ({
                        servicoId: servico.id,
                        codigo: variacao.codigo,
                        descricao: variacao.descricao || null,
                        precoCusto: variacao.precoCusto ?? 0,
                        precoVenda: variacao.precoVenda,
                        ativo: variacao.ativo ?? true
                    }))
                });
            }

            return tx.servico.findUnique({ where: { id: servico.id }, include: includeCompleto });
        });
    }

    listar(empresaId) {
        return prisma.servico.findMany({
            where: { empresaId },
            include: includeCompleto,
            orderBy: { nome: "asc" }
        });
    }

    buscarPorId(id, empresaId) {
        return prisma.servico.findFirst({ where: { id, empresaId }, include: includeCompleto });
    }

    buscarPorCodigo(codigo, empresaId) {
        return prisma.servico.findFirst({ where: { codigo, empresaId } });
    }

    async atualizar(id, dados) {
        return prisma.$transaction(async (tx) => {
            await tx.servico.update({
                where: { id },
                data: {
                    categoriaId: dados.categoriaId,
                    codigo: dados.codigo,
                    nome: dados.nome,
                    descricao: dados.descricao || null,
                    unidadeMedida: dados.unidadeMedida || "UN",
                    ativo: dados.ativo ?? true
                }
            });

            const idsRecebidos = dados.variacoes
                .map((variacao) => Number(variacao.id))
                .filter(Number.isInteger);

            await tx.variacaoServico.deleteMany({
                where: {
                    servicoId: id,
                    ...(idsRecebidos.length ? { id: { notIn: idsRecebidos } } : {})
                }
            });

            for (const variacao of dados.variacoes) {
                if (variacao.id) {
                    await tx.variacaoServico.update({
                        where: { id: Number(variacao.id) },
                        data: {
                            codigo: variacao.codigo,
                            descricao: variacao.descricao || null,
                            precoCusto: variacao.precoCusto ?? 0,
                            precoVenda: variacao.precoVenda,
                            ativo: variacao.ativo ?? true
                        }
                    });
                } else {
                    await tx.variacaoServico.create({
                        data: {
                            servicoId: id,
                            codigo: variacao.codigo,
                            descricao: variacao.descricao || null,
                            precoCusto: variacao.precoCusto ?? 0,
                            precoVenda: variacao.precoVenda,
                            ativo: variacao.ativo ?? true
                        }
                    });
                }
            }

            return tx.servico.findUnique({ where: { id }, include: includeCompleto });
        });
    }

    excluir(id) {
        return prisma.servico.delete({ where: { id } });
    }
}

module.exports = new ServicoRepository();
