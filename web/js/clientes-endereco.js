// Complemento opt-in de endereços incompletos já cadastrados.
// Não sobrescreve campos corretos nem altera dados sem o usuário salvar.
async function completarEnderecoPeloCep() {
    const valor = (id) => String(document.getElementById(id)?.value || "").trim();
    const cep = valor("cep").replace(/\D/g, "");
    if (cep.length !== 8) {
        mostrarMensagem("Informe o CEP completo (8 dígitos) para completar o endereço.");
        return;
    }
    const botao = document.getElementById("btnCompletarEnderecoCep");
    if (botao) botao.disabled = true;
    const controlador = new AbortController();
    const limite = setTimeout(() => controlador.abort(), 5000);
    try {
        const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
            signal: controlador.signal
        });
        if (!resposta.ok) throw new Error("Consulta ao CEP indisponível.");
        const endereco = await resposta.json();
        if (endereco.erro) throw new Error("CEP não encontrado.");

        const campo = (id) => document.getElementById(id);
        const preencherSeVazio = (id, dado) => {
            if (campo(id) && !valor(id) && dado) campo(id).value = dado;
        };
        preencherSeVazio("endereco", endereco.logradouro);
        preencherSeVazio("bairro", endereco.bairro);
        preencherSeVazio("cidade", endereco.localidade);
        preencherSeVazio("estado", endereco.uf);

        // Remove duplicação textual apenas se o endereço termina no mesmo
        // bairro do campo separado: "Rua X, 10, Setor Y" => "Rua X, 10".
        const rua = valor("endereco");
        const bairro = valor("bairro");
        const limpar = (texto) => texto.normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
        if (rua && bairro && limpar(rua).endsWith(limpar(bairro))) {
            const antes = rua.slice(0, rua.length - bairro.length)
                .replace(/[\s,;\-–—]+$/, "").trim();
            if (antes && antes !== rua) campo("endereco").value = antes;
        }
        mostrarMensagem("Endereço conferido. Verifique os dados e clique em Salvar Cliente para gravá-los.");
    } catch (erro) {
        mostrarMensagem(erro.message || "Não foi possível consultar o CEP.");
    } finally {
        clearTimeout(limite);
        if (botao) botao.disabled = false;
    }
}
