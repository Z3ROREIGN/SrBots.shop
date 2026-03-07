# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), e este projeto segue [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2024-03-07

### Adicionado
- Arquivo `.gitignore` profissional
- Arquivo `.prettierrc` para padronização de código
- Arquivo `.editorconfig` para compatibilidade entre editores
- Arquivo `SECURITY.md` com políticas de segurança
- Arquivo `CONTRIBUTING.md` com guia de contribuição
- Arquivo `CODE_OF_CONDUCT.md` com código de conduta
- Arquivo `DEVELOPMENT.md` com guia de desenvolvimento local
- Arquivo `LICENSE` (MIT)
- Templates de GitHub Issues (bug e feature)
- Template de Pull Request
- Workflow de GitHub Actions para CI/CD
- Documentação melhorada do README.md
- Comentários JSDoc em todas as funções públicas

### Melhorado
- Refatoração do `src/utils/helpers.js` com melhor documentação
- Refatoração do `src/worker.js` com comentários detalhados
- Configuração do `wrangler.toml` com instruções claras
- Estrutura geral do projeto para melhor profissionalismo

### Corrigido
- Melhor tratamento de erros no worker
- Validação de entrada mais robusta
- Headers CORS mais seguros

## [1.3.0] - 2024-01-15

### Adicionado
- Sistema completo de pagamentos com MisticPay
- Integração de webhooks para confirmação automática de pagamentos
- Painel de administração funcional
- Gerenciamento de bots hospedados
- Sistema de cupons de desconto
- Avaliações de produtos
- Logging de atividades

### Melhorado
- Performance das queries do banco de dados
- Validação de dados de entrada
- Segurança da autenticação JWT

## [1.2.0] - 2023-12-01

### Adicionado
- Autenticação de usuários com JWT
- Sistema de sessões
- Gerenciamento de perfil de usuário
- Histórico de compras

### Melhorado
- Interface do dashboard do usuário
- Responsividade do frontend

## [1.1.0] - 2023-11-01

### Adicionado
- Catálogo de produtos com categorias
- Sistema de busca e filtros
- Página de detalhe do produto
- Avaliações de produtos

### Melhorado
- Design da página inicial
- Navegação do site

## [1.0.0] - 2023-10-01

### Adicionado
- Versão inicial do SrBots.shop
- API RESTful completa
- Frontend estático
- Integração com Cloudflare D1
- Hospedagem em Cloudflare Pages
- Sistema de entrega automática de produtos digitais
