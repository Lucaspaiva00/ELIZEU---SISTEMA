let vendas = [];
let vendaAtualId = null;

const statusVenda = {
    CONFIRMADA: { texto: "Aguardando faturamento", classe: "badge-warning" },
    FATURADA: { texto: "Faturada", classe: "badge-success" },
    CANCELADA: { texto: "Cancelada", classe: "badge-danger" }
};


const statusNfe = {
    PENDENTE_CONFIGURACAO: { texto: "Pendente", classe: "badge-warning" },
    PRONTA_TRANSMISSAO: { texto: "Pronta para transmissão", classe: "badge-info" },
    TRANSMITINDO: { texto: "Transmitindo", classe: "badge-info" },
    AUTORIZADA: { texto: "NF-e autorizada", classe: "badge-success" },
    REJEITADA: { texto: "Rejeitada", classe: "badge-danger" },
    ERRO: { texto: "Erro", classe: "badge-danger" },
    CANCELADA: { texto: "Cancelada", classe: "badge-secondary" }
};

function fiscalVenda(venda) {
    if (venda.notaFiscal) {
        return statusNfe[venda.notaFiscal.status] || {
            texto: venda.notaFiscal.status,
            classe: "badge-secondary"
        };
    }

    if (venda.status === "FATURADA") {
        return { texto: "Não emitida", classe: "badge-warning" };
    }

    return { texto: "—", classe: "badge-secondary" };
}

function htmlPendenciasFiscal(pendencias) {
    if (!pendencias?.length) return "";

    const itens = pendencias.map(p => `<li style="margin-bottom:6px;">${esc(p.mensagem)}</li>`).join("");
    return `
        <div class="alert alert-warning" style="margin:0;">
            <strong>Antes de emitir:</strong>
            <ul style="margin:8px 0 0 20px;">${itens}</ul>
            <div style="margin-top:10px;">
                <a href="empresas.html" class="btn btn-light btn-sm">
                    <i class="fas fa-building"></i> Configuração da empresa
                </a>
                <a href="produtos.html" class="btn btn-light btn-sm">
                    <i class="fas fa-box"></i> Produtos
                </a>
                <a href="clientes.html" class="btn btn-light btn-sm">
                    <i class="fas fa-user"></i> Clientes
                </a>
            </div>
        </div>
    `;
}

const formasPagamento = {
    DINHEIRO: "Dinheiro", PIX: "PIX", CARTAO_CREDITO: "Cartão de crédito",
    CARTAO_DEBITO: "Cartão de débito", BOLETO: "Boleto", TRANSFERENCIA: "Transferência",
    CHEQUE: "Cheque", CREDITO_LOJA: "Crédito loja", OUTRO: "Outro"
};

