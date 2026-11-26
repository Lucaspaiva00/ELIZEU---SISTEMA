const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const { autorizar } = require("../middlewares/permissions.middleware");
const controller = require("../controllers/venda.controller");
const nfeController = require("../controllers/nfe.controller");
const nfeService = require("../services/nfe.service");
const nfseController = require("../controllers/nfse.controller");

router.get("/", auth, autorizar("vendas.visualizar"), controller.listar);
router.put("/:id/faturar", auth, autorizar("vendas.faturar"), controller.faturar);
router.put("/:id/cancelar", auth, autorizar("vendas.cancelar"), controller.cancelar);
router.get("/:id/nfe", auth, autorizar("fiscal.visualizar"), nfeController.buscar);
router.get("/:id/nfe/previsualizar", auth, autorizar("fiscal.visualizar"), async (req, res) => {
    try {
        const resultado = await nfeService.previsualizar(Number(req.params.id), req.usuario.empresaId);
        return res.json({ sucesso: true, ...resultado });
    } catch (erro) {
        return res.status(422).json({ sucesso: false, mensagem: erro.message });
    }
});
router.get("/:id/nfe/validar", auth, autorizar("fiscal.visualizar"), nfeController.validar);
router.post("/:id/nfe/preparar", auth, autorizar("fiscal.emitir"), nfeController.preparar);
router.post("/:id/nfe/emitir", auth, autorizar("fiscal.emitir"), nfeController.emitir);
router.post("/:id/nfe/consultar", auth, autorizar("fiscal.visualizar"), nfeController.consultar);
router.post("/:id/nfe/cancelar", auth, autorizar("fiscal.emitir"), nfeController.cancelar);

router.get("/:id/nfse", auth, autorizar("fiscal.visualizar"), nfseController.buscar);
router.get("/:id/nfse/validar", auth, autorizar("fiscal.visualizar"), nfseController.validar);
router.get("/:id/nfse/parametros", auth, autorizar("fiscal.visualizar"), nfseController.parametros);
router.post("/:id/nfse/preparar", auth, autorizar("fiscal.emitir"), nfseController.preparar);
router.post("/:id/nfse/gerar-dps", auth, autorizar("fiscal.emitir"), nfseController.gerarDps);
router.post("/:id/nfse/emitir", auth, autorizar("fiscal.emitir"), nfseController.emitir);
router.get("/:id", auth, autorizar("vendas.visualizar"), controller.buscarPorId);

module.exports = router;
