# Atualização — Serviços e variações de serviços

## O que foi adicionado

- Cadastro de categorias de serviços.
- Cadastro de serviços com múltiplas variações.
- Preço de custo e venda por variação.
- Unidades próprias para serviços: hora, diária, metro quadrado e metro cúbico.
- Nova tela `web/pages/servicos.html`.
- Seleção entre material/produto e serviço dentro do orçamento.
- Orçamentos mistos, contendo produtos e serviços.
- Valor negociável por item no orçamento.
- Aprovação gera itens de venda e contas a receber para ambos os tipos.
- Somente produtos geram validação e baixa de estoque.

## Atualização local

Dentro da pasta `api`:

```bash
npm install
npx prisma migrate dev
npx prisma generate
npm run dev
```

## Atualização em produção

Antes de publicar, faça um backup do PostgreSQL. Depois de enviar o backend atualizado, execute:

```bash
npx prisma migrate deploy
npx prisma generate
```

Publique também a pasta `web`, pois ela contém a nova tela de serviços e o orçamento atualizado.

O projeto está configurado para executar `prisma generate` automaticamente durante a instalação. No Render, ao aplicar esta atualização, utilize **Clear build cache & deploy** para impedir o reaproveitamento de um Prisma Client antigo.

## Teste recomendado

1. Abra **Serviços** e crie uma categoria.
2. Cadastre um serviço com duas variações.
3. Crie um orçamento com um produto e um serviço.
4. Altere o preço do serviço no orçamento.
5. Aprove o orçamento.
6. Confirme a venda e as contas a receber.
7. Confirme que apenas o produto teve baixa no estoque.
