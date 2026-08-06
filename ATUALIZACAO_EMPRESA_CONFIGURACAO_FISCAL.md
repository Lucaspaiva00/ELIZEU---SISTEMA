# Atualização — Empresa e configuração fiscal

## Funcionalidades

- Dados gerais e endereço da empresa autenticada.
- Regime tributário, CRT, inscrição municipal, CNAE e código do município.
- Ambiente de homologação ou produção.
- Série e próximo número da NF-e.
- CFOP, natureza da operação, e-mail fiscal e informações complementares.
- Upload de certificado A1 `.pfx` ou `.p12` com limite de 5 MB.
- Certificado e senha protegidos com AES-256-GCM.
- A senha do certificado nunca é retornada pela API.

## 1. Variável obrigatória no Render

Gere uma chave no seu terminal:

```bash
openssl rand -hex 32
```

No serviço `sistema-elizeu-api`, abra **Environment** e adicione:

```text
CERTIFICATE_ENCRYPTION_KEY=<resultado_do_comando>
```

Não publique essa chave no GitHub. Guarde uma cópia segura. Se ela for perdida ou alterada, o certificado armazenado deverá ser removido e enviado novamente.

## 2. Migration

O arquivo precisa estar no GitHub em:

```text
api/prisma/migrations/20260806165000_configuracao_fiscal_empresa/migration.sql
```

O deploy de produção deve executar:

```bash
npx prisma migrate deploy
npx prisma generate
```

## 3. Deploy

Faça backup do PostgreSQL antes da migration. Depois envie backend e frontend e utilize **Clear build cache & deploy** no serviço da API.

## 4. Uso inicial

1. Salve os dados gerais da empresa.
2. Preencha o endereço.
3. Configure os dados fiscais em homologação.
4. Valide os campos com o contador do Elizeu.
5. Envie um certificado A1 de teste ou válido.
6. Mantenha produção desabilitada até a integração com a API emissora estar concluída.
