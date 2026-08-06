const crypto = require("crypto");

function obterChave() {
    const segredo = process.env.CERTIFICATE_ENCRYPTION_KEY;

    if (!segredo || segredo.length < 32) {
        throw new Error(
            "Configure CERTIFICATE_ENCRYPTION_KEY no ambiente com pelo menos 32 caracteres."
        );
    }

    return crypto.createHash("sha256").update(segredo).digest();
}

function criptografarCertificado(conteudo) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", obterChave(), iv);
    const criptografado = Buffer.concat([
        cipher.update(JSON.stringify(conteudo), "utf8"),
        cipher.final()
    ]);

    return {
        conteudoCriptografado: criptografado.toString("base64"),
        iv: iv.toString("base64"),
        authTag: cipher.getAuthTag().toString("base64")
    };
}

module.exports = { criptografarCertificado };
