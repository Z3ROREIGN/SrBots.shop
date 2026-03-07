# Guia de Desenvolvimento - SrBots.shop

Este documento descreve como configurar um ambiente de desenvolvimento local para trabalhar no SrBots.shop.

## Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- **Node.js** (versão 18 ou superior) - [Download](https://nodejs.org/)
- **npm** ou **yarn** para gerenciamento de dependências
- **Git** para controle de versão - [Download](https://git-scm.com/)
- **Wrangler CLI** para desenvolvimento local com Cloudflare Workers

## Instalação do Ambiente Local

### 1. Clonar o Repositório

```bash
git clone https://github.com/Z3ROREIGN/SrBots.shop.git
cd SrBots.shop
```

### 2. Instalar Dependências

```bash
npm install
```

### 3. Configurar Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto com as seguintes variáveis:

```env
JWT_SECRET=sua-chave-secreta-aleatoria-aqui
MISTICPAY_CLIENT_ID=seu-client-id
MISTICPAY_CLIENT_SECRET=seu-client-secret
ADMIN_EMAIL=admin@srbots.shop
ADMIN_PASSWORD=sua-senha-admin
```

### 4. Configurar o Banco de Dados Local

Para desenvolvimento local, você pode usar o D1 da Cloudflare ou um banco SQLite local:

```bash
# Criar banco de dados local
wrangler d1 create srbots-db-local --local

# Aplicar schema
wrangler d1 execute srbots-db-local --local < sql/schema.sql
```

## Executar Localmente

### Iniciar o Worker em Modo de Desenvolvimento

```bash
wrangler dev
```

O worker estará disponível em `http://localhost:8787`

### Servir o Frontend

Em outro terminal, você pode servir os arquivos estáticos:

```bash
npx http-server public -p 3000
```

Ou usar qualquer outro servidor HTTP local de sua preferência.

## Estrutura do Projeto

```
SrBots.shop/
├── src/
│   ├── worker.js              # Entry point principal do Worker
│   ├── routes/                # Rotas da API
│   │   ├── auth.js            # Autenticação e registro
│   │   ├── products.js        # Produtos e categorias
│   │   ├── orders.js          # Criação e gerenciamento de pedidos
│   │   ├── payments.js        # Status de pagamentos
│   │   ├── admin.js           # Rotas administrativas
│   │   ├── bots.js            # Gerenciamento de bots hospedados
│   │   ├── status.js          # Status do sistema
│   │   ├── user.js            # Perfil do usuário
│   │   └── webhook.js         # Webhooks de pagamento
│   └── utils/
│       └── helpers.js         # Funções auxiliares e utilitários
├── public/                    # Frontend estático
│   ├── index.html             # Página inicial
│   ├── pages/                 # Páginas adicionais
│   │   ├── store.html         # Página da loja
│   │   ├── product.html       # Página de detalhe do produto
│   │   ├── login.html         # Página de login
│   │   ├── register.html      # Página de registro
│   │   ├── dashboard.html     # Dashboard do usuário
│   │   ├── admin.html         # Painel administrativo
│   │   └── status.html        # Página de status
│   └── assets/                # Recursos estáticos
│       ├── css/               # Estilos CSS
│       └── js/                # JavaScript do frontend
├── sql/
│   └── schema.sql             # Schema do banco de dados
├── wrangler.toml              # Configuração do Wrangler
├── .prettierrc                # Configuração do Prettier
├── .editorconfig              # Configuração do EditorConfig
└── README.md                  # Documentação principal
```

## Padrões de Código

### JavaScript

Seguimos estes padrões para manter o código consistente:

- **Indentação**: 2 espaços
- **Aspas**: Aspas simples (`'`) para strings
- **Ponto e vírgula**: Sempre obrigatório
- **Variáveis**: `const` por padrão, `let` quando necessário
- **Funções**: Arrow functions quando apropriado
- **Comentários**: JSDoc para funções públicas

Exemplo de função bem documentada:

```javascript
/**
 * Calcula o total do pedido incluindo impostos
 * @param {number} subtotal - Subtotal do pedido
 * @param {number} taxRate - Taxa de imposto (0-1)
 * @returns {number} Total do pedido
 */
export function calculateTotal(subtotal, taxRate) {
  return Math.round(subtotal * (1 + taxRate) * 100) / 100;
}
```

### SQL

Para queries SQL, seguimos estas convenções:

- **Palavras-chave**: UPPERCASE
- **Nomes**: snake_case
- **Indentação**: 2 espaços
- **Comentários**: Para queries complexas

## Testando Localmente

### Testar Autenticação

```bash
# Registrar novo usuário
curl -X POST http://localhost:8787/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "password123"
  }'

# Fazer login
curl -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Testar Produtos

```bash
# Listar produtos
curl http://localhost:8787/api/products

# Listar categorias
curl http://localhost:8787/api/products/categories

# Obter produto específico
curl http://localhost:8787/api/products/1
```

## Debugging

### Logs do Worker

Os logs do worker em desenvolvimento aparecem no terminal onde você executou `wrangler dev`:

```bash
wrangler dev
# Logs aparecerão aqui
```

### Inspecionar Banco de Dados

```bash
# Acessar console do D1 local
wrangler d1 execute srbots-db-local --local --command "SELECT * FROM users;"
```

### DevTools do Navegador

Use as DevTools do navegador (F12) para inspecionar:

- Network: Requisições de API
- Console: Erros de JavaScript
- Storage: LocalStorage (tokens, dados do usuário)

## Antes de Fazer Commit

Antes de fazer commit de suas mudanças, certifique-se de:

1. **Formatar o código**: `npm run format` (se disponível)
2. **Verificar linting**: `npm run lint` (se disponível)
3. **Testar localmente**: Verifique se tudo funciona
4. **Revisar mudanças**: Use `git diff` para revisar
5. **Escrever mensagem clara**: Descreva o que foi alterado

## Troubleshooting

### Erro: "Database not found"

Certifique-se de que:
- O banco de dados foi criado: `wrangler d1 create srbots-db-local --local`
- O schema foi aplicado: `wrangler d1 execute srbots-db-local --local < sql/schema.sql`
- O `wrangler.toml` tem o `database_id` correto

### Erro: "Unauthorized" em rotas protegidas

Verifique se:
- Você está enviando o header `Authorization: Bearer <token>`
- O token é válido e não expirou
- O `JWT_SECRET` está configurado corretamente

### Erro: "CORS error"

Certifique-se de que:
- O header `Content-Type: application/json` está sendo enviado
- A origem está permitida no `ALLOWED_ORIGIN`
- O preflight OPTIONS está sendo respondido corretamente

## Recursos Adicionais

- [Documentação do Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Documentação do D1](https://developers.cloudflare.com/d1/)
- [Documentação do Wrangler](https://developers.cloudflare.com/workers/wrangler/)
- [Guia de Contribuição](CONTRIBUTING.md)
- [Política de Segurança](SECURITY.md)

## Dúvidas?

Se tiver dúvidas sobre o desenvolvimento, abra uma issue ou pergunte no [Discord](https://discord.gg/srbots).
