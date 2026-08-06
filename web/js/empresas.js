let empresaAtual = null;

document.addEventListener("DOMContentLoaded", async () => {
    configurarAbas();
    document.getElementById("formEmpresa").addEventListener("submit", salvarEmpresa);
    document.getElementById("formFiscal").addEventListener("submit", salvarFiscal);
    document.getElementById("formCertificado").addEventListener("submit", salvarCertificado);
    await carregarEmpresa();
});

function configurarAbas() {
    document.querySelectorAll(".empresa-tab").forEach((botao) => {
        botao.addEventListener("click", () => {
            document.querySelectorAll(".empresa-tab").forEach((item) => item.classList.remove("active"));
            document.querySelectorAll(".empresa-panel").forEach((item) => item.classList.remove("active"));
            botao.classList.add("active");
            document.querySelectorAll(`[data-panel="${botao.dataset.tab}"]`).forEach((painel) => painel.classList.add("active"));
        });
    });
}

async function carregarEmpresa() {
    const resposta = await get("/empresas/minha");
    if (!resposta?.sucesso) return mostrarMensagem(resposta?.mensagem || "Erro ao carregar a empresa.");
    empresaAtual = resposta.empresa;
    preencherEmpresa(empresaAtual);
    preencherFiscal(empresaAtual.configuracaoFiscal || {});
    preencherCertificado(empresaAtual.certificadoDigital);
    atualizarStatusFiscal();
}

function definir(id, valor) {
    const campo = document.getElementById(id);
    if (campo) campo.value = valor ?? "";
}

function preencherEmpresa(empresa) {
    ["razaoSocial", "nomeFantasia", "cnpj", "inscricaoEstadual", "email", "telefone", "celular", "cep", "endereco", "numero", "complemento", "bairro", "cidade", "estado"].forEach((campo) => definir(campo, empresa[campo]));
}

function preencherFiscal(fiscal) {
    ["regimeTributario", "crt", "inscricaoMunicipal", "cnaePrincipal", "codigoMunicipio", "ambiente", "serieNfe", "proximoNumeroNfe", "cfopPadrao", "naturezaOperacao", "emailFiscal", "informacoesComplementares"].forEach((campo) => definir(campo, fiscal[campo]));
    if (!fiscal.ambiente) definir("ambiente", "HOMOLOGACAO");
    if (!fiscal.serieNfe) definir("serieNfe", 1);
    if (!fiscal.proximoNumeroNfe) definir("proximoNumeroNfe", 1);
    document.getElementById("fiscalAtivo").checked = Boolean(fiscal.ativo);
}

function preencherCertificado(certificado) {
    const atual = document.getElementById("certificadoAtual");
    const badge = document.getElementById("certificadoBadge");
    if (!certificado) {
        atual.style.display = "none";
        badge.className = "badge badge-warning";
        badge.textContent = "Não configurado";
        return;
    }
    atual.style.display = "flex";
    document.getElementById("certificadoNome").textContent = certificado.nomeArquivo;
    document.getElementById("certificadoValidade").textContent = certificado.validade ? `Válido até ${new Date(certificado.validade).toLocaleDateString("pt-BR")}` : "Validade não informada";
    const vencido = certificado.validade && new Date(certificado.validade) < new Date();
    badge.className = `badge ${vencido ? "badge-danger" : "badge-success"}`;
    badge.textContent = vencido ? "Vencido" : "Armazenado";
}

function atualizarStatusFiscal() {
    const elemento = document.getElementById("statusFiscal");
    const fiscal = empresaAtual?.configuracaoFiscal;
    const certificado = empresaAtual?.certificadoDigital;
    elemento.className = "fiscal-status";
    if (fiscal?.ativo && certificado) {
        elemento.classList.add("ready");
        elemento.querySelector("span:last-child").textContent = fiscal.ambiente === "PRODUCAO" ? "Fiscal ativo em produção" : "Fiscal ativo em homologação";
    } else {
        elemento.classList.add("pending");
        elemento.querySelector("span:last-child").textContent = "Configuração fiscal pendente";
    }
}

function valor(id) { return document.getElementById(id).value.trim(); }

