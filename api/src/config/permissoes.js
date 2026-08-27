const GRUPOS_PERMISSOES = [
    {
        id: "geral",
        nome: "Visão geral",
        descricao: "Acesso aos indicadores do sistema.",
        permissoes: [
            { chave: "dashboard.visualizar", nome: "Visualizar dashboard" },
            { chave: "dashboard.financeiro", nome: "Visualizar indicadores financeiros" }
        ]
    },
    {
        id: "administracao",
        nome: "Administração",
        descricao: "Configurações sensíveis, empresa e usuários.",
        permissoes: [
            { chave: "empresa.visualizar", nome: "Visualizar dados da empresa" },
            { chave: "empresa.editar", nome: "Editar dados da empresa" },
            { chave: "empresa.fiscal", nome: "Alterar configuração fiscal" },
            { chave: "empresa.certificado", nome: "Gerenciar certificado digital" },
            { chave: "empresa.gerenciar", nome: "Gerenciar empresas" },
            { chave: "usuarios.gerenciar", nome: "Gerenciar usuários e acessos" }
        ]
    },
    {
        id: "clientes",
        nome: "Clientes",
        descricao: "Cadastro e integração da base de clientes.",
        permissoes: [
            { chave: "clientes.visualizar", nome: "Visualizar clientes" },
            { chave: "clientes.criar", nome: "Cadastrar clientes" },
            { chave: "clientes.editar", nome: "Editar clientes" },
            { chave: "clientes.excluir", nome: "Excluir/inativar clientes" },
            { chave: "clientes.importar", nome: "Importar clientes do SacMais" }
        ]
    },
    {
        id: "catalogo",
        nome: "Produtos e serviços",
        descricao: "Cadastro comercial, composição, preços e estoque.",
        permissoes: [
            { chave: "categorias.visualizar", nome: "Visualizar categorias" },
            { chave: "categorias.gerenciar", nome: "Gerenciar categorias" },
            { chave: "produtos.visualizar", nome: "Visualizar produtos" },
            { chave: "produtos.criar", nome: "Cadastrar produtos" },
            { chave: "produtos.editar", nome: "Editar produtos" },
            { chave: "produtos.duplicar", nome: "Duplicar produtos" },
            { chave: "produtos.excluir", nome: "Excluir/inativar produtos" },
            { chave: "servicos.visualizar", nome: "Visualizar serviços" },
            { chave: "servicos.gerenciar", nome: "Gerenciar serviços e categorias" }
        ]
    },
    {
        id: "comercial",
        nome: "Comercial",
        descricao: "Orçamentos, aprovação, vendas e faturamento.",
        permissoes: [
            { chave: "orcamentos.visualizar", nome: "Visualizar orçamentos" },
            { chave: "orcamentos.criar", nome: "Criar orçamentos" },
            { chave: "orcamentos.editar", nome: "Editar orçamentos" },
            { chave: "orcamentos.enviar", nome: "Marcar/enviar orçamento" },
            { chave: "orcamentos.aprovar", nome: "Aprovar orçamento e gerar venda" },
            { chave: "orcamentos.excluir", nome: "Excluir orçamento" },
            { chave: "vendas.visualizar", nome: "Visualizar vendas" },
            { chave: "vendas.faturar", nome: "Faturar vendas" },
            { chave: "vendas.cancelar", nome: "Cancelar vendas" }
        ]
    },
    {
        id: "fiscal",
        nome: "Fiscal",
        descricao: "Consulta e preparação de documentos fiscais.",
        permissoes: [
            { chave: "fiscal.visualizar", nome: "Visualizar situação fiscal da venda" },
            { chave: "fiscal.emitir", nome: "Preparar/emitir NF-e" }
        ]
    },
    {
        id: "financeiro_receber",
        nome: "Contas a receber",
        descricao: "Cobranças e recebimentos de clientes.",
        permissoes: [
            { chave: "contas_receber.visualizar", nome: "Visualizar contas a receber" },
            { chave: "contas_receber.criar", nome: "Criar contas a receber" },
            { chave: "contas_receber.editar", nome: "Editar contas a receber" },
            { chave: "contas_receber.receber", nome: "Registrar recebimentos" },
            { chave: "contas_receber.cancelar", nome: "Cancelar contas a receber" }
        ]
    },
    {
        id: "financeiro_pagar",
        nome: "Contas a pagar",
        descricao: "Despesas, pagamentos e cancelamentos.",
        permissoes: [
            { chave: "contas_pagar.visualizar", nome: "Visualizar contas a pagar" },
            { chave: "contas_pagar.criar", nome: "Criar contas a pagar" },
            { chave: "contas_pagar.editar", nome: "Editar contas a pagar" },
            { chave: "contas_pagar.pagar", nome: "Registrar pagamentos" },
            { chave: "contas_pagar.cancelar", nome: "Cancelar contas a pagar" }
        ]
    },
    {
        id: "financeiro_caixa",
        nome: "Caixa e bancos",
        descricao: "Contas financeiras, movimentações e cadastros auxiliares.",
        permissoes: [
            { chave: "contas_financeiras.visualizar", nome: "Visualizar caixas e bancos" },
            { chave: "contas_financeiras.gerenciar", nome: "Gerenciar caixas e bancos" },
            { chave: "movimentacoes.visualizar", nome: "Visualizar movimentações" },
            { chave: "movimentacoes.criar", nome: "Criar lançamento manual" },
            { chave: "movimentacoes.transferir", nome: "Transferir entre contas" },
            { chave: "movimentacoes.estornar", nome: "Estornar movimentações" },
            { chave: "financeiro.configurar", nome: "Gerenciar categorias e centros de custo" }
        ]
    }
];

