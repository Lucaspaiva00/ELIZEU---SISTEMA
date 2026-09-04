const empresaRepository = require("../repositories/empresa.repository");
const { criptografarCertificado } = require("../utils/certificadoCrypto");

const CAMPOS_EMPRESA = [
    "razaoSocial", "nomeFantasia", "cnpj", "inscricaoEstadual",
    "telefone", "celular", "email", "cep", "endereco", "numero",
    "complemento", "bairro", "cidade", "estado", "logo"
];

function textoOuNulo(valor) {
    const texto = String(valor ?? "").trim();
    return texto || null;
}

class EmpresaService {

    async criar(dados) {

        const empresa = await empresaRepository.buscarPorCnpj(dados.cnpj);

        if (empresa) {
            throw new Error("Já existe uma empresa cadastrada com este CNPJ.");
        }

        return await empresaRepository.criar(dados);

    }

    async listar() {
        return await empresaRepository.listar();
    }

    async buscarPorId(id) {

        const empresa = await empresaRepository.buscarPorId(id);

        if (!empresa) {
            throw new Error("Empresa não encontrada.");
        }

        return empresa;

    }

    async atualizar(id, dados) {

        await this.buscarPorId(id);

        const permitidos = {};
        for (const campo of CAMPOS_EMPRESA) {
            if (Object.prototype.hasOwnProperty.call(dados, campo)) {
                permitidos[campo] = textoOuNulo(dados[campo]);
            }
        }

        if (!permitidos.razaoSocial) {
            throw new Error("Informe a razão social.");
        }

        if (!permitidos.cnpj) {
            throw new Error("Informe o CNPJ.");
        }

        const empresaMesmoCnpj = await empresaRepository.buscarPorCnpj(permitidos.cnpj);
        if (empresaMesmoCnpj && empresaMesmoCnpj.id !== id) {
            throw new Error("Já existe outra empresa cadastrada com este CNPJ.");
        }

        return await empresaRepository.atualizar(id, permitidos);

    }

    async salvarConfiguracaoFiscal(empresaId, dados) {
        await this.buscarPorId(empresaId);

        const ambientes = ["HOMOLOGACAO", "PRODUCAO"];
        const regimes = [
            "MEI", "SIMPLES_NACIONAL", "SIMPLES_NACIONAL_EXCESSO", "REGIME_NORMAL"
        ];

        if (dados.regimeTributario && !regimes.includes(dados.regimeTributario)) {
            throw new Error("Regime tributário inválido.");
        }

        if (!ambientes.includes(dados.ambiente || "HOMOLOGACAO")) {
            throw new Error("Ambiente fiscal inválido.");
        }

        const serieNfe = Number(dados.serieNfe || 1);
        const proximoNumeroNfe = Number(dados.proximoNumeroNfe || 1);
        const crt = dados.crt ? Number(dados.crt) : null;

        if (!Number.isInteger(serieNfe) || serieNfe < 1 || serieNfe > 999) {
            throw new Error("A série da NF-e deve estar entre 1 e 999.");
        }

        if (!Number.isInteger(proximoNumeroNfe) || proximoNumeroNfe < 1) {
            throw new Error("O próximo número da NF-e deve ser maior que zero.");
        }

        if (crt !== null && (![1, 2, 3, 4].includes(crt))) {
            throw new Error("CRT inválido.");
        }

        if (dados.ativo) {
            const obrigatorios = [
                [dados.regimeTributario, "regime tributário"],
                [dados.cnaePrincipal, "CNAE principal"],
                [dados.codigoMunicipio, "código IBGE do município"],
                [dados.cfopPadrao, "CFOP padrão"],
                [dados.naturezaOperacao, "natureza da operação"]
            ];
            const ausentes = obrigatorios.filter(([valor]) => !String(valor || "").trim());
            if (ausentes.length) {
                throw new Error(`Para ativar a configuração, informe: ${ausentes.map(([, nome]) => nome).join(", ")}.`);
            }
        }

        return empresaRepository.salvarConfiguracaoFiscal(empresaId, {
            regimeTributario: dados.regimeTributario || null,
            crt,
            inscricaoMunicipal: textoOuNulo(dados.inscricaoMunicipal),
            cnaePrincipal: textoOuNulo(dados.cnaePrincipal),
            codigoMunicipio: textoOuNulo(dados.codigoMunicipio),
            ambiente: dados.ambiente || "HOMOLOGACAO",
            serieNfe,
            proximoNumeroNfe,
            cfopPadrao: textoOuNulo(dados.cfopPadrao),
            naturezaOperacao: textoOuNulo(dados.naturezaOperacao),
            emailFiscal: textoOuNulo(dados.emailFiscal),
            informacoesComplementares: textoOuNulo(dados.informacoesComplementares),
            icmsSituacaoTributariaPadrao: textoOuNulo(dados.icmsSituacaoTributariaPadrao),
            pisSituacaoTributariaPadrao: textoOuNulo(dados.pisSituacaoTributariaPadrao),
            cofinsSituacaoTributariaPadrao: textoOuNulo(dados.cofinsSituacaoTributariaPadrao),
            modalidadeFrete: Number.isInteger(Number(dados.modalidadeFrete)) ? Number(dados.modalidadeFrete) : 9,
            presencaComprador: Number.isInteger(Number(dados.presencaComprador)) ? Number(dados.presencaComprador) : 9,
            consumidorFinal: dados.consumidorFinal !== false,
            emitirNfeAoFaturar: Boolean(dados.emitirNfeAoFaturar),
            ativo: Boolean(dados.ativo)
        });
    }

    async salvarCertificado(empresaId, dados) {
        await this.buscarPorId(empresaId);

        const nomeArquivo = String(dados.nomeArquivo || "").trim();
        if (!/\.(pfx|p12)$/i.test(nomeArquivo)) {
            throw new Error("Envie um certificado A1 nos formatos .pfx ou .p12.");
        }

        if (!dados.arquivoBase64 || !dados.senha) {
            throw new Error("Informe o arquivo e a senha do certificado A1.");
        }

        const buffer = Buffer.from(dados.arquivoBase64, "base64");
        if (!buffer.length || buffer.length > 5 * 1024 * 1024 || buffer[0] !== 0x30) {
            throw new Error("O arquivo do certificado é inválido ou excede 5 MB.");
        }

        const criptografado = criptografarCertificado({
            arquivoBase64: dados.arquivoBase64,
            senha: String(dados.senha)
        });

        const validade = dados.validade ? new Date(`${dados.validade}T12:00:00`) : null;
        if (validade && Number.isNaN(validade.getTime())) {
            throw new Error("Data de validade inválida.");
        }

        return empresaRepository.salvarCertificado(empresaId, {
            nomeArquivo,
            ...criptografado,
            validade,
            ativo: true
        });
    }

    async removerCertificado(empresaId) {
        await this.buscarPorId(empresaId);
        return empresaRepository.removerCertificado(empresaId);
    }

    async excluir(id) {

        await this.buscarPorId(id);

        return await empresaRepository.excluir(id);

    }

}

module.exports = new EmpresaService();
