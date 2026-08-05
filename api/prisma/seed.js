const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const EMPRESA_PADRAO = {
    razaoSocial: "Empresa Teste",
    nomeFantasia: "ERP Elizeu",
    cnpj: "00.000.000/0001-00",
    email: "contato@empresa.com",
    telefone: "(19)99999-9999",
    ativa: true
};

const USUARIO_ADMIN = {
    nome: "Administrador",
    email: "admin@admin.com",
    senha: "123456",
    perfil: "ADMIN",
    ativo: true
};

const CATEGORIAS_FINANCEIRAS = [
    {
        nome: "Vendas de Produtos e Serviços",
        natureza: "RECEITA",
        descricao: "Receitas originadas das vendas e dos orçamentos aprovados."
    },
    {
        nome: "Outras Receitas",
        natureza: "RECEITA",
        descricao: "Receitas não vinculadas diretamente a uma venda."
    },
    {
        nome: "Compras e Fornecedores",
        natureza: "DESPESA",
        descricao: "Pagamentos de mercadorias, insumos e fornecedores."
    },
    {
        nome: "Despesas Operacionais",
        natureza: "DESPESA",
        descricao: "Despesas necessárias para a operação da empresa."
    },
    {
        nome: "Impostos e Taxas",
        natureza: "DESPESA",
        descricao: "Impostos, tarifas bancárias, taxas e encargos."
    },
    {
        nome: "Folha e Prestadores",
        natureza: "DESPESA",
        descricao: "Salários, comissões e pagamentos de prestadores."
    },
    {
        nome: "Ajustes Financeiros",
        natureza: "AMBAS",
        descricao: "Entradas e saídas utilizadas para ajustes controlados."
    }
];

async function criarOuAtualizarEmpresa() {
    return prisma.empresa.upsert({
        where: {
            cnpj: EMPRESA_PADRAO.cnpj
        },
        update: {
            nomeFantasia: EMPRESA_PADRAO.nomeFantasia,
            ativa: true
        },
        create: EMPRESA_PADRAO
    });
}

async function criarOuAtualizarAdministrador(empresaId) {
    const senhaCriptografada = await bcrypt.hash(USUARIO_ADMIN.senha, 10);

    return prisma.usuario.upsert({
        where: {
            email: USUARIO_ADMIN.email
        },
        update: {
            empresaId,
            nome: USUARIO_ADMIN.nome,
            perfil: USUARIO_ADMIN.perfil,
            ativo: true
        },
        create: {
            empresaId,
            nome: USUARIO_ADMIN.nome,
            email: USUARIO_ADMIN.email,
            senha: senhaCriptografada,
            perfil: USUARIO_ADMIN.perfil,
            ativo: USUARIO_ADMIN.ativo
        }
    });
}

async function criarContaFinanceiraPadrao(empresaId) {
    return prisma.contaFinanceira.upsert({
        where: {
            empresaId_nome: {
                empresaId,
                nome: "Caixa Principal"
            }
        },
        update: {
            tipo: "CAIXA",
            padrao: true,
            ativa: true
        },
        create: {
            empresaId,
            nome: "Caixa Principal",
            tipo: "CAIXA",
            saldoInicial: 0,
            dataSaldoInicial: new Date(),
            padrao: true,
            ativa: true
        }
    });
}

async function criarCategoriasFinanceiras(empresaId) {
    const categorias = [];

    for (const categoria of CATEGORIAS_FINANCEIRAS) {
        const registro = await prisma.categoriaFinanceira.upsert({
            where: {
                empresaId_nome: {
                    empresaId,
                    nome: categoria.nome
                }
            },
            update: {
                natureza: categoria.natureza,
                descricao: categoria.descricao,
                ativa: true
            },
            create: {
                empresaId,
                ...categoria,
                ativa: true
            }
        });

        categorias.push(registro);
    }

    return categorias;
}

async function criarCentroCustoPadrao(empresaId) {
    return prisma.centroCusto.upsert({
        where: {
            empresaId_codigo: {
                empresaId,
                codigo: "GERAL"
            }
        },
        update: {
            nome: "Geral",
            descricao: "Centro de custo padrão da empresa.",
            ativo: true
        },
        create: {
            empresaId,
            codigo: "GERAL",
            nome: "Geral",
            descricao: "Centro de custo padrão da empresa.",
            ativo: true
        }
    });
}

async function criarTabelaPrecoPadrao(empresaId) {
    return prisma.tabelaPreco.upsert({
        where: {
            empresaId_nome: {
                empresaId,
                nome: "Tabela Padrão"
            }
        },
        update: {
            padrao: true,
            ativa: true
        },
        create: {
            empresaId,
            nome: "Tabela Padrão",
            descricao: "Tabela de preços padrão para produtos e orçamentos.",
            percentualAjuste: 0,
            padrao: true,
            ativa: true
        }
    });
}

async function main() {
    console.log("Iniciando seed do ERP Elizeu...");

    const empresa = await criarOuAtualizarEmpresa();
    console.log(`Empresa preparada: ${empresa.nomeFantasia || empresa.razaoSocial}`);

    const administrador = await criarOuAtualizarAdministrador(empresa.id);
    console.log(`Administrador preparado: ${administrador.email}`);

    const contaFinanceira = await criarContaFinanceiraPadrao(empresa.id);
    console.log(`Conta financeira preparada: ${contaFinanceira.nome}`);

    const categorias = await criarCategoriasFinanceiras(empresa.id);
    console.log(`${categorias.length} categorias financeiras preparadas.`);

    const centroCusto = await criarCentroCustoPadrao(empresa.id);
    console.log(`Centro de custo preparado: ${centroCusto.nome}`);

    const tabelaPreco = await criarTabelaPrecoPadrao(empresa.id);
    console.log(`Tabela de preços preparada: ${tabelaPreco.nome}`);

    console.log("Seed executada com sucesso.");
}

main()
    .catch((error) => {
        console.error("Erro ao executar a seed:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