function esc(v) {
    return String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function fmtData(v) {
    if (!v) return "—";
    return new Date(v).toLocaleDateString("pt-BR");
}

function fmtMoeda(v) {
    return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

document.addEventListener("DOMContentLoaded", carregarVendas);

async function carregarVendas() {
    try {
        const r = await get("/vendas");
        if (!r?.sucesso) return mostrarMensagem(r?.mensagem || "Erro ao carregar vendas.");
        vendas = r.vendas || [];
        renderizarVendas(vendas);
    } catch (e) {
        console.error(e);
        mostrarMensagem(e.message || "Erro ao carregar vendas.");
    }
}

function renderizarVendas(lista) {
    const tbody = document.getElementById("tabelaVendas");
    tbody.innerHTML = "";
    if (!lista.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">Nenhuma venda gerada.</td></tr>';
        return;
    }
    for (const v of lista) {
        const st = statusVenda[v.status] || { texto: v.status, classe: "badge-secondary" };
        const fiscal = fiscalVenda(v);
        const materiais = (v.itens || []).some(item => item.tipo === "PRODUTO");
        const servicos = (v.itens || []).some(item => item.tipo === "SERVICO");
        const notaServico = v.notaFiscalServico;
        const fiscalServico = notaServico ? statusNfe[notaServico.status] : null;
        const badges = [];
        if (materiais || v.notaFiscal) badges.push(`<span class="badge ${fiscal.classe}">NF-e · ${esc(fiscal.texto.replace(/^NF-e /, ""))}</span>`);
        if (servicos || notaServico) badges.push(`<span class="badge ${fiscalServico?.classe || fiscal.classe}">NFS-e · ${esc(fiscalServico?.texto.replace(/^NF-e /, "") || notaServico?.status || (v.status === "FATURADA" ? "Não emitida" : "—"))}</span>`);
        tbody.innerHTML += `<tr>
            <td><strong>#${String(v.numero).padStart(5, "0")}</strong></td>
            <td>${v.orcamento?.numero ? `#${String(v.orcamento.numero).padStart(5, "0")}` : "—"}</td>
            <td>${esc(v.cliente?.nome || "—")}</td>
            <td>${fmtData(v.dataVenda)}</td>
            <td><strong>${fmtMoeda(v.total)}</strong></td>
            <td><span class="badge ${st.classe}">${st.texto}</span></td>
            <td>${badges.join(" ") || '<span class="badge badge-secondary">—</span>'}</td>
            <td><div class="table-actions">
                <button class="btn btn-light" onclick="visualizarVenda(${v.id})" title="Visualizar"><i class="fas fa-eye"></i></button>
                ${v.status === "CONFIRMADA" ? `<button class="btn btn-success" onclick="faturarVenda(${v.id})" title="Faturar"><i class="fas fa-file-invoice-dollar"></i></button>` : ""}
                ${v.status === "FATURADA" ? `<button class="btn btn-primary" onclick="abrirFiscalVenda(${v.id})" title="Abrir aba Fiscal" aria-label="Abrir aba Fiscal"><i class="fas fa-file-invoice" aria-hidden="true"></i></button>` : ""}
            </div></td>
        </tr>`;
    }
}

async function abrirFiscalVenda(id) {
    await visualizarVenda(id);
    if (vendaAtualId !== id) return;
    document.querySelector('#modalVenda [data-modal-tab="fiscal"]')?.click();
}

function filtrarVendas() {
    const q = document.getElementById("pesquisaVenda").value.trim().toLowerCase();
    if (!q) return renderizarVendas(vendas);
    renderizarVendas(vendas.filter(v => String(v.numero).includes(q) || String(v.orcamento?.numero || "").includes(q) || String(v.cliente?.nome || "").toLowerCase().includes(q)));
}

function htmlNfse(nota) {
    if (!nota) return '<p>Nenhuma NFS-e registrada para esta venda.</p>';

    const retorno = nota.respostaApi;
    const chave = retorno?.chaveAcesso;
    const autorizada = nota.status === "AUTORIZADA" && chave && (nota.xmlNfse || retorno?.nfseXmlGZipB64);
    const status = autorizada ? "Autorizada pela SEFIN Nacional" : ({
        AUTORIZADA: "Autorização sem documento disponível",
        REJEITADA: "Rejeitada pela SEFIN Nacional",
        PRONTA_TRANSMISSAO: "Aguardando transmissão ou retorno",
        PENDENTE_CONFIGURACAO: "Configuração pendente",
        ERRO: "Erro na emissão"
    }[nota.status] || nota.status);
    const detalhes = [
        ["Status", status],
        ["Ambiente", nota.ambiente === "PRODUCAO" ? "Produção" : "Produção restrita / homologação"],
        ["Série da DPS", nota.serieDps],
        ["Número da DPS", nota.numeroDps],
        ["Chave de acesso", chave],
        ["Transmitida em", nota.transmitidaEm && new Date(nota.transmitidaEm).toLocaleString("pt-BR")],
        ["Autorizada em", nota.autorizadaEm && new Date(nota.autorizadaEm).toLocaleString("pt-BR")]
    ];
    const painel = (titulo, valor, aberto = false) => valor
        ? `<details${aberto ? " open" : ""}><summary>${titulo}</summary><pre style="white-space:pre-wrap;overflow-wrap:anywhere;">${esc(valor)}</pre></details>`
        : "";
    const respostaVisivel = retorno == null ? null : JSON.stringify(retorno, (campo, valor) =>
        /nfseXmlGZipB64|token|senha|passphrase|private.?key|chave.?privada|certificado|authorization/i.test(campo) ? undefined : valor, 2);
    return `
        <dl>${detalhes.filter(([, valor]) => valor != null && valor !== "").map(([rotulo, valor]) =>
            `<dt>${rotulo}</dt><dd>${esc(String(valor))}</dd>`).join("")}</dl>
        ${painel("Resposta da SEFIN Nacional", respostaVisivel, !autorizada)}
        ${retorno == null ? painel("Detalhe do status", nota.motivoStatus, true) : ""}
        ${painel("XML da DPS assinada", nota.xmlDps)}
        ${painel("XML da NFS-e autorizada", nota.xmlNfse)}
    `;
}

function exibirDadosObra(area, obra = {}) {
    const formulario = document.createElement("form");
    formulario.id = "formDadosObraNfse";
    formulario.className = "modal-section-card";
    formulario.innerHTML = `
        <h3>Dados da obra</h3>
        <p>Informe o município onde a obra foi executada e uma forma de identificá-la.</p>
        <div class="form-group">
            <label for="nfseObraMunicipio">Código IBGE do município da obra</label>
            <input id="nfseObraMunicipio" class="form-control" name="codigoMunicipio" inputmode="numeric" pattern="[1-9][0-9]{6}" maxlength="7" required>
        </div>
        <div class="form-group">
            <label for="nfseObraTipo">Forma de identificação</label>
            <select id="nfseObraTipo" class="form-control" name="tipo" required>
                <option value="">Selecione</option>
                <option value="cObra">CNO ou CEI</option>
                <option value="cCIB">CIB do imóvel</option>
                <option value="end">Endereço da obra</option>
            </select>
        </div>
        <fieldset data-obra-codigo hidden disabled>
            <div class="form-group">
                <label for="nfseObraCodigo">CNO ou CEI</label>
                <input id="nfseObraCodigo" class="form-control" name="codigo" required>
            </div>
        </fieldset>
        <fieldset data-obra-endereco hidden disabled>
            <div class="row">
                <div class="col form-group"><label for="nfseObraCep">CEP</label><input id="nfseObraCep" class="form-control" name="cep" inputmode="numeric" pattern="[0-9]{5}-?[0-9]{3}" maxlength="9" required></div>
                <div class="col form-group"><label for="nfseObraRua">Logradouro</label><input id="nfseObraRua" class="form-control" name="logradouro" maxlength="255" required></div>
                <div class="col form-group"><label for="nfseObraNumero">Número</label><input id="nfseObraNumero" class="form-control" name="numero" maxlength="60" required></div>
            </div>
            <div class="row">
                <div class="col form-group"><label for="nfseObraBairro">Bairro</label><input id="nfseObraBairro" class="form-control" name="bairro" maxlength="60" required></div>
                <div class="col form-group"><label for="nfseObraComplemento">Complemento</label><input id="nfseObraComplemento" class="form-control" name="complemento" maxlength="156"></div>
            </div>
        </fieldset>
    `;
    const tipo = formulario.elements.namedItem("tipo");
    const grupoCodigo = formulario.querySelector("[data-obra-codigo]");
    const grupoEndereco = formulario.querySelector("[data-obra-endereco]");
    const codigo = formulario.elements.namedItem("codigo");
    const ajustarCampos = () => {
        const endereco = tipo.value === "end";
        grupoEndereco.hidden = grupoEndereco.disabled = !endereco;
        grupoCodigo.hidden = grupoCodigo.disabled = !tipo.value || endereco;
        const cib = tipo.value === "cCIB";
        grupoCodigo.querySelector("label").textContent = cib ? "CIB do imóvel" : "CNO ou CEI";
        codigo.maxLength = cib ? 8 : 30;
        codigo.pattern = cib ? "[A-Za-z0-9]{8}" : ".{1,30}";
    };
    for (const [chave, valor] of Object.entries(obra)) {
        const campo = formulario.elements.namedItem(chave);
        if (campo) campo.value = valor ?? "";
    }
    tipo.addEventListener("change", ajustarCampos);
    formulario.addEventListener("submit", evento => evento.preventDefault());
    ajustarCampos();
    area.append(formulario);
}

async function carregarNfseVenda(id, area) {
    const r = await get(`/vendas/${id}/nfse/validar`);
    if (vendaAtualId !== id || !area.isConnected) return;

    area.innerHTML = r?.sucesso ? htmlNfse(r.notaFiscalServico)
        : `<p>${esc(r?.mensagem || "Não foi possível consultar a NFS-e desta venda.")}</p>`;
    if (r?.sucesso && r.obraObrigatoria && r.notaFiscalServico?.status !== "AUTORIZADA") {
        exibirDadosObra(area, r.notaFiscalServico?.dadosEmissao?.obra);
    }
    if (r?.sucesso && r.notaFiscalServico?.status === "AUTORIZADA") {
        document.getElementById("btnEmitirNfse").style.display = "none";
    }
}

async function visualizarVenda(id) {
    const r = await get(`/vendas/${id}`);
    if (!r?.sucesso) return mostrarMensagem(r?.mensagem || "Venda não encontrada.");
    const v = r.venda;
    vendaAtualId = v.id;
    const st = statusVenda[v.status] || { texto: v.status };
    document.getElementById("tituloVenda").textContent = `Venda #${String(v.numero).padStart(5, "0")}`;
    document.getElementById("viewVendaNumero").value = `#${String(v.numero).padStart(5, "0")}`;
    document.getElementById("viewVendaOrcamento").value = v.orcamento?.numero ? `#${String(v.orcamento.numero).padStart(5, "0")}` : "—";
    document.getElementById("viewVendaCliente").value = v.cliente?.nome || "—";
    document.getElementById("viewVendaStatus").value = st.texto;
    document.getElementById("viewVendaPagamento").value = formasPagamento[v.formaPagamento] || v.formaPagamento;
    document.getElementById("viewVendaParcelas").value = `${v.quantidadeParcelas}x`;
    document.getElementById("viewVendaVencimento").value = fmtData(v.primeiroVencimento);
    document.getElementById("viewVendaTotal").value = fmtMoeda(v.total);
    document.getElementById("viewVendaItens").innerHTML = (v.itens || []).map(i => `<tr><td>${esc(i.descricao)}</td><td>${Number(i.quantidade)}</td><td>${fmtMoeda(i.valorUnitario)}</td><td>${esc(i.observacao || "—")}</td><td>${fmtMoeda(i.total)}</td></tr>`).join("") || '<tr><td colspan="5">Sem itens.</td></tr>';

    document.getElementById("viewVendaCustoItens").value = fmtMoeda(v.custoItensTotal || 0);
    document.getElementById("viewVendaCustoInterno").value = fmtMoeda(v.custoInternoTotal || 0);
    document.getElementById("viewVendaLucro").value = fmtMoeda(v.lucroEstimado || 0);

    const realizado = v.rentabilidadeRealizada || {};
    document.getElementById("viewVendaValorRecebido").textContent = fmtMoeda(realizado.valorRecebido || 0);
    document.getElementById("viewVendaCustosPagos").textContent = fmtMoeda(realizado.custosInternosPagos || 0);
    document.getElementById("viewVendaLucroRealizado").textContent = fmtMoeda(realizado.lucroRealizado || 0);
    document.getElementById("viewVendaMargemRealizada").textContent = `${Number(realizado.margemRealizada || 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;

    document.getElementById("viewVendaCustosInternos").innerHTML = Array.isArray(v.custosInternos) && v.custosInternos.length
        ? v.custosInternos.map(c => `<tr><td>${esc(c.categoria || "OUTRO")}</td><td>${esc(c.descricao || "-")}</td><td>${Number(c.quantidade || 0)}</td><td>${fmtMoeda(c.valorUnitario || 0)}</td><td>${fmtMoeda(c.total || 0)}</td></tr>`).join("")
        : '<tr><td colspan="5" class="text-center">Nenhuma despesa interna lançada.</td></tr>';

    document.getElementById("viewVendaParcelasTabela").innerHTML = (v.contasReceber || []).map(c => `<tr><td>${c.parcelaNumero}/${c.totalParcelas}</td><td>${fmtData(c.dataVencimento)}</td><td>${fmtMoeda(c.valorOriginal)}</td><td>${fmtMoeda(c.valorRecebido || 0)}</td><td>${esc(c.status)}</td></tr>`).join("") || '<tr><td colspan="5">As contas a receber serão geradas no faturamento.</td></tr>';

    document.getElementById("viewVendaContasPagar").innerHTML = (v.contasPagar || []).map(c => `<tr><td>${esc(c.descricao || "Custo interno")}</td><td>${fmtData(c.dataVencimento)}</td><td>${fmtMoeda(c.valorOriginal)}</td><td>${fmtMoeda(c.valorPago || 0)}</td><td>${esc(c.status)}</td></tr>`).join("") || '<tr><td colspan="5" class="text-center">Os custos internos serão lançados em Contas a Pagar no faturamento.</td></tr>';
    const fiscal = fiscalVenda(v);
    const fiscalStatus = document.getElementById("viewVendaFiscalStatus");
    const fiscalPendencias = document.getElementById("viewVendaFiscalPendencias");

    if (v.notaFiscal) {
        const nfe = v.notaFiscal;
        const detalhes = [];
        detalhes.push(`NF-e modelo 55 • Série ${nfe.serie} • Nº ${nfe.numero}`);
        detalhes.push(`Ambiente ${nfe.ambiente === "PRODUCAO" ? "Produção" : "Homologação"}`);
        if (nfe.chaveAcesso) detalhes.push(`Chave: ${esc(nfe.chaveAcesso)}`);
        if (nfe.protocolo) detalhes.push(`Protocolo: ${esc(nfe.protocolo)}`);

        fiscalStatus.innerHTML = `
            <strong>${esc(fiscal.texto)}</strong>
            <div style="margin-top:8px;line-height:1.65;">${detalhes.join("<br>")}</div>
            ${nfe.motivoStatus ? `<div class="alert alert-warning" style="margin-top:10px;">${esc(nfe.motivoStatus)}</div>` : ""}
        `;
        fiscalPendencias.style.display = "none";
        fiscalPendencias.innerHTML = "";
    } else if (v.status === "FATURADA") {
        fiscalStatus.innerHTML = '<strong>NF-e ainda não emitida.</strong><div class="text-muted" style="margin-top:6px;">Confira as pendências antes de transmitir a NF-e à SEFAZ.</div>';
        fiscalPendencias.style.display = "none";
        fiscalPendencias.innerHTML = "";
    } else {
        fiscalStatus.innerHTML = '<span class="text-muted">A NF-e fica disponível depois do faturamento.</span>';
        fiscalPendencias.style.display = "none";
        fiscalPendencias.innerHTML = "";
    }

    const nfe = v.notaFiscal;
    const temProdutos = (v.itens || []).some(i => i.tipo === "PRODUTO");
    const temServicos = (v.itens || []).some(i => i.tipo === "SERVICO");
    const painelFiscal = fiscalStatus.closest("[data-modal-panel='fiscal']");
    painelFiscal.querySelector("#viewVendaNfse")?.remove();
    painelFiscal.querySelector(".modal-section-head p").textContent = "Acompanhe separadamente a NF-e de materiais e a NFS-e de serviços.";
    painelFiscal.querySelector("#viewVendaFiscal").closest(".modal-section-card").hidden = !temProdutos && !nfe;
    if (temProdutos && ["CONFIRMADA", "FATURADA"].includes(v.status) && !nfe) {
        const botaoPrevia = document.createElement("button");
        botaoPrevia.type = "button";
        botaoPrevia.className = "btn btn-light btn-sm";
        botaoPrevia.style.marginTop = "10px";
        botaoPrevia.textContent = "Gerar prévia da NF-e de homologação";
        botaoPrevia.addEventListener("click", async () => {
            botaoPrevia.disabled = true;
            try {
                const resposta = await get(`/vendas/${v.id}/nfe/previsualizar`);
                if (vendaAtualId !== v.id || !botaoPrevia.isConnected) return;
                if (!resposta?.sucesso) {
                    return mostrarMensagem(resposta?.mensagem || "Não foi possível gerar a prévia da NF-e.", { tipo: "erro" });
                }
                if (!resposta.pronta) {
                    fiscalPendencias.innerHTML = htmlPendenciasFiscal(resposta.pendencias);
                    fiscalPendencias.style.display = "block";
                    return;
                }
                fiscalPendencias.innerHTML = '<h4>Prévia XML · Homologação</h4><p>Sem assinatura, sem transmissão e sem reserva de numeração.</p>';
                const xml = document.createElement("pre");
                xml.style.whiteSpace = "pre-wrap";
                xml.style.overflowWrap = "anywhere";
                xml.textContent = resposta.xml;
                fiscalPendencias.append(xml);
                if (v.status === "CONFIRMADA" && window.temPermissao?.("fiscal.emitir")) {
                    const testar = document.createElement("button");
                    testar.type = "button";
                    testar.className = "btn btn-primary btn-sm";
                    testar.textContent = "Transmitir teste em homologação";
                    const resultado = document.createElement("p");
                    resultado.setAttribute("aria-live", "polite");
                    testar.addEventListener("click", async () => {
                        testar.disabled = true;
                        try {
                            if (!await confirmarAcao("Transmitir à SEFAZ Goiás em homologação, sem valor fiscal?")) return;
                            const retorno = await post(`/vendas/${v.id}/nfe/testar-autorizacao`, {});
                            if (!testar.isConnected || vendaAtualId !== v.id) return;
                            if (!retorno?.sucesso || !retorno.pronta) {
                                resultado.textContent = retorno?.mensagem || retorno?.pendencias?.map(item => item.mensagem).join(" ") || "Erro ao transmitir o teste.";
                                return;
                            }
                            resultado.textContent = [
                                retorno.autorizada ? "NF-e autorizada em homologação" : "Autorização não confirmada",
                                retorno.httpStatus && `HTTP ${retorno.httpStatus}`,
                                retorno.codigo && `SEFAZ ${retorno.codigo}`, retorno.motivo,
                                retorno.protocolo && `Protocolo ${retorno.protocolo}`,
                                retorno.recibo && `Recibo ${retorno.recibo}`
                            ].filter(Boolean).join(" · ");
                            if (retorno.autorizada || retorno.recibo) testar.dataset.transmitida = "1";
                        } finally {
                            testar.disabled = testar.dataset.transmitida === "1";
                        }
                    });
                    fiscalPendencias.append(testar, resultado);
                }
                fiscalPendencias.style.display = "block";
            } finally {
                botaoPrevia.disabled = false;
            }
        });
        fiscalStatus.append(botaoPrevia);
    }
    if (temProdutos && v.status === "FATURADA" && (!nfe || nfe.status === "PRONTA_TRANSMISSAO") && window.temPermissao?.("fiscal.emitir")) {
        const emitir = document.createElement("button");
        emitir.type = "button";
        emitir.className = "btn btn-primary btn-sm";
        emitir.style.marginTop = "10px";
        emitir.textContent = "Emitir NF-e de mercadorias em produção";
        emitir.addEventListener("click", async () => {
            emitir.disabled = true;
            try {
                if (!await confirmarAcao(`Emitir a NF-e real da venda #${String(v.numero).padStart(5, "0")} para ${v.cliente?.nome || "o destinatário desta venda"}?`)) return;
                const resposta = await post(`/vendas/${v.id}/nfe/emitir`, {});
                if (vendaAtualId !== v.id) return;
                await carregarVendas();
                await abrirFiscalVenda(v.id);
                const nota = resposta?.notaFiscal;
                if (nota?.status === "AUTORIZADA" && nota.protocolo) {
                    return mostrarMensagem(`NF-e autorizada pela SEFAZ. Protocolo ${nota.protocolo}.`, { tipo: "sucesso" });
                }
                const detalhe = resposta?.pendencias?.map(item => item.mensagem).join("\n") || nota?.motivoStatus || resposta?.mensagem;
                mostrarMensagem(detalhe || "Autorização da NF-e ainda não confirmada. Confira a aba Fiscal.", { tipo: "erro" });
            } finally {
                emitir.disabled = false;
            }
        });
        fiscalStatus.append(emitir);
    }
    if (nfe?.chaveAcesso && window.temPermissao?.("fiscal.visualizar")) {
        const consultar = document.createElement("button");
        consultar.type = "button";
        consultar.className = "btn btn-light btn-sm";
        consultar.style.marginTop = "10px";
        consultar.textContent = "Consultar situação na SEFAZ";
        consultar.addEventListener("click", async () => {
            consultar.disabled = true;
            try {
                const resposta = await post(`/vendas/${v.id}/nfe/consultar`, {});
                if (vendaAtualId !== v.id) return;
                if (!resposta?.sucesso) {
                    return mostrarMensagem(resposta?.mensagem || "Não foi possível consultar a SEFAZ.", { tipo: "erro" });
                }
                const consulta = resposta.consulta;
                if (!consulta) return mostrarMensagem("A consulta à SEFAZ ainda está sendo publicada.");
                await carregarVendas();
                if (vendaAtualId === v.id) await abrirFiscalVenda(v.id);
                mostrarMensagem([
                    consulta.httpStatus && `HTTP ${consulta.httpStatus}`,
                    consulta.codigo && `SEFAZ ${consulta.codigo}`,
                    consulta.motivo,
                    consulta.autorizada && `Protocolo ${consulta.protocolo}`
                ].filter(Boolean).join("\n") || "A SEFAZ não retornou um status fiscal.", {
                    tipo: consulta.autorizada ? "sucesso" : "info"
                });
            } finally {
                consultar.disabled = false;
            }
        });
        fiscalStatus.append(consultar);
    }
    if (temServicos || v.notaFiscalServico) {
        painelFiscal.insertAdjacentHTML("beforeend", '<section id="viewVendaNfse" class="modal-section-card"><h3>NFS-e Serviços</h3><div data-nfse-status aria-live="polite">Consultando NFS-e…</div></section>');
        void carregarNfseVenda(v.id, painelFiscal.querySelector("[data-nfse-status]"));
    }
    document.getElementById("btnEmitirNfe").style.display =
        v.status === "FATURADA" && temProdutos && (!nfe || ["PRONTA_TRANSMISSAO", "REJEITADA", "ERRO"].includes(nfe.status)) ? "inline-flex" : "none";
    document.getElementById("btnEmitirNfse").style.display =
        v.status === "FATURADA" && temServicos && (!v.notaFiscalServico || ["PRONTA_TRANSMISSAO", "REJEITADA", "ERRO","PENDENTE_CONFIGURACAO"].includes(v.notaFiscalServico.status)) ? "inline-flex" : "none";
    document.getElementById("btnDanfeNfe").style.display = nfe?.caminhoDanfe ? "inline-flex" : "none";
    document.getElementById("btnXmlNfe").style.display = nfe?.caminhoXml ? "inline-flex" : "none";

    document.getElementById("btnFaturarVenda").style.display = v.status === "CONFIRMADA" ? "inline-flex" : "none";
    document.getElementById("btnCancelarVenda").style.display = v.status === "CONFIRMADA" ? "inline-flex" : "none";
    document.getElementById("modalVenda").classList.add("active");
}

