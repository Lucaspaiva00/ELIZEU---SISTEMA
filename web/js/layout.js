async function carregarLayout() {

    const sidebar = document.getElementById("sidebar");

    if (sidebar) {

        const html = await fetch("partials/sidebar.html");

        sidebar.innerHTML = await html.text();

    }

    const topbar = document.getElementById("topbar");

    if (topbar) {

        const html = await fetch("partials/topbar.html");

        topbar.innerHTML = await html.text();

    }

}

document.addEventListener("DOMContentLoaded", carregarLayout);