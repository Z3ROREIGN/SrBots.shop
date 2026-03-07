# Guia de Contribuição - SrBots.shop

Obrigado por considerar contribuir para o SrBots.shop! Este documento fornece diretrizes e instruções para contribuir.

## Como Contribuir

### Reportar Bugs

Antes de criar um relatório de bug, verifique se o problema já foi reportado. Se você encontrar um bug:

1. **Use um título claro e descritivo**
2. **Descreva os passos exatos para reproduzir o problema**
3. **Forneça exemplos específicos para demonstrar os passos**
4. **Descreva o comportamento observado e o que você esperava**
5. **Inclua screenshots se relevante**
6. **Mencione sua versão do navegador/Node.js**

### Sugerir Melhorias

Sugestões de melhorias são bem-vindas! Para sugerir uma melhoria:

1. **Use um título claro e descritivo**
2. **Forneça uma descrição detalhada da melhoria sugerida**
3. **Liste alguns exemplos de como a melhoria seria útil**
4. **Liste algumas aplicações similares que implementam essa funcionalidade**

### Pull Requests

1. **Fork** o repositório
2. **Clone** seu fork localmente
3. **Crie uma branch** para sua feature (`git checkout -b feature/AmazingFeature`)
4. **Commit** suas mudanças (`git commit -m 'Add some AmazingFeature'`)
5. **Push** para a branch (`git push origin feature/AmazingFeature`)
6. **Abra um Pull Request** no repositório original

## Padrões de Código

### JavaScript

- Use **2 espaços** para indentação
- Use **const** por padrão, **let** quando necessário
- Use **arrow functions** quando apropriado
- Adicione **comentários JSDoc** para funções públicas
- Use **camelCase** para variáveis e funções
- Use **PascalCase** para classes e componentes

Exemplo:
```javascript
/**
 * Calcula o total do pedido
 * @param {number} subtotal - Subtotal do pedido
 * @param {number} tax - Imposto
 * @returns {number} Total
 */
export function calculateTotal(subtotal, tax) {
  return subtotal + tax;
}
```

### HTML/CSS

- Use **2 espaços** para indentação
- Use **classes BEM** para CSS
- Use **semantic HTML**
- Mantenha o CSS modular e reutilizável

### SQL

- Use **UPPERCASE** para palavras-chave SQL
- Use **snake_case** para nomes de tabelas e colunas
- Adicione comentários para queries complexas

## Estrutura do Projeto

```
SrBots.shop/
├── src/
│   ├── worker.js          # Entry point do Worker
│   ├── routes/            # Rotas da API
│   │   ├── auth.js
│   │   ├── products.js
│   │   ├── orders.js
│   │   ├── payments.js
│   │   ├── admin.js
│   │   ├── bots.js
│   │   ├── status.js
│   │   ├── user.js
│   │   └── webhook.js
│   └── utils/
│       └── helpers.js     # Funções auxiliares
├── public/                # Frontend estático
│   ├── index.html
│   ├── pages/
│   └── assets/
├── sql/
│   └── schema.sql         # Schema do banco de dados
├── wrangler.toml          # Configuração do Worker
└── README.md
```

## Processo de Review

1. Pelo menos um mantenedor deve revisar o PR
2. Testes devem passar
3. Não deve haver conflitos com a branch principal
4. Código deve seguir os padrões do projeto
5. Documentação deve ser atualizada se necessário

## Dúvidas?

- Abra uma **Issue** no GitHub
- Pergunte no **Discord**: https://discord.gg/srbots
- Email: **contato@srbots.shop**

## Código de Conduta

Este projeto adota um Código de Conduta para garantir um ambiente acolhedor para todos. Esperamos que todos os contribuidores sigam este código.

### Nossos Padrões

Exemplos de comportamento que contribuem para criar um ambiente positivo incluem:

- Usar linguagem acolhedora e inclusiva
- Ser respeitoso com pontos de vista e experiências diferentes
- Aceitar crítica construtiva graciosamente
- Focar no que é melhor para a comunidade
- Mostrar empatia com outros membros da comunidade

### Aplicação

Instâncias de comportamento abusivo, de assédio ou inaceitável podem ser reportadas entrando em contato com a equipe do projeto. Todas as reclamações serão revisadas e investigadas.

Obrigado por contribuir! 🎉
