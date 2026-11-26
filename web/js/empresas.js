let empresaAtual = null;
let portalNacionalAtual = null;

document.addEventListener("DOMContentLoaded", async () => {
    configurarAbas();
    configurarTesteSefazGo();
    document.getElementById("formEmpresa").addEventListener("submit", salvarEmpresa);
    document.getElementById("formFiscal").addEventListener("submit", salvarFiscal);
    document.getElementById("formCertificado").addEventListener("submit", salvarCertificado);
    await Promise.all([carregarEmpresa(), carregarPortalNacional()]);
});

function configurarTesteSefazGo() {
    const acoes = document.querySelector("#formFiscal .panel-actions");
    if (!acoes) return;
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "btn btn-light";
    botao.textContent = "Testar SEFAZ Goiás em homologação";
    botao.addEventListener("click", async () => {
        botao.disabled = true;
        try {
            const resposta = await get("/empresas/minha/nfe/sefaz/status?ambiente=HOMOLOGACAO");
            if (!resposta?.sucesso) {
                return mostrarMensagem(resposta?.mensagem || "Não foi possível consultar a SEFAZ Goiás.", { tipo: "erro" });
            }
            const informacoes = [
                resposta.operante ? "Serviço de NF-e operante em homologação." : "A consulta não confirmou que o serviço está operante.",
                resposta.statusHttp && `HTTP ${resposta.statusHttp}`,
                resposta.cStat && `Código SEFAZ ${resposta.cStat}`,
                resposta.xMotivo
            ].filter(Boolean);
            mostrarMensagem(informacoes.join("\n"), { tipo: resposta.operante ? "sucesso" : "erro" });
        } finally {
            botao.disabled = false;
        }
    });
    acoes.prepend(botao);
}

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

function definir(id, valor) { const campo = document.getElementById(id); if (campo) campo.value = valor ?? ""; }

function preencherEmpresa(empresa) {
    ["razaoSocial", "nomeFantasia", "cnpj", "inscricaoEstadual", "email", "telefone", "celular", "cep", "endereco", "numero", "complemento", "bairro", "cidade", "estado"].forEach((campo) => definir(campo, empresa[campo]));
}

function preencherFiscal(fiscal) {
    ["regimeTributario", "crt", "inscricaoMunicipal", "cnaePrincipal", "codigoMunicipio", "ambiente", "serieNfe", "proximoNumeroNfe", "cfopPadrao", "naturezaOperacao", "emailFiscal", "informacoesComplementares", "icmsSituacaoTributariaPadrao", "pisSituacaoTributariaPadrao", "cofinsSituacaoTributariaPadrao", "modalidadeFrete", "presencaComprador", "cbsAliquotaPadrao", "ibsUfAliquotaPadrao", "ibsMunAliquotaPadrao"].forEach((campo) => definir(campo, fiscal[campo]));
    if (!fiscal.ambiente) definir("ambiente", "HOMOLOGACAO");
    if (!fiscal.serieNfe) definir("serieNfe", 1);
    if (!fiscal.proximoNumeroNfe) definir("proximoNumeroNfe", 1);
    if (fiscal.modalidadeFrete === undefined || fiscal.modalidadeFrete === null) definir("modalidadeFrete", 9);
    if (fiscal.presencaComprador === undefined || fiscal.presencaComprador === null) definir("presencaComprador", 9);
    definir("consumidorFinal", fiscal.consumidorFinal === false ? "false" : "true");
    document.getElementById("fiscalAtivo").checked = Boolean(fiscal.ativo);
    document.getElementById("emitirNfeAoFaturar").checked = Boolean(fiscal.emitirNfeAoFaturar);
    document.getElementById("rtcAtivo").checked = Boolean(fiscal.rtcAtivo);
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
    elemento.className = "fiscal-status";
    if (fiscal?.ativo && certificado?.ativo && (!certificado.validade || new Date(certificado.validade) >= new Date())) {
        elemento.classList.add("ready");
        elemento.querySelector("span:last-child").textContent = ambiente === "PRODUCAO" ? "Cadastro fiscal ativo em produção" : "Cadastro fiscal ativo em homologação";
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
        rtcAtivo: document.getElementById("rtcAtivo").checked,
        cbsAliquotaPadrao: valor("cbsAliquotaPadrao") === "" ? null : Number(valor("cbsAliquotaPadrao")),
        ibsUfAliquotaPadrao: valor("ibsUfAliquotaPadrao") === "" ? null : Number(valor("ibsUfAliquotaPadrao")),
        ibsMunAliquotaPadrao: valor("ibsMunAliquotaPadrao") === "" ? null : Number(valor("ibsMunAliquotaPadrao")),
        ativo: document.getElementById("fiscalAtivo").checked
    };
    if (dados.ambiente === "PRODUCAO" && !await confirmarAcao("Confirma o ambiente de PRODUÇÃO? Antes disso valide uma NF-e em homologação e confirme a numeração atual com o contador/Omie.")) return;
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
    } catch (erro) { mostrarMensagem(erro.message); }
}

async function removerCertificado() {
    if (!await confirmarAcao("Deseja remover o certificado digital armazenado?")) return;
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


async function carregarPortalNacional() {
    try {
        const resposta = await get("/empresas/minha/portal-nacional");
        if (!resposta?.sucesso) return;
        portalNacionalAtual = resposta.status;
        preencherPortalNacional(portalNacionalAtual);
    } catch (erro) {
        console.error("Portal Nacional:", erro);
    }
}

function preencherPortalNacional(status) {
    const resumo = document.getElementById("portalNacionalResumo");
    const badge = document.getElementById("portalNacionalBadge");
    if (!resumo || !badge) return;

    const pendencias = status?.pendencias || [];
    const certificado = status?.certificado;

    resumo.innerHTML = `
        <div><strong>Empresa:</strong> ${status?.empresa?.razaoSocial || "—"}</div>
        <div><strong>CNPJ:</strong> ${status?.empresa?.cnpj || "—"}</div>
        <div><strong>Ambiente:</strong> ${status?.ambiente === "PRODUCAO" ? "Produção" : "Produção restrita / homologação"}</div>
        <div><strong>Município IBGE:</strong> ${status?.codigoMunicipio || "Não informado"}</div>
        <div><strong>Certificado:</strong> ${certificado?.nomeArquivo || "Não configurado"}</div>
        <div><strong>Pendências:</strong> ${pendencias.length ? pendencias.join(", ") : "Nenhuma para teste de conexão"}</div>
    `;

    const pronto = Boolean(status?.prontoParaTestar);
    badge.className = `badge ${pronto ? "badge-success" : "badge-warning"}`;
    badge.textContent = pronto ? "Pronto para testar" : "Configuração pendente";
}

async function testarPortalNacional() {
    const resposta = await post("/empresas/minha/portal-nacional/testar", {});
    if (!resposta?.sucesso) {
        mostrarMensagem(resposta?.mensagem || "Não foi possível conectar ao Portal Nacional.");
        return;
    }
    mostrarMensagem("Conexão com o Portal Nacional validada com sucesso.");
    await carregarPortalNacional();
}
