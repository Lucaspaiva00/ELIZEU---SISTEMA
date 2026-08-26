function moeda(valor) {

    return Number(valor).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });

}

function data(data) {

    return new Date(data).toLocaleDateString("pt-BR");

}

function numero(valor) {

    return Number(valor).toLocaleString("pt-BR");

}

// =====================================================
// MENSAGENS DO SISTEMA
// Substitui o alert() nativo por uma mensagem visual,
// não bloqueante e compatível com as chamadas existentes.
// =====================================================
let mensagemSistemaAtual = null;
let mensagemSistemaTimer = null;

function garantirEstilosMensagemSistema() {
    if (document.getElementById("estilosMensagemSistema")) return;

    const style = document.createElement("style");
    style.id = "estilosMensagemSistema";
    style.textContent = `
        .mensagem-sistema-wrap {
            position: fixed;
            top: 22px;
            right: 22px;
            z-index: 99999;
            width: min(430px, calc(100vw - 32px));
            font-family: inherit;
        }

        .mensagem-sistema {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            background: #ffffff;
            color: #1f2937;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            box-shadow: 0 16px 40px rgba(15, 23, 42, .18);
            padding: 15px 15px 14px;
            animation: mensagemSistemaEntrar .18s ease-out;
        }

        .mensagem-sistema.erro {
            border-left: 4px solid #dc2626;
        }

        .mensagem-sistema.sucesso {
            border-left: 4px solid #16a34a;
        }

        .mensagem-sistema.info {
            border-left: 4px solid #2563eb;
        }

        .mensagem-sistema-icone {
            flex: 0 0 34px;
            width: 34px;
            height: 34px;
            border-radius: 50%;
            display: grid;
            place-items: center;
            font-size: 15px;
        }

        .mensagem-sistema.erro .mensagem-sistema-icone {
            background: #fef2f2;
            color: #dc2626;
        }

        .mensagem-sistema.sucesso .mensagem-sistema-icone {
            background: #f0fdf4;
            color: #16a34a;
        }

        .mensagem-sistema.info .mensagem-sistema-icone {
            background: #eff6ff;
            color: #2563eb;
        }

        .mensagem-sistema-conteudo {
            min-width: 0;
            flex: 1;
        }

        .mensagem-sistema-titulo {
            margin: 0 0 3px;
            font-size: 14px;
            font-weight: 700;
            line-height: 1.35;
        }

        .mensagem-sistema-texto {
            margin: 0;
            color: #475569;
            font-size: 13px;
            line-height: 1.5;
            overflow-wrap: anywhere;
        }

        .mensagem-sistema-acoes {
            display: flex;
            justify-content: flex-end;
            margin-top: 10px;
        }

        .mensagem-sistema-ok {
            appearance: none;
            border: 0;
            border-radius: 8px;
            background: #111827;
            color: #ffffff;
            padding: 7px 14px;
            font: inherit;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
        }

        .mensagem-sistema-ok:hover {
            opacity: .9;
        }

        @keyframes mensagemSistemaEntrar {
            from {
                opacity: 0;
                transform: translateY(-8px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        @media (max-width: 600px) {
            .mensagem-sistema-wrap {
                top: 14px;
                right: 16px;
                left: 16px;
                width: auto;
            }
        }
    `;

    document.head.appendChild(style);
}

function inferirTipoMensagem(texto, tipoInformado) {
    if (["erro", "sucesso", "info"].includes(tipoInformado)) {
        return tipoInformado;
    }

    const mensagem = String(texto || "").toLowerCase();

    if (
        mensagem.includes("erro") ||
        mensagem.includes("falha") ||
        mensagem.includes("inválid") ||
        mensagem.includes("não encontrado") ||
        mensagem.includes("não foi possível") ||
        mensagem.includes("não possui")
    ) {
        return "erro";
    }

    if (
        mensagem.includes("sucesso") ||
        mensagem.includes("concluíd") ||
        mensagem.includes("cadastrad") ||
        mensagem.includes("atualizad") ||
        mensagem.includes("removid") ||
        mensagem.includes("enviado")
    ) {
        return "sucesso";
    }

    return "info";
}

