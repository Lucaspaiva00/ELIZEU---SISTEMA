function verificarLogin() {

    const token = localStorage.getItem("token");

    if (!token) {
        window.location.href = "login.html";
    }

}

function logout() {

    localStorage.removeItem("token");

    window.location.href = "login.html";

}

document.addEventListener("DOMContentLoaded", () => {

    if (!window.location.pathname.includes("login")) {

        verificarLogin();

    }

});