function fecharVenda() {
    document.getElementById("modalVenda").classList.remove("active");
    vendaAtualId = null;
}

async function faturarVenda(id) {
    if (!await confirmarAcao("Faturar esta venda? Isso fará a baixa de estoque, gerará as contas a receber e lançará os custos internos em Contas a Pagar.")) return;
    const r = await put(`/vendas/${id}/faturar`, {});
    if (!r?.sucesso) return mostrarMensagem(r?.mensagem || "Erro ao faturar venda.");
    mostrarMensagem(r.mensagem || "Venda faturada. Contas a receber, custos internos em Contas a Pagar e estoque atualizados.");
    await carregarVendas();
    if (vendaAtualId === id) await visualizarVenda(id);
}

function faturarVendaAtual() {
    if (vendaAtualId) faturarVenda(vendaAtualId);
}

async function cancelarVendaAtual() {
    if (!vendaAtualId) return;
    const motivo = await solicitarTexto("Motivo do cancelamento (opcional):");
    if (motivo === null) return;
    if (motivo === null) return;
    const r = await put(`/vendas/${vendaAtualId}/cancelar`, { motivo });
    if (!r?.sucesso) return mostrarMensagem(r?.mensagem || "Erro ao cancelar venda.");
    fecharVenda();
    mostrarMensagem("Venda cancelada.");
    carregarVendas();
}