function fecharMensagemSistema(executarCallback = true) {
    if (mensagemSistemaTimer) {
        clearTimeout(mensagemSistemaTimer);
        mensagemSistemaTimer = null;
    }

    if (!mensagemSistemaAtual) return;

    const callback = mensagemSistemaAtual._aoFechar;
    mensagemSistemaAtual.remove();
    mensagemSistemaAtual = null;

    if (executarCallback && typeof callback === "function") {
        setTimeout(callback, 20);
    }
}

function mostrarMensagem(texto, opcoes = {}) {
    if (!document.body) return;

    garantirEstilosMensagemSistema();
    fecharMensagemSistema(false);

    const tipo = inferirTipoMensagem(texto, opcoes.tipo);
    const titulos = {
        erro: "Verifique as informações",
        sucesso: "Tudo certo",
        info: "Informação"
    };
    const icones = {
        erro: "fa-triangle-exclamation",
        sucesso: "fa-check",
        info: "fa-circle-info"
    };

    const wrap = document.createElement("div");
    wrap.className = "mensagem-sistema-wrap";
    wrap.setAttribute("role", tipo === "erro" ? "alert" : "status");
    wrap.setAttribute("aria-live", tipo === "erro" ? "assertive" : "polite");
    wrap._aoFechar = opcoes.aoFechar || null;

    const caixa = document.createElement("div");
    caixa.className = `mensagem-sistema ${tipo}`;

    const icone = document.createElement("div");
    icone.className = "mensagem-sistema-icone";
    icone.innerHTML = `<i class="fas ${icones[tipo]}"></i>`;

    const conteudo = document.createElement("div");
    conteudo.className = "mensagem-sistema-conteudo";

    const titulo = document.createElement("p");
    titulo.className = "mensagem-sistema-titulo";
    titulo.textContent = opcoes.titulo || titulos[tipo];

    const mensagem = document.createElement("p");
    mensagem.className = "mensagem-sistema-texto";
    mensagem.textContent = String(texto ?? "");

    const acoes = document.createElement("div");
    acoes.className = "mensagem-sistema-acoes";

    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "mensagem-sistema-ok";
    botao.textContent = opcoes.textoBotao || "OK";
    botao.addEventListener("click", () => fecharMensagemSistema(true));

    acoes.appendChild(botao);
    conteudo.append(titulo, mensagem, acoes);
    caixa.append(icone, conteudo);
    wrap.appendChild(caixa);
    document.body.appendChild(wrap);

    mensagemSistemaAtual = wrap;

    if (opcoes.focarBotao !== false) {
        setTimeout(() => botao.focus({ preventScroll: true }), 30);
    }

    if (Number(opcoes.duracaoMs) > 0) {
        mensagemSistemaTimer = setTimeout(
            () => fecharMensagemSistema(true),
            Number(opcoes.duracaoMs)
        );
    }
}

