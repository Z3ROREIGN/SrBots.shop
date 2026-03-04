# SrBots.shop — Loja de Produtos Digitais

Este é o código-fonte completo para a loja SrBots.shop, construída para ser hospedada na plataforma da Cloudflare (Workers, D1, Pages).

## 🚀 Visão Geral da Arquitetura

- **Backend**: Cloudflare Worker (`src/worker.js`) atuando como uma API RESTful.
- **Frontend**: HTML, CSS e JavaScript puros, servidos como um site estático via Cloudflare Pages.
- **Banco de Dados**: Cloudflare D1, um banco de dados SQL serverless.
- **Pagamentos**: Integração com a MisticPay para pagamentos via Pix.

## 🛠️ Guia de Configuração (Painel Cloudflare)

Siga estes passos para configurar sua loja agora que o código já está no GitHub.

### Passo 1: Configurar o Banco de Dados D1

No painel da Cloudflare:
1. Vá para **D1 SQL**.
2. Clique em **Create database**.
3. Dê o nome `srbots-db` e clique em **Create**.
4. Copie o `database_id` e cole no arquivo `wrangler.toml` no seu GitHub.
5. Clique no seu banco de dados, vá em **Console** e execute o conteúdo do arquivo `sql/schema.sql` para criar as tabelas.

### Passo 2: Configurar as Chaves Secretas (Secrets)

No painel da Cloudflare:
1. Vá para **Workers & Pages**.
2. Selecione seu projeto `srbots-shop`.
3. Vá na aba **Settings** > **Variables**.
4. Na seção **Secrets**, clique em **Add variable** para cada uma das chaves abaixo:

- **`JWT_SECRET`**: Uma string longa e aleatória para a autenticação.
- **`MISTICPAY_CLIENT_ID`**: Seu Client ID da MisticPay.
- **`MISTICPAY_CLIENT_SECRET`**: Seu Client Secret da MisticPay.
- **`ADMIN_EMAIL`**: Email para o primeiro acesso ao painel admin.
- **`ADMIN_PASSWORD`**: Senha para o primeiro acesso ao painel admin.

Clique em **Save and deploy**.

### Passo 3: Configurar Webhook na MisticPay

Para que os pagamentos sejam confirmados automaticamente:
1. No painel da MisticPay, vá para a seção de Webhooks.
2. Adicione uma nova URL de webhook apontando para:
   `https://srbots.shop/api/webhook/payment`
3. Selecione os eventos relacionados a pagamentos.

## ⚙️ Pós-Configuração

1. Acesse seu painel de administrador em `https://srbots.shop/admin`.
2. Faça login com as credenciais de `ADMIN_EMAIL` e `ADMIN_PASSWORD` que você configurou.
3. Vá para a aba **Configurações** para preencher os dados do site e da MisticPay.
4. Comece a criar suas categorias e produtos!

O sistema está 100% pronto e funcional.
