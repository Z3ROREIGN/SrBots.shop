# Política de Segurança - SrBots.shop

## Divulgação Responsável de Vulnerabilidades

Se você descobrir uma vulnerabilidade de segurança, por favor **não** a divulgue publicamente. Em vez disso, envie um email para `security@srbots.shop` com os detalhes.

Incluir:
- Descrição da vulnerabilidade
- Passos para reproduzir
- Possível impacto
- Sugestões de correção (se houver)

Faremos o possível para responder em até 48 horas.

## Práticas de Segurança Implementadas

### Autenticação e Autorização
- **JWT (JSON Web Tokens)**: Tokens assinados com HMAC-SHA256
- **Sessões**: Armazenadas no D1 com expiração configurável
- **Verificação de Autorização**: Middleware em todas as rotas protegidas
- **Roles**: Suporte para diferentes papéis (user, admin)

### Proteção de Dados
- **Hashing de Senhas**: SHA-256 com salt
- **HTTPS Obrigatório**: Cloudflare força HTTPS
- **CORS**: Configurável por origem
- **Validação de Input**: Validação de tipo e formato em todas as rotas

### Pagamentos
- **MisticPay**: Gateway de pagamento certificado
- **Webhooks Verificados**: Validação de origem dos webhooks
- **Transações Seguras**: Dados sensíveis não armazenados em texto plano
- **Expiração de Pedidos**: Pagamentos expiram automaticamente

### Logging e Auditoria
- **Activity Logs**: Registro de todas as ações importantes
- **IP Tracking**: Registro do IP do cliente
- **Erro Detalhado**: Logs de erro para debugging

## Configuração de Segurança

### Variáveis de Ambiente (Secrets)

Todas as variáveis sensíveis devem ser configuradas como **Secrets** no painel Cloudflare:

```bash
# Obrigatórios
JWT_SECRET=<string-aleatoria-longa-e-segura>
MISTICPAY_CLIENT_ID=<seu-client-id>
MISTICPAY_CLIENT_SECRET=<seu-client-secret>
ADMIN_EMAIL=admin@srbots.shop
ADMIN_PASSWORD=<senha-forte>

# Opcionais
ALLOWED_ORIGIN=https://srbots.shop
WEBHOOK_SECRET=<secret-para-webhooks>
```

### Boas Práticas

1. **Nunca** commite secrets ou credenciais no Git
2. **Sempre** use HTTPS em produção
3. **Rotacione** secrets regularmente
4. **Monitore** logs de atividade para atividades suspeitas
5. **Atualize** dependências regularmente
6. **Teste** segurança antes de deploy

## Conformidade

- **LGPD**: Conformidade com Lei Geral de Proteção de Dados
- **PCI DSS**: Integração com gateway certificado (MisticPay)
- **OWASP**: Seguindo top 10 de segurança web

## Contato

- **Email**: security@srbots.shop
- **Discord**: https://discord.gg/srbots
- **Responsável**: Equipe de Segurança SrBots