// =====================================================
// CEP DO CADASTRO DE CLIENTES
// Evita a consulta duplicada do input + blur e impede
// o antigo ciclo infinito de alertas quando o CEP é inválido.
// =====================================================
function configurarCepProfissionalClientes() {
    const campoCep = document.getElementById("cep");
    const modalCliente = document.getElementById("modalCliente");

    if (!campoCep || !modalCliente) return;
    if (campoCep.dataset.cepProfissional === "1") return;

    campoCep.dataset.cepProfissional = "1";

    let ultimoCepConsultado = "";
    let consultaEmAndamento = false;
    let controladorConsulta = null;
    let timerDigitacao = null;

    const limparEstadoVisual = () => {
        campoCep.removeAttribute("aria-invalid");
        campoCep.style.borderColor = "";
        campoCep.style.boxShadow = "";
    };

    const marcarInvalido = () => {
        campoCep.setAttribute("aria-invalid", "true");
        campoCep.style.borderColor = "#dc2626";
        campoCep.style.boxShadow = "0 0 0 3px rgba(220, 38, 38, .10)";
    };

    const preencher = (id, valor) => {
        const campo = document.getElementById(id);
        if (campo) campo.value = valor ?? "";
    };

    const normalizarCepNoCampo = () => {
        const digitos = String(campoCep.value || "")
            .replace(/\D/g, "")
            .slice(0, 8);

        if (digitos.length > 5) {
            campoCep.value = `${digitos.slice(0, 5)}-${digitos.slice(5)}`;
        } else {
            campoCep.value = digitos;
        }

        return digitos;
    };

    const consultarCep = async (forcar = false) => {
        const cep = normalizarCepNoCampo();

        if (cep.length !== 8) return;
        if (!forcar && cep === ultimoCepConsultado) return;
        if (consultaEmAndamento && cep === ultimoCepConsultado) return;

        ultimoCepConsultado = cep;
        consultaEmAndamento = true;
        limparEstadoVisual();

        if (controladorConsulta) controladorConsulta.abort();
        controladorConsulta = new AbortController();

        try {
            const resposta = await fetch(
                `https://viacep.com.br/ws/${cep}/json/`,
                { signal: controladorConsulta.signal }
            );

            if (!resposta.ok) {
                throw new Error(`ViaCEP respondeu HTTP ${resposta.status}`);
            }

            const endereco = await resposta.json();

            if (endereco.erro) {
                marcarInvalido();

                mostrarMensagem(
                    "CEP não localizado. Confira os 8 dígitos informados e tente novamente.",
                    {
                        tipo: "erro",
                        titulo: "CEP inválido ou não encontrado",
                        textoBotao: "OK, corrigir CEP",
                        aoFechar: () => {
                            campoCep.focus({ preventScroll: true });
                            campoCep.select();
                        }
                    }
                );

                return;
            }

            preencher("endereco", endereco.logradouro || "");
            preencher("bairro", endereco.bairro || "");
            preencher("cidade", endereco.localidade || "");
            preencher("estado", endereco.uf || "");
            limparEstadoVisual();
        } catch (erro) {
            if (erro?.name === "AbortError") return;

            console.error("[CEP] Falha na consulta:", erro);
            marcarInvalido();

            mostrarMensagem(
                "Não foi possível consultar o CEP neste momento. Você pode corrigir o CEP ou preencher o endereço manualmente.",
                {
                    tipo: "erro",
                    titulo: "Consulta de CEP indisponível",
                    textoBotao: "Voltar ao formulário",
                    aoFechar: () => campoCep.focus({ preventScroll: true })
                }
            );
        } finally {
            consultaEmAndamento = false;
        }
    };

    // Captura os eventos antes do listener antigo de clientes.js.
    // Isso elimina a dupla chamada (input + blur) sem exigir alteração
    // no restante do módulo de clientes.
    campoCep.addEventListener(
        "input",
        (evento) => {
            evento.stopImmediatePropagation();

            limparEstadoVisual();
            const cepAnterior = ultimoCepConsultado;
            const cep = normalizarCepNoCampo();

            if (cep !== cepAnterior) {
                ultimoCepConsultado = "";
            }

            if (timerDigitacao) clearTimeout(timerDigitacao);

            if (cep.length === 8) {
                timerDigitacao = setTimeout(() => consultarCep(false), 300);
            }
        },
        true
    );

    campoCep.addEventListener(
        "blur",
        (evento) => {
            evento.stopImmediatePropagation();

            if (timerDigitacao) {
                clearTimeout(timerDigitacao);
                timerDigitacao = null;
            }

            const cep = normalizarCepNoCampo();

            if (cep.length === 8 && cep !== ultimoCepConsultado) {
                consultarCep(false);
            }
        },
        true
    );
}

document.addEventListener(
    "DOMContentLoaded",
    configurarCepProfissionalClientes
);
