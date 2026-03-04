# SrBots.shop — Loja de Produtos Digitais

Este é o código-fonte completo para a loja SrBots.shop, construída para ser hospedada na plataforma da Cloudflare (Workers, D1, Pages).

## 🚀 Visão Geral da Arquitetura

- **Backend**: Cloudflare Worker (`src/worker.js`) atuando como uma API RESTful.
- **Frontend**: HTML, CSS e JavaScript puros, servidos como um site estático via Cloudflare Pages (configurado no `wrangler.toml`).
- **Banco de Dados**: Cloudflare D1, um banco de dados SQL serverless.
- **Pagamentos**: Integração com a MisticPay para pagamentos via Pix.

## 🛠️ Guia de Instalação e Deploy

Siga estes passos para colocar sua loja no ar.

### Pré-requisitos

1.  **Conta na Cloudflare**: Você precisa de uma conta ativa.
2.  **Node.js e npm**: Necessário para rodar o Wrangler.
3.  **Wrangler CLI**: A ferramenta de linha de comando da Cloudflare. Instale com `npm install -g wrangler`.

### Passo 1: Login no Wrangler

Abra seu terminal e faça login na sua conta da Cloudflare:

```bash
wrangler login
```

### Passo 2: Criar o Banco de Dados D1

No terminal, dentro da pasta do projeto (`srbots`), crie o banco de dados D1 que armazenará todas as informações da sua loja.

```bash
wrangler d1 create srbots-db
```

O comando acima retornará um `database_id`. Copie este ID.

### Passo 3: Configurar o `wrangler.toml`

Abra o arquivo `wrangler.toml` e cole o `database_id` que você copiou no campo correspondente:

```toml
[[d1_databases]]
binding = "DB"
database_name = "srbots-db"
database_id = "COLE_SEU_DATABASE_ID_AQUI"
```

### Passo 4: Aplicar o Schema do Banco de Dados

Com o banco de dados criado, você precisa criar as tabelas. O arquivo `sql/schema.sql` contém toda a estrutura necessária. Execute o comando abaixo para aplicá-lo:

```bash
wrangler d1 execute srbots-db --file=./sql/schema.sql
```

### Passo 5: Configurar as Chaves Secretas

Sua loja precisa de algumas chaves secretas para funcionar. **NUNCA** as coloque diretamente no código. Use o sistema de secrets do Wrangler. Execute os seguintes comandos no seu terminal, substituindo os valores de exemplo:

1.  **Segredo de Autenticação (JWT)**: Um código aleatório e seguro para a autenticação de usuários. Você pode gerar um online ou usar um gerenciador de senhas.

    ```bash
    wrangler secret put JWT_SECRET
    # Cole sua chave secreta quando solicitado
    ```

2.  **Credenciais da MisticPay**: Suas chaves de API da MisticPay.

    ```bash
    wrangler secret put MISTICPAY_CLIENT_ID
    # Cole seu Client ID

    wrangler secret put MISTICPAY_CLIENT_SECRET
    # Cole seu Client Secret
    ```

3.  **Credenciais do Administrador**: Os dados para o primeiro usuário administrador do sistema. Após o primeiro deploy, você pode alterar a senha ou criar novos admins pelo painel.

    ```bash
    wrangler secret put ADMIN_EMAIL
    # Digite o email do admin

    wrangler secret put ADMIN_PASSWORD
    # Digite a senha do admin
    ```

### Passo 6: Fazer o Deploy

Agora que tudo está configurado, faça o deploy do seu Worker e do site estático com um único comando:

```bash
wrangler deploy
```

Ao final do processo, o Wrangler fornecerá a URL do seu site (ex: `https://srbots-shop.<SEU_SUBDOMINIO>.workers.dev`).

### Passo 7: Configurar Domínio Personalizado

1.  Acesse o painel da Cloudflare.
2.  Vá para a seção **Workers & Pages**.
3.  Encontre seu projeto `srbots-shop`.
4.  Vá para a aba **Triggers** (Gatilhos).
5.  Na seção **Custom Domains** (Domínios Personalizados), adicione seu domínio `srbots.shop`.

Pronto! Sua loja estará no ar no seu domínio.

## ⚙️ Pós-Deploy: Configurações Iniciais

1.  Acesse seu painel de administrador em `https://srbots.shop/admin`.
2.  Faça login com as credenciais de `ADMIN_EMAIL` e `ADMIN_PASSWORD` que você configurou.
3.  Vá para a aba **Configurações**.
4.  Preencha todas as informações do site e da MisticPay.
5.  **IMPORTANTE**: As credenciais da MisticPay salvas aqui nas configurações do painel têm **prioridade** sobre as secrets do `wrangler.toml`. Isso permite que você as altere dinamicamente sem precisar fazer um novo deploy.
6.  Comece a criar suas categorias e produtos!

## 🔔 Configurando o Webhook da MisticPay

Para que os pagamentos sejam confirmados automaticamente, você precisa configurar o webhook na MisticPay.

1.  No painel da MisticPay, vá para a seção de Webhooks.
2.  Adicione uma nova URL de webhook apontando para a sua API:

    `https://srbots.shop/api/webhook/misticpay`

3.  Selecione os eventos relacionados a pagamentos (ex: `payment.paid`, `payment.confirmed`).

Isso garantirá que, sempre que um pagamento for aprovado, a MisticPay notificará sua loja para liberar o produto para o cliente.
