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

function mostrarMensagem(texto) {

    alert(texto);

}