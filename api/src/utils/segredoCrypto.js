const crypto = require("crypto");

function obterChave() {
    const segredo = process.env.CERTIFICATE_ENCRYPTION_KEY;

    if (!segredo || segredo.length < 32) {
        throw new Error(
            "Configure CERTIFICATE_ENCRYPTION_KEY no Render com pelo menos 32 caracteres para proteger os tokens fiscais."
        );
    }

    return crypto.createHash("sha256").update(segredo).digest();
}

function criptografarSegredo(valor) {
    const texto = String(valor || "").trim();
    if (!texto) return null;

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", obterChave(), iv);
    const criptografado = Buffer.concat([
        cipher.update(texto, "utf8"),
        cipher.final()
    ]);

    return {
        criptografado: criptografado.toString("base64"),
        iv: iv.toString("base64"),
        authTag: cipher.getAuthTag().toString("base64")
    };
}

function descriptografarSegredo(criptografado, iv, authTag) {
    if (!criptografado || !iv || !authTag) return null;

    const decipher = crypto.createDecipheriv(
        "aes-256-gcm",
        obterChave(),
        Buffer.from(iv, "base64")
    );
    decipher.setAuthTag(Buffer.from(authTag, "base64"));

    return Buffer.concat([
        decipher.update(Buffer.from(criptografado, "base64")),
        decipher.final()
    ]).toString("utf8");
}

module.exports = { criptografarSegredo, descriptografarSegredo };