async function verificarPendenciasNfe() {
    const id = vendaAtualId;
    if (!id) return;
    const resposta = await get(`/vendas/${id}/nfe/validar`);
    if (vendaAtualId !== id) return;
    if (!resposta?.sucesso) return mostrarMensagem(resposta?.mensagem || "Erro ao verificar a NF-e.");
    const area = document.getElementById("viewVendaFiscalPendencias");
    const pendencias = resposta.pendencias || [];
    area.innerHTML = htmlPendenciasFiscal(pendencias);
    area.style.display = pendencias.length ? "block" : "none";
    document.querySelector('#modalVenda [data-modal-tab="fiscal"]')?.click();
}

function notaAtual() { return vendas.find(item => item.id === vendaAtualId)?.notaFiscal || null; }
function abrirDanfeAtual() {
    const url = notaAtual()?.caminhoDanfe;
    if (!url) return mostrarMensagem("DANFE ainda não disponível.");
    window.open(url, "_blank", "noopener,noreferrer");
}
function abrirXmlAtual() {
    const url = notaAtual()?.caminhoXml;
    if (!url) return mostrarMensagem("XML ainda não disponível.");
    window.open(url, "_blank", "noopener,noreferrer");
}

async function emitirNfse(id) {
    const formulario = document.getElementById("formDadosObraNfse");
    let obra;
    if (formulario) {
        document.querySelector('#modalVenda [data-modal-tab="fiscal"]')?.click();
        if (!formulario.reportValidity()) return;
        obra = Object.fromEntries(new FormData(formulario));
    }
    const parametros = await get(`/vendas/${id}/nfse/parametros`);
    if (!parametros?.sucesso) {
        return mostrarMensagem(parametros?.mensagem || "Não foi possível consultar os parâmetros da NFS-e.");
    }

    const resposta = await post(`/vendas/${id}/nfse/emitir`, { obra });
    if (!resposta?.sucesso) {
        const pendencias = resposta?.pendencias || [];
        if (pendencias.length) {
            return mostrarMensagem("NFS-e bloqueada até finalizar:\n" + pendencias.map(p => "• " + p.mensagem).join("\n"));
        }
        return mostrarMensagem(resposta?.mensagem || "Erro ao preparar NFS-e.");
    }

    const nota = resposta.notaFiscalServico;
    const retorno = nota?.respostaApi || resposta.retorno;
    const autorizada = nota?.status === "AUTORIZADA" && retorno?.chaveAcesso && (nota.xmlNfse || retorno.nfseXmlGZipB64);
    const mensagem = autorizada ? "NFS-e autorizada pela SEFIN Nacional."
        : nota?.status === "REJEITADA" ? "NFS-e rejeitada pela SEFIN Nacional. Consulte a resposta na aba Fiscal."
        : "Autorização da NFS-e ainda não confirmada. Consulte a aba Fiscal.";
    await carregarVendas();
    if (vendaAtualId === id) {
        await visualizarVenda(id);
        document.querySelector('[data-modal-tab="fiscal"]')?.click();
    }
    mostrarMensagem(mensagem);
}
function emitirNfseAtual(){ if(vendaAtualId) emitirNfse(vendaAtualId); }
