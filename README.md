# SrBots.shop — Loja de Produtos Digitais Serverless

![SrBots.shop](https://i.imgur.com/example.png)  <!-- Substituir por um banner real -->

**SrBots.shop** é uma plataforma de e-commerce de código aberto, construída para a venda de produtos digitais como bots, scripts e códigos-fonte. A arquitetura é totalmente serverless, utilizando o ecossistema da Cloudflare para alta performance, escalabilidade e baixo custo.

[![Status](https://img.shields.io/badge/status-ativo-success.svg)](https://srbots.shop/status) [![Licença](https://img.shields.io/badge/licença-MIT-blue.svg)](/LICENSE) [![Discord](https://img.shields.io/discord/your-server-id?label=Discord&logo=discord)](https://discord.gg/srbots)

## ✨ Funcionalidades Principais

- **Loja Completa**: Catálogo de produtos, categorias, busca e filtros.
- **Pagamentos Automatizados**: Integração com Pix via MisticPay.
- **Entrega Instantânea**: Produtos digitais entregues automaticamente após a confirmação do pagamento.
- **Painel do Cliente**: Área para gerenciar compras, downloads e perfil.
- **Painel de Administração**: Gerenciamento completo de produtos, usuários, pedidos, configurações e mais.
- **Hospedagem de Bots**: Sistema para gerenciar e monitorar bots (ex: Discord).
- **Página de Status**: Monitoramento em tempo real dos serviços da plataforma.
- **Segurança**: Autenticação JWT, CORS, hashing de senhas e logging de atividades.

## 🚀 Arquitetura Tecnológica

A plataforma foi desenhada para ser robusta, segura e escalável, utilizando as seguintes tecnologias:

| Componente      | Tecnologia                                       | Descrição                                                                 |
| --------------- | ------------------------------------------------ | ------------------------------------------------------------------------- |
| **Backend**     | [Cloudflare Workers][1]                          | API RESTful serverless para todas as operações de backend.                |
| **Frontend**    | HTML, CSS, JavaScript (Vanilla)                  | Interface de usuário estática, servida com alta performance.              |
| **Banco de Dados**| [Cloudflare D1][2]                               | Banco de dados SQL serverless, otimizado para o ambiente da Cloudflare.   |
| **Deployment**  | [Cloudflare Pages][3]                            | Plataforma para deploy contínuo do frontend e integração com o Worker.    |
| **Pagamentos**  | [MisticPay][4]                                   | Gateway de pagamento para transações via Pix com confirmação automática.  |

[1]: https://workers.cloudflare.com/
[2]: https://developers.cloudflare.com/d1/
[3]: https://pages.cloudflare.com/
[4]: https://misticpay.com/

## 🛠️ Guia de Instalação e Configuração

Siga estes passos para configurar e implantar sua própria instância da SrBots.shop.

### Pré-requisitos

- Conta na [Cloudflare](https://dash.cloudflare.com/sign-up)
- [Node.js](https://nodejs.org/) e [npm](https://www.npmjs.com/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) instalado e autenticado

### Passo 1: Clonar o Repositório

```bash
gh repo clone Z3ROREIGN/SrBots.shop
cd SrBots.shop
```

### Passo 2: Configurar o Banco de Dados D1

1. No painel da Cloudflare, vá para **Workers & Pages > D1**.
2. Clique em **Create database**.
3. Dê o nome `srbots-db` e selecione uma localização.
4. Na aba **Console**, execute o conteúdo do arquivo `sql/schema.sql` para criar todas as tabelas.
5. Copie o `Database ID` do seu banco de dados.
6. Abra o arquivo `wrangler.toml` e cole o ID no campo `database_id`.

### Passo 3: Configurar as Variáveis de Ambiente (Secrets)

No painel da Cloudflare, navegue até o seu projeto e vá em **Settings > Variables**. Adicione as seguintes variáveis na seção **Environment Variables**, clicando em **Add variable** e marcando a opção **Encrypt** para cada uma.

| Variável                  | Descrição                                                                 |
| ------------------------- | ------------------------------------------------------------------------- |
| `JWT_SECRET`              | Uma string longa e aleatória para a segurança da autenticação.            |
| `MISTICPAY_CLIENT_ID`     | Seu Client ID da MisticPay.                                               |
| `MISTICPAY_CLIENT_SECRET` | Seu Client Secret da MisticPay.                                           |
| `ADMIN_EMAIL`             | Email para o primeiro acesso ao painel de administração.                  |
| `ADMIN_PASSWORD`          | Senha para o primeiro acesso ao painel de administração.                  |

### Passo 4: Deploy na Cloudflare

Conecte seu repositório do GitHub ao Cloudflare Pages para deploy automático. A Cloudflare irá detectar o `wrangler.toml` e configurar o build e o deploy do Worker e dos assets estáticos.

### Passo 5: Configurar o Webhook de Pagamento

1. No painel da MisticPay, vá para a seção de Webhooks.
2. Adicione uma nova URL de webhook apontando para: `https://<seu-dominio>.com/api/webhook/payment`
3. Selecione os eventos relacionados a pagamentos para receber as notificações.

## 🤝 Contribuição

Contribuições são muito bem-vindas! Se você deseja melhorar o projeto, por favor, leia nosso [Guia de Contribuição](CONTRIBUTING.md) para entender nossos padrões de código e processo de pull request.

- [Reportar um Bug](https://github.com/Z3ROREIGN/SrBots.shop/issues/new?assignees=&labels=bug&template=bug_report.md&title=)
- [Sugerir uma Melhoria](https://github.com/Z3ROREIGN/SrBots.shop/issues/new?assignees=&labels=enhancement&template=feature_request.md&title=)

## 🛡️ Segurança

Levamos a segurança a sério. Se você encontrar uma vulnerabilidade, por favor, siga as diretrizes em nossa [Política de Segurança](SECURITY.md).

## 📄 Licença

Este projeto está licenciado sob a **Licença MIT**. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.
