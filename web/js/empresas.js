let empresaAtual = null;
let focusAtual = null;

document.addEventListener("DOMContentLoaded", async () => {
    configurarAbas();
    document.getElementById("formEmpresa").addEventListener("submit", salvarEmpresa);
    document.getElementById("formFiscal").addEventListener("submit", salvarFiscal);
    document.getElementById("formCertificado").addEventListener("submit", salvarCertificado);
    document.getElementById("formFocus").addEventListener("submit", salvarFocus);
    await Promise.all([carregarEmpresa(), carregarFocus()]);
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

async function carregarFocus() {
    try {
        const resposta = await get("/empresas/minha/focus");
        if (!resposta?.sucesso) return;
        focusAtual = resposta.configuracao;
        preencherFocus(focusAtual);
        atualizarStatusFiscal();
    } catch (erro) {
        console.error("Focus NFe:", erro);
    }
}

function definir(id, valor) { const campo = document.getElementById(id); if (campo) campo.value = valor ?? ""; }

function preencherEmpresa(empresa) {
    ["razaoSocial", "nomeFantasia", "cnpj", "inscricaoEstadual", "email", "telefone", "celular", "cep", "endereco", "numero", "complemento", "bairro", "cidade", "estado"].forEach((campo) => definir(campo, empresa[campo]));
}

function preencherFiscal(fiscal) {
    ["regimeTributario", "crt", "inscricaoMunicipal", "cnaePrincipal", "codigoMunicipio", "ambiente", "serieNfe", "proximoNumeroNfe", "cfopPadrao", "naturezaOperacao", "emailFiscal", "informacoesComplementares", "icmsSituacaoTributariaPadrao", "pisSituacaoTributariaPadrao", "cofinsSituacaoTributariaPadrao", "modalidadeFrete", "presencaComprador"].forEach((campo) => definir(campo, fiscal[campo]));
    if (!fiscal.ambiente) definir("ambiente", "HOMOLOGACAO");
    if (!fiscal.serieNfe) definir("serieNfe", 1);
    if (!fiscal.proximoNumeroNfe) definir("proximoNumeroNfe", 1);
    if (fiscal.modalidadeFrete === undefined || fiscal.modalidadeFrete === null) definir("modalidadeFrete", 9);
    if (fiscal.presencaComprador === undefined || fiscal.presencaComprador === null) definir("presencaComprador", 9);
    definir("consumidorFinal", fiscal.consumidorFinal === false ? "false" : "true");
    document.getElementById("fiscalAtivo").checked = Boolean(fiscal.ativo);
    document.getElementById("emitirNfeAoFaturar").checked = Boolean(fiscal.emitirNfeAoFaturar);
}

function preencherFocus(focus) {
    document.getElementById("focusAtivo").checked = focus?.ativo !== false;
    document.getElementById("tokenFocusHomologacao").value = "";
    document.getElementById("tokenFocusProducao").value = "";
    document.getElementById("statusTokenHomologacao").textContent = focus?.homologacaoConfigurada
        ? `Configurado${focus.ultimaValidacaoHomologacao ? ` • testado em ${new Date(focus.ultimaValidacaoHomologacao).toLocaleString("pt-BR")}` : " • ainda não testado"}.`
        : "Não configurado.";
    document.getElementById("statusTokenProducao").textContent = focus?.producaoConfigurada
        ? `Configurado${focus.ultimaValidacaoProducao ? ` • testado em ${new Date(focus.ultimaValidacaoProducao).toLocaleString("pt-BR")}` : " • ainda não testado"}.`
        : "Não configurado.";
    const badge = document.getElementById("focusBadge");
    const ok = focus?.homologacaoConfigurada || focus?.producaoConfigurada;
    badge.className = `badge ${ok ? "badge-success" : "badge-warning"}`;
    badge.textContent = ok ? "Token configurado" : "Não configurado";
}

function preencherCertificado(certificado) {
    const atual = document.getElementById("certificadoAtual");
    const badge = document.getElementById("certificadoBadge");
    if (!certificado) { atual.style.display = "none"; badge.className = "badge badge-warning"; badge.textContent = "Não configurado"; return; }
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
    const ambiente = fiscal?.ambiente || "HOMOLOGACAO";
    const tokenOk = ambiente === "PRODUCAO" ? focusAtual?.producaoConfigurada : focusAtual?.homologacaoConfigurada;
    elemento.className = "fiscal-status";
    if (fiscal?.ativo && certificado && tokenOk) {
        elemento.classList.add("ready");
        elemento.querySelector("span:last-child").textContent = ambiente === "PRODUCAO" ? "Fiscal + Focus prontos em produção" : "Fiscal + Focus prontos em homologação";
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
        informacoesComplementares: valor("informacoesComplementares"),
        icmsSituacaoTributariaPadrao: valor("icmsSituacaoTributariaPadrao"),
        pisSituacaoTributariaPadrao: valor("pisSituacaoTributariaPadrao"),
        cofinsSituacaoTributariaPadrao: valor("cofinsSituacaoTributariaPadrao"),
        modalidadeFrete: Number(valor("modalidadeFrete") || 9),
        presencaComprador: Number(valor("presencaComprador") || 9),
        consumidorFinal: valor("consumidorFinal") !== "false",
        emitirNfeAoFaturar: document.getElementById("emitirNfeAoFaturar").checked,
        ativo: document.getElementById("fiscalAtivo").checked
    };
    if (dados.ambiente === "PRODUCAO" && !confirm("Confirma o ambiente de PRODUÇÃO? Antes disso valide uma NF-e em homologação e confirme a numeração atual com o contador/Omie.")) return;
    const resposta = await put("/empresas/minha/fiscal", dados);
    if (!resposta?.sucesso) return mostrarMensagem(resposta?.mensagem || "Erro ao salvar configuração fiscal.");
    empresaAtual.configuracaoFiscal = resposta.configuracaoFiscal;
    atualizarStatusFiscal();
    mostrarMensagem("Configuração fiscal salva com sucesso.");
}

async function salvarFocus(evento) {
    evento.preventDefault();
    const tokenHomologacao = valor("tokenFocusHomologacao");
    const tokenProducao = valor("tokenFocusProducao");
    const resposta = await put("/empresas/minha/focus", {
        tokenHomologacao,
        tokenProducao,
        ativo: document.getElementById("focusAtivo").checked
    });
    if (!resposta?.sucesso) return mostrarMensagem(resposta?.mensagem || "Erro ao salvar a Focus NFe.");
    focusAtual = resposta.configuracao;
    preencherFocus(focusAtual);
    atualizarStatusFiscal();
    mostrarMensagem("Tokens Focus NFe salvos. Agora teste primeiro a homologação.");
}

async function testarFocus(ambiente) {
    const precisaSalvar = ambiente === "HOMOLOGACAO" ? valor("tokenFocusHomologacao") : valor("tokenFocusProducao");
    if (precisaSalvar) {
        mostrarMensagem("Salve o token antes de testar. Por segurança, o teste usa somente o token já criptografado no servidor.");
        return;
    }
    const resposta = await post("/empresas/minha/focus/testar", { ambiente });
    if (!resposta?.sucesso) return mostrarMensagem(resposta?.mensagem || "Não foi possível validar o token Focus NFe.");
    await carregarFocus();
    mostrarMensagem(resposta.mensagem);
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
    } catch (erro) { mostrarMensagem(erro.message); }
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

function alternarSenhaCampo(id, botao) {
    const campo = document.getElementById(id);
    campo.type = campo.type === "password" ? "text" : "password";
    const icone = botao.querySelector("i");
    if (icone) icone.className = `fas fa-${campo.type === "password" ? "eye" : "eye-slash"}`;
}
