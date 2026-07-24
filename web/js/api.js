function resolveApiBase() {
    if (window.__API_URL__) {
        return window.__API_URL__;
    }

    const host = window.location.hostname;

    if (host === "localhost" || host === "127.0.0.1") {
        return "http://localhost:3000/api";
    }

    return "https://sistema-elizeu-api.onrender.com/api";
}

const API = resolveApiBase();
const TOKEN_KEY = "token";

function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
}

function removeToken() {
    localStorage.removeItem(TOKEN_KEY);
}

async function request(url, options = {}) {
    const headers = {
        ...(options.headers || {})
    };

    if (options.body) {
        headers["Content-Type"] = "application/json";
    }

    const token = getToken();

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    let response;

    try {
        response = await fetch(`${API}${url}`, {
            ...options,
            headers
        });
    } catch (error) {
        throw new Error("Não foi possível conectar com a API.");
    }

    let data;

    try {
        data = await response.json();
    } catch {
        data = {
            sucesso: false,
            mensagem: "A API retornou uma resposta inválida."
        };
    }

    const estaNaTelaLogin =
        window.location.pathname.includes("login.html");

    if (response.status === 401 && !estaNaTelaLogin) {
        removeToken();
        localStorage.removeItem("usuario");
        window.location.href = "login.html";
        return null;
    }

    return data;
}

async function get(url) {
    return request(url);
}

async function post(url, body) {
    return request(url, {
        method: "POST",
        body: JSON.stringify(body)
    });
}

async function put(url, body) {
    return request(url, {
        method: "PUT",
        body: JSON.stringify(body)
    });
}

async function del(url) {
    return request(url, {
        method: "DELETE"
    });
}