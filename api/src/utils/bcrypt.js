const bcrypt = require("bcryptjs");

async function gerarHash(senha) {
    return await bcrypt.hash(senha, 10);
}

async function compararHash(senha, hash) {
    return await bcrypt.compare(senha, hash);
}

module.exports = {
    gerarHash,
    compararHash
};