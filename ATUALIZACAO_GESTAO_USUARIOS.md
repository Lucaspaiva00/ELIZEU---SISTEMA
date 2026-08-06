# Gestão de usuários

## Entregue

- Tela responsiva em `web/pages/usuarios.html`.
- Cadastro e edição de usuários.
- Perfis: Administrador, Gerente, Vendedor, Financeiro, Estoque e Fiscal.
- Filtros por nome, e-mail, perfil e situação.
- Ativação e bloqueio de acesso sem excluir o histórico.
- Redefinição administrativa de senha.
- Registro da data e hora do último login.
- Isolamento dos usuários por empresa.
- Respostas da API sem o campo de senha.
- Proteção para não bloquear o próprio acesso ou o último administrador ativo.

## Migration

Nova migration:

`api/prisma/migrations/20260806180000_perfil_fiscal_usuarios/migration.sql`

Ela adiciona o perfil `FISCAL` ao enum `PerfilUsuario` do PostgreSQL.

No deploy da API na Render, o comando de build deve executar:

```bash
npx prisma generate && npx prisma migrate deploy
```

Depois, publique também o serviço web para disponibilizar a nova tela.

## Rotas

- `GET /api/usuarios`
- `GET /api/usuarios/:id`
- `POST /api/usuarios`
- `PUT /api/usuarios/:id`
- `PATCH /api/usuarios/:id/status`
- `PATCH /api/usuarios/:id/senha`

Todas exigem autenticação e perfil `ADMIN`.

## Observação

Esta etapa cria os perfis e protege a gestão de usuários. A autorização individual de cada módulo será aplicada na próxima etapa, usando esses perfis nas respectivas rotas e menus.
