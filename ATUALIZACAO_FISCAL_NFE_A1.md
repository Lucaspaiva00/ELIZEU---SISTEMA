# Módulo fiscal NF-e - etapa base

Implementado:

- Certificado A1 permanece armazenado criptografado na configuração da empresa.
- Configuração fiscal da empresa continua centralizada em Empresas.
- Origem da mercadoria adicionada ao cadastro de produto.
- Venda faturada exibe situação fiscal.
- Botão Emitir NF-e valida empresa, cliente, produto e certificado.
- Pendências são exibidas com indicação do cadastro que precisa ser corrigido.
- Quando tudo está válido, é criado um registro NotaFiscal com modelo 55, série,
  número e snapshot dos dados fiscais da venda.
- O próximo número de NF-e é incrementado de forma transacional.
- Status inicial após a preparação: PRONTA_TRANSMISSAO.

IMPORTANTE:
Esta etapa NÃO transmite nem autoriza a NF-e na SEFAZ. Ela fecha a preparação,
numeração, validações e persistência fiscal. A autorização real exige o conector
de transmissão SEFAZ (assinatura XML + webservice da UF) e será a próxima etapa.