const TODAS_PERMISSOES = GRUPOS_PERMISSOES
    .flatMap((grupo) => grupo.permissoes.map((item) => item.chave));

const PERFIS_PADRAO = {
    ADMIN: [...TODAS_PERMISSOES],

    GERENTE: [
        "dashboard.visualizar",
        "dashboard.financeiro",
        "empresa.visualizar",
        "clientes.visualizar",
        "clientes.criar",
        "clientes.editar",
        "clientes.excluir",
        "clientes.importar",
        "categorias.visualizar",
        "categorias.gerenciar",
        "produtos.visualizar",
        "produtos.criar",
        "produtos.editar",
        "produtos.duplicar",
        "produtos.excluir",
        "servicos.visualizar",
        "servicos.gerenciar",
        "orcamentos.visualizar",
        "orcamentos.criar",
        "orcamentos.editar",
        "orcamentos.enviar",
        "orcamentos.aprovar",
        "orcamentos.excluir",
        "vendas.visualizar",
        "vendas.faturar",
        "vendas.cancelar",
        "fiscal.visualizar",
        "fiscal.emitir",
        "contas_receber.visualizar",
        "contas_receber.criar",
        "contas_receber.editar",
        "contas_receber.receber",
        "contas_receber.cancelar",
        "contas_pagar.visualizar",
        "contas_pagar.criar",
        "contas_pagar.editar",
        "contas_pagar.pagar",
        "contas_pagar.cancelar",
        "contas_financeiras.visualizar",
        "contas_financeiras.gerenciar",
        "movimentacoes.visualizar",
        "movimentacoes.criar",
        "movimentacoes.transferir",
        "movimentacoes.estornar",
        "financeiro.configurar"
    ],

    VENDEDOR: [
        "clientes.visualizar",
        "clientes.criar",
        "clientes.editar",
        "categorias.visualizar",
        "produtos.visualizar",
        "servicos.visualizar",
        "orcamentos.visualizar",
        "orcamentos.criar",
        "orcamentos.editar",
        "orcamentos.enviar",
        "vendas.visualizar"
    ],

    FINANCEIRO: [
        "dashboard.visualizar",
        "dashboard.financeiro",
        "clientes.visualizar",
        "orcamentos.visualizar",
        "vendas.visualizar",
        "contas_receber.visualizar",
        "contas_receber.criar",
        "contas_receber.editar",
        "contas_receber.receber",
        "contas_receber.cancelar",
        "contas_pagar.visualizar",
        "contas_pagar.criar",
        "contas_pagar.editar",
        "contas_pagar.pagar",
        "contas_pagar.cancelar",
        "contas_financeiras.visualizar",
        "contas_financeiras.gerenciar",
        "movimentacoes.visualizar",
        "movimentacoes.criar",
        "movimentacoes.transferir",
        "movimentacoes.estornar",
        "financeiro.configurar"
    ],

    ESTOQUE: [
        "categorias.visualizar",
        "categorias.gerenciar",
        "produtos.visualizar",
        "produtos.criar",
        "produtos.editar",
        "produtos.duplicar",
        "produtos.excluir",
        "vendas.visualizar"
    ],

    FISCAL: [
        "empresa.visualizar",
        "empresa.fiscal",
        "clientes.visualizar",
        "produtos.visualizar",
        "servicos.visualizar",
        "vendas.visualizar",
        "fiscal.visualizar",
        "fiscal.emitir"
    ]
};

