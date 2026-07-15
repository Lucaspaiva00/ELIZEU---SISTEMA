const sidebar = document.querySelector(".sidebar");

function abrirMenu() {

    sidebar.classList.add("active");

}

function fecharMenu() {

    sidebar.classList.remove("active");

}

function toggleMenu() {

    sidebar.classList.toggle("active");

}