async function salvarEmpresa(evento) {
    evento.preventDefault();
    const dados = {};
    ["razaoSocial", "nomeFantasia", "cnpj", "inscricaoEstadual", "email", "telefone", "celular", "cep", "endereco", "numero", "complemento", "bairro", "cidade", "estado"].forEach((campo) => dados[campo] = valor(campo));
    dados.estado = dados.estado.toUpperCase();
    const resposta = await put("/empresas/minha", dados);
    if (!resposta?.sucesso) return mostrarMensagem(resposta?.mensagem || "Erro ao salvar empresa.");
    empresaAtual = { ...empresaAtual, ...resposta.empresa };
    mostrarMensagem("Dados da empresa salvos com sucesso.");
}

async function salvarFiscal(evento) {
    evento.preventDefault();
    const dados = {
        regimeTributario: valor("regimeTributario") || null,
        crt: valor("crt") || null,
        inscricaoMunicipal: valor("inscricaoMunicipal"), cnaePrincipal: valor("cnaePrincipal"), codigoMunicipio: valor("codigoMunicipio"),
        ambiente: valor("ambiente"), serieNfe: Number(valor("serieNfe")), proximoNumeroNfe: Number(valor("proximoNumeroNfe")),
        cfopPadrao: valor("cfopPadrao"), naturezaOperacao: valor("naturezaOperacao"), emailFiscal: valor("emailFiscal"),
        informacoesComplementares: valor("informacoesComplementares"), ativo: document.getElementById("fiscalAtivo").checked
    };
    if (dados.ambiente === "PRODUCAO" && !confirm("Confirma a configuração do ambiente de PRODUÇÃO? Use somente após validar a homologação com o contador.")) return;
    const resposta = await put("/empresas/minha/fiscal", dados);
    if (!resposta?.sucesso) return mostrarMensagem(resposta?.mensagem || "Erro ao salvar configuração fiscal.");
    empresaAtual.configuracaoFiscal = resposta.configuracaoFiscal;
    atualizarStatusFiscal();
    mostrarMensagem("Configuração fiscal salva com sucesso.");
}

function lerArquivoBase64(arquivo) {
    return new Promise((resolve, reject) => {
        const leitor = new FileReader();
        leitor.onload = () => resolve(String(leitor.result).split(",")[1]);
        leitor.onerror = () => reject(new Error("Não foi possível ler o certificado."));
        leitor.readAsDataURL(arquivo);
    });
}

async function salvarCertificado(evento) {
    evento.preventDefault();
    try {
        const arquivo = document.getElementById("arquivoCertificado").files[0];
        if (!arquivo) throw new Error("Selecione o certificado A1.");
        if (arquivo.size > 5 * 1024 * 1024) throw new Error("O certificado não pode exceder 5 MB.");
        const resposta = await post("/empresas/minha/certificado", {
            nomeArquivo: arquivo.name, arquivoBase64: await lerArquivoBase64(arquivo),
            senha: document.getElementById("senhaCertificado").value,
            validade: document.getElementById("validadeCertificado").value || null
        });
        if (!resposta?.sucesso) throw new Error(resposta?.mensagem || "Erro ao armazenar certificado.");
        empresaAtual.certificadoDigital = resposta.certificadoDigital;
        preencherCertificado(resposta.certificadoDigital);
        atualizarStatusFiscal();
        document.getElementById("formCertificado").reset();
        mostrarMensagem("Certificado armazenado com segurança.");
    } catch (erro) {
        mostrarMensagem(erro.message);
    }
}

async function removerCertificado() {
    if (!confirm("Deseja remover o certificado digital armazenado?")) return;
    const resposta = await del("/empresas/minha/certificado");
    if (!resposta?.sucesso) return mostrarMensagem(resposta?.mensagem || "Erro ao remover certificado.");
    empresaAtual.certificadoDigital = null;
    preencherCertificado(null);
    atualizarStatusFiscal();
}

function alternarSenhaCertificado() {
    const campo = document.getElementById("senhaCertificado");
    campo.type = campo.type === "password" ? "text" : "password";
}