function normalizarPermissoes(permissoes) {
    if (!Array.isArray(permissoes)) return [];

    const permitidas = new Set(TODAS_PERMISSOES);

    const normalizadas = new Set(
        permissoes
            .map((item) => String(item || "").trim())
            .filter((item) => permitidas.has(item))
    );

    const dependencias = {
        "dashboard.visualizar": ["dashboard.financeiro"],
        "empresa.editar": ["empresa.visualizar"],
        "empresa.fiscal": ["empresa.visualizar"],
        "empresa.certificado": ["empresa.visualizar"],
        "clientes.criar": ["clientes.visualizar"],
        "clientes.editar": ["clientes.visualizar"],
        "clientes.excluir": ["clientes.visualizar"],
        "clientes.importar": ["clientes.visualizar"],
        "categorias.gerenciar": ["categorias.visualizar"],
        "produtos.criar": ["produtos.visualizar"],
        "produtos.editar": ["produtos.visualizar"],
        "produtos.duplicar": ["produtos.visualizar"],
        "produtos.excluir": ["produtos.visualizar"],
        "servicos.gerenciar": ["servicos.visualizar"],
        "orcamentos.criar": ["orcamentos.visualizar"],
        "orcamentos.editar": ["orcamentos.visualizar"],
        "orcamentos.enviar": ["orcamentos.visualizar"],
        "orcamentos.aprovar": ["orcamentos.visualizar"],
        "orcamentos.excluir": ["orcamentos.visualizar"],
        "vendas.faturar": ["vendas.visualizar"],
        "vendas.cancelar": ["vendas.visualizar"],
        "fiscal.emitir": ["fiscal.visualizar", "vendas.visualizar"],
        "contas_receber.criar": ["contas_receber.visualizar"],
        "contas_receber.editar": ["contas_receber.visualizar"],
        "contas_receber.receber": ["contas_receber.visualizar"],
        "contas_receber.cancelar": ["contas_receber.visualizar"],
        "contas_pagar.criar": ["contas_pagar.visualizar"],
        "contas_pagar.editar": ["contas_pagar.visualizar"],
        "contas_pagar.pagar": ["contas_pagar.visualizar"],
        "contas_pagar.cancelar": ["contas_pagar.visualizar"],
        "contas_financeiras.gerenciar": ["contas_financeiras.visualizar"],
        "movimentacoes.criar": ["movimentacoes.visualizar"],
        "movimentacoes.transferir": ["movimentacoes.visualizar"],
        "movimentacoes.estornar": ["movimentacoes.visualizar"]
    };

    let houveInclusao = true;
    while (houveInclusao) {
        houveInclusao = false;
        for (const [permissao, requisitos] of Object.entries(dependencias)) {
            if (!normalizadas.has(permissao)) continue;
            for (const requisito of requisitos) {
                if (!normalizadas.has(requisito)) {
                    normalizadas.add(requisito);
                    houveInclusao = true;
                }
            }
        }
    }

    return [...normalizadas];
}

function permissoesPadraoPerfil(perfil) {
    return normalizarPermissoes(PERFIS_PADRAO[perfil] || []);
}

function resolverPermissoes(perfil, personalizadas = null) {
    if (perfil === "ADMIN") {
        return [...TODAS_PERMISSOES];
    }

    if (Array.isArray(personalizadas)) {
        return normalizarPermissoes(personalizadas);
    }

    return permissoesPadraoPerfil(perfil);
}

function catalogoParaCliente() {
    return GRUPOS_PERMISSOES.map((grupo) => ({
        id: grupo.id,
        nome: grupo.nome,
        descricao: grupo.descricao,
        permissoes: grupo.permissoes.map((item) => ({ ...item }))
    }));
}

module.exports = {
    GRUPOS_PERMISSOES,
    TODAS_PERMISSOES,
    PERFIS_PADRAO,
    normalizarPermissoes,
    permissoesPadraoPerfil,
    resolverPermissoes,
    catalogoParaCliente
};
