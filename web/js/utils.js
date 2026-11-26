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

// Diálogos compartilhados do ERP.
let mensagemSistemaAtual = null;

function garantirEstilosMensagemSistema() {
    if (document.getElementById("estilosMensagemSistema")) return;
    const style = document.createElement("style");
    style.id = "estilosMensagemSistema";
    style.textContent = `
        .mensagem-sistema {
            width: min(460px, calc(100vw - 32px));
            max-height: calc(100dvh - 32px);
            box-sizing: border-box;
            border: 1px solid #e2e8f0;
            border-radius: 14px;
            padding: 22px;
            color: #1e293b;
            background: #fff;
            box-shadow: 0 20px 55px rgba(15, 23, 42, .24);
        }
        .mensagem-sistema::backdrop { background: rgba(15, 23, 42, .48); }
        .mensagem-sistema-titulo { margin: 0 0 10px; font-size: 18px; }
        .mensagem-sistema.erro .mensagem-sistema-titulo { color: #b91c1c; }
        .mensagem-sistema.sucesso .mensagem-sistema-titulo { color: #15803d; }
        .mensagem-sistema-texto {
            margin: 0;
            color: #475569;
            line-height: 1.55;
            white-space: pre-wrap;
            overflow-wrap: anywhere;
        }
        .mensagem-sistema-campo {
            width: 100%;
            box-sizing: border-box;
            margin-top: 14px;
            padding: 10px;
            border: 1px solid #94a3b8;
            border-radius: 8px;
            font: inherit;
        }
        .mensagem-sistema-acoes {
            display: flex;
            justify-content: flex-end;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 20px;
        }
        .mensagem-sistema-acoes button {
            border: 0;
            border-radius: 8px;
            padding: 9px 15px;
            font: inherit;
            font-weight: 600;
            cursor: pointer;
            background: #e2e8f0;
            color: #1e293b;
        }
        .mensagem-sistema-acoes button[type="submit"] {
            background: #1d4ed8;
            color: #fff;
        }
        .mensagem-sistema button:focus-visible,
        .mensagem-sistema-campo:focus-visible {
            outline: 2px solid #2563eb;
            outline-offset: 2px;
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

function abrirDialogoSistema(texto, opcoes = {}) {
    garantirEstilosMensagemSistema();
    const tipo = inferirTipoMensagem(texto, opcoes.tipo);
    const titulos = { erro: "Verifique as informações", sucesso: "Tudo certo", info: "Informação" };
    const dialogo = document.createElement("dialog");
    dialogo.className = `mensagem-sistema ${tipo}`;
    dialogo.innerHTML = `
        <form>
            <h2 class="mensagem-sistema-titulo"></h2>
            <p class="mensagem-sistema-texto"></p>
            <div class="mensagem-sistema-acoes"></div>
        </form>
    `;
    const titulo = dialogo.querySelector("h2");
    const descricao = dialogo.querySelector("p");
    const formulario = dialogo.querySelector("form");
    const acoes = dialogo.querySelector(".mensagem-sistema-acoes");
    titulo.textContent = opcoes.titulo || titulos[tipo];
    descricao.textContent = String(texto ?? "");
    const identificador = `dialogo-sistema-${++sequenciaDialogoSistema}`;
    titulo.id = `${identificador}-titulo`;
    descricao.id = `${identificador}-descricao`;
    dialogo.setAttribute("aria-labelledby", titulo.id);
    dialogo.setAttribute("aria-describedby", descricao.id);
    dialogo.addEventListener("keydown", evento => {
        if (evento.key === "Escape") evento.stopPropagation();
    });

    let campo;
    if (opcoes.campo) {
        campo = document.createElement("input");
        campo.type = "text";
        campo.className = "mensagem-sistema-campo";
        campo.setAttribute("aria-labelledby", descricao.id);
        formulario.insertBefore(campo, acoes);
    }

    let cancelar;
    if (opcoes.cancelavel) {
        cancelar = document.createElement("button");
        cancelar.type = "button";
        cancelar.textContent = "Cancelar";
        cancelar.addEventListener("click", () => dialogo.close());
        acoes.appendChild(cancelar);
    }
    const confirmar = document.createElement("button");
    confirmar.type = "submit";
    confirmar.textContent = opcoes.textoBotao || "OK";
    acoes.appendChild(confirmar);
    (campo || cancelar || confirmar).autofocus = true;

    const resultado = new Promise(resolve => {
        formulario.addEventListener("submit", evento => {
            evento.preventDefault();
            dialogo.close("confirmado");
        });
        dialogo.addEventListener("close", () => {
            dialogo.remove();
            resolve(dialogo.returnValue === "confirmado" ? (campo ? campo.value : true) : null);
        }, { once: true });
    });

    document.body.appendChild(dialogo);
    dialogo.showModal();
    return { dialogo, resultado };
}

let sequenciaDialogoSistema = 0;

function mostrarMensagem(texto, opcoes = {}) {
    if (!document.body) return;
    if (mensagemSistemaAtual?.open) mensagemSistemaAtual.close("substituido");

    const { dialogo, resultado } = abrirDialogoSistema(texto, opcoes);
    mensagemSistemaAtual = dialogo;
    const timer = Number(opcoes.duracaoMs) > 0
        ? setTimeout(() => dialogo.close(), Number(opcoes.duracaoMs))
        : null;
    void resultado.then(() => {
        clearTimeout(timer);
        if (mensagemSistemaAtual === dialogo) mensagemSistemaAtual = null;
        if (dialogo.returnValue !== "substituido" && typeof opcoes.aoFechar === "function") {
            setTimeout(opcoes.aoFechar, 20);
        }
    });
}

async function confirmarAcao(texto) {
    const { resultado } = abrirDialogoSistema(texto, {
        titulo: "Confirmar ação", textoBotao: "Confirmar", cancelavel: true
    });
    return (await resultado) === true;
}

function solicitarTexto(texto) {
    return abrirDialogoSistema(texto, {
        titulo: "Informação necessária", textoBotao: "Continuar", cancelavel: true, campo: true
    }).resultado;
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

    const preencher = (id, valor, sobrescrever = false) => {
        const campo = document.getElementById(id);
        if (!campo || valor == null || valor === "") return;

        if (sobrescrever || !String(campo.value || "").trim()) {
            campo.value = valor;
        }
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

    const consultarCep = async (forcar = false, sobrescrever = false) => {
        const cep = normalizarCepNoCampo();

        if (cep.length !== 8) return false;
        if (!forcar && cep === ultimoCepConsultado) return true;
        if (consultaEmAndamento && cep === ultimoCepConsultado) return true;

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

                return false;
            }

            preencher("endereco", endereco.logradouro || "", sobrescrever);
            preencher("bairro", endereco.bairro || "", sobrescrever);
            preencher("cidade", endereco.localidade || "", sobrescrever);
            preencher("estado", endereco.uf || "", sobrescrever);
            limparEstadoVisual();

            return true;
        } catch (erro) {
            if (erro?.name === "AbortError") return false;

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

            return false;
        } finally {
            consultaEmAndamento = false;
        }
    };

    window.consultarCepCliente = (opcoes = {}) =>
        consultarCep(
            Boolean(opcoes.forcar),
            Boolean(opcoes.sobrescrever)
        );

    window.completarEnderecoPeloCep = async () => {
        const sucesso = await window.consultarCepCliente({
            forcar: true,
            sobrescrever: false
        });

        if (sucesso) {
            mostrarMensagem(
                "Endereço conferido pelo CEP. Revise os dados e salve o cliente."
            );
        }
    };

    // Esta é a única rotina responsável pelos eventos automáticos de CEP.
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
