# Integração SacMais — Clientes

## Fluxo implementado

O ERP recebe eventos de contatos enviados pelo SacMais e cria/atualiza automaticamente o cliente.

Payload suportado:

```json
{
  "event": "contacts",
  "action": "update",
  "data": {
    "contact": {
      "name": "Jhon Doe",
      "number": "+55 (11) 99999-9999",
      "email": "example@example.com",
      "document": "000.000.000-00",
      "additionalFields": []
    }
  }
}
```

Mapeamento principal:

- `contact.name` -> `Cliente.nome`
- `contact.number` -> `Cliente.telefone` e `Cliente.celular`
- `contact.email` -> `Cliente.email`
- `contact.document` / `additionalFields.cpf_cnpj` -> `Cliente.cpfCnpj`
- `additionalFields.endereço` -> `Cliente.endereco`
- `additionalFields.cep` -> `Cliente.cep`
- `additionalFields.cidade` -> `Cliente.cidade`
- `additionalFields.estado` / `uf` -> `Cliente.estado`
- tags, `valor_r` e `duracao_da_conexao` -> `Cliente.observacoes`

## Render — API

Configure no serviço `sistema-elizeu-api`:

```text
SACMAIS_API_URL=https://api1.sacmais.com.br/api
SACMAIS_API_TOKEN=<token da API SacMais>
SACMAIS_WEBHOOK_SECRET=<segredo opcional do webhook>
PUBLIC_API_URL=https://sistema-elizeu-api.onrender.com
```

O token da API é enviado no header `x_token`, conforme o Swagger.

## URL do webhook

A URL é:

```text
https://sistema-elizeu-api.onrender.com/api/integracoes/sacmais/webhook/EMPRESA_ID
```

O endpoint autenticado abaixo devolve a URL já com o `empresaId` da empresa logada:

```text
GET /api/integracoes/sacmais/configuracao
```

No SacMais, cadastre essa URL em `POST /webhooks` e selecione o evento/campo de contatos.
Se definir um token/segredo para o webhook, use o mesmo valor em `SACMAIS_WEBHOOK_SECRET`.

## Contatos antigos

O Swagger disponibilizado mostra `GET /contacts/{contactNumber}`, não um `GET /contacts` para listagem geral.
Por isso a integração automática funciona para novos eventos via webhook e também permite importar um contato conhecido pelo número:

```text
POST /api/integracoes/sacmais/contatos/{contactNumber}/importar
```

Esse endpoint consulta o SacMais usando `GET /contacts/{contactNumber}` e cria/atualiza o cliente no ERP.
