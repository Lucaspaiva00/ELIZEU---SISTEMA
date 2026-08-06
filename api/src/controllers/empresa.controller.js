const empresaService = require("../services/empresa.service");

class EmpresaController {

    async minha(req, res) {
        try {
            const empresa = await empresaService.buscarPorId(req.usuario.empresaId);
            return res.json({ sucesso: true, empresa });
        } catch (error) {
            return res.status(404).json({ sucesso: false, mensagem: error.message });
        }
    }

    async atualizarMinha(req, res) {
        try {
            const empresa = await empresaService.atualizar(req.usuario.empresaId, req.body);
            return res.json({ sucesso: true, mensagem: "Empresa atualizada com sucesso.", empresa });
        } catch (error) {
            return res.status(400).json({ sucesso: false, mensagem: error.message });
        }
    }

    async salvarConfiguracaoFiscal(req, res) {
        try {
            const configuracaoFiscal = await empresaService.salvarConfiguracaoFiscal(req.usuario.empresaId, req.body);
            return res.json({ sucesso: true, mensagem: "Configuração fiscal salva com sucesso.", configuracaoFiscal });
        } catch (error) {
            return res.status(400).json({ sucesso: false, mensagem: error.message });
        }
    }

    async salvarCertificado(req, res) {
        try {
            const certificadoDigital = await empresaService.salvarCertificado(req.usuario.empresaId, req.body);
            return res.json({ sucesso: true, mensagem: "Certificado armazenado com segurança.", certificadoDigital });
        } catch (error) {
            return res.status(400).json({ sucesso: false, mensagem: error.message });
        }
    }

    async removerCertificado(req, res) {
        try {
            await empresaService.removerCertificado(req.usuario.empresaId);
            return res.json({ sucesso: true, mensagem: "Certificado removido com sucesso." });
        } catch (error) {
            return res.status(400).json({ sucesso: false, mensagem: error.message });
        }
    }

    async criar(req, res) {

        try {

            const empresa = await empresaService.criar(req.body);

            return res.status(201).json({
                sucesso: true,
                mensagem: "Empresa cadastrada com sucesso.",
                empresa
            });

        } catch (error) {

            return res.status(400).json({
                sucesso: false,
                mensagem: error.message
            });

        }

    }

    async listar(req, res) {

        try {

            const empresas = await empresaService.listar();

            return res.json({
                sucesso: true,
                empresas
            });

        } catch (error) {

            return res.status(400).json({
                sucesso: false,
                mensagem: error.message
            });

        }

    }

    async buscarPorId(req, res) {

        try {

            const empresa = await empresaService.buscarPorId(
                Number(req.params.id)
            );

            return res.json({
                sucesso: true,
                empresa
            });

        } catch (error) {

            return res.status(404).json({
                sucesso: false,
                mensagem: error.message
            });

        }

    }

    async atualizar(req, res) {

        try {

            const empresa = await empresaService.atualizar(
                Number(req.params.id),
                req.body
            );

            return res.json({
                sucesso: true,
                mensagem: "Empresa atualizada com sucesso.",
                empresa
            });

        } catch (error) {

            return res.status(400).json({
                sucesso: false,
                mensagem: error.message
            });

        }

    }

    async excluir(req, res) {

        try {

            await empresaService.excluir(Number(req.params.id));

            return res.json({
                sucesso: true,
                mensagem: "Empresa removida com sucesso."
            });

        } catch (error) {

            return res.status(400).json({
                sucesso: false,
                mensagem: error.message
            });

        }

    }

}

module.exports = new EmpresaController();
