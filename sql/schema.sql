-- ============================================================
-- SrBots.shop - Schema do Banco de Dados D1 (Cloudflare)
-- Versão: 1.0.0
-- ============================================================

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  avatar_url TEXT DEFAULT NULL,
  discord_id TEXT DEFAULT NULL,
  discord_username TEXT DEFAULT NULL,
  role TEXT NOT NULL DEFAULT 'user', -- 'user', 'admin'
  is_banned INTEGER NOT NULL DEFAULT 0,
  ban_reason TEXT DEFAULT NULL,
  bot_limit INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tabela de categorias de produtos
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT NULL,
  icon TEXT DEFAULT NULL,
  color TEXT DEFAULT '#7c3aed',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tabela de produtos
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT NULL,
  short_description TEXT DEFAULT NULL,
  price REAL NOT NULL,
  original_price REAL DEFAULT NULL,
  product_type TEXT NOT NULL DEFAULT 'bot', -- 'bot', 'source_code', 'script', 'panel'
  delivery_type TEXT NOT NULL DEFAULT 'automatic', -- 'automatic', 'manual'
  delivery_content TEXT DEFAULT NULL, -- conteúdo entregue automaticamente
  thumbnail_url TEXT DEFAULT NULL,
  gallery_urls TEXT DEFAULT NULL, -- JSON array de URLs
  features TEXT DEFAULT NULL, -- JSON array de features
  requirements TEXT DEFAULT NULL,
  version TEXT DEFAULT '1.0.0',
  stock INTEGER DEFAULT NULL, -- NULL = ilimitado
  is_active INTEGER NOT NULL DEFAULT 1,
  is_featured INTEGER NOT NULL DEFAULT 0,
  downloads INTEGER NOT NULL DEFAULT 0,
  sales_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Tabela de pedidos
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL,
  total_price REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'delivered', 'cancelled', 'refunded'
  payment_method TEXT NOT NULL DEFAULT 'pix',
  payment_id TEXT DEFAULT NULL, -- ID da transação MisticPay
  payment_data TEXT DEFAULT NULL, -- JSON com dados do pagamento (QR code, etc)
  payer_name TEXT DEFAULT NULL,
  payer_document TEXT DEFAULT NULL,
  delivery_data TEXT DEFAULT NULL, -- JSON com dados entregues ao cliente
  notes TEXT DEFAULT NULL,
  paid_at TEXT DEFAULT NULL,
  delivered_at TEXT DEFAULT NULL,
  expires_at TEXT DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Tabela de bots hospedados
CREATE TABLE IF NOT EXISTS hosted_bots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  order_id INTEGER DEFAULT NULL,
  bot_name TEXT NOT NULL,
  bot_token TEXT DEFAULT NULL,
  bot_type TEXT NOT NULL DEFAULT 'discord', -- 'discord', 'telegram', 'whatsapp'
  status TEXT NOT NULL DEFAULT 'offline', -- 'online', 'offline', 'error', 'suspended'
  server_id TEXT DEFAULT NULL,
  server_name TEXT DEFAULT NULL,
  uptime_seconds INTEGER NOT NULL DEFAULT 0,
  memory_mb REAL DEFAULT NULL,
  cpu_percent REAL DEFAULT NULL,
  last_ping TEXT DEFAULT NULL,
  config_data TEXT DEFAULT NULL, -- JSON com configurações do bot
  notes TEXT DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- Tabela de sessões de usuário
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  ip_address TEXT DEFAULT NULL,
  user_agent TEXT DEFAULT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Tabela de configurações do sistema
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT DEFAULT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tabela de logs de atividade
CREATE TABLE IF NOT EXISTS activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER DEFAULT NULL,
  action TEXT NOT NULL,
  entity_type TEXT DEFAULT NULL,
  entity_id INTEGER DEFAULT NULL,
  details TEXT DEFAULT NULL, -- JSON
  ip_address TEXT DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Tabela de webhooks recebidos (MisticPay)
CREATE TABLE IF NOT EXISTS payment_webhooks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL, -- JSON completo do webhook
  processed INTEGER NOT NULL DEFAULT 0,
  processed_at TEXT DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tabela de cupons de desconto
CREATE TABLE IF NOT EXISTS coupons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL DEFAULT 'percentage', -- 'percentage', 'fixed'
  discount_value REAL NOT NULL,
  min_order_value REAL DEFAULT NULL,
  max_uses INTEGER DEFAULT NULL,
  uses_count INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  expires_at TEXT DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tabela de avaliações de produtos
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  order_id INTEGER NOT NULL,
  rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
  comment TEXT DEFAULT NULL,
  is_approved INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- Tabela de status do sistema
CREATE TABLE IF NOT EXISTS system_status (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'operational', -- 'operational', 'degraded', 'outage'
  message TEXT DEFAULT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- DADOS INICIAIS
-- ============================================================

-- Categorias padrão
INSERT OR IGNORE INTO categories (name, slug, description, icon, color, sort_order) VALUES
  ('Bots Discord', 'bots-discord', 'Bots personalizados para Discord', '🤖', '#5865F2', 1),
  ('Código Fonte', 'codigo-fonte', 'Código fonte completo de projetos', '💻', '#10b981', 2),
  ('Scripts', 'scripts', 'Scripts de automação e utilitários', '⚡', '#f59e0b', 3),
  ('Painéis', 'paineis', 'Painéis web e dashboards', '🖥️', '#7c3aed', 4);

-- Configurações padrão do sistema
INSERT OR IGNORE INTO settings (key, value, description) VALUES
  ('site_name', 'SrBots', 'Nome do site'),
  ('site_description', 'A melhor loja de bots e scripts do Brasil', 'Descrição do site'),
  ('site_url', 'https://srbots.shop', 'URL do site'),
  ('maintenance_mode', '0', 'Modo de manutenção (0=off, 1=on)'),
  ('registration_enabled', '1', 'Registro de novos usuários habilitado'),
  ('default_bot_limit', '1', 'Limite padrão de bots por usuário'),
  ('pix_key', '', 'Chave Pix para pagamentos manuais'),
  ('pix_key_type', 'EMAIL', 'Tipo da chave Pix'),
  ('misticpay_client_id', '', 'Client ID da MisticPay'),
  ('misticpay_client_secret', '', 'Client Secret da MisticPay'),
  ('webhook_secret', '', 'Secret para validação de webhooks'),
  ('support_discord', 'https://discord.gg/srbots', 'Link do Discord de suporte'),
  ('support_email', 'contato@srbots.shop', 'Email de suporte'),
  ('payment_expiry_minutes', '30', 'Minutos para expirar pagamento Pix');

-- Status dos serviços
INSERT OR IGNORE INTO system_status (service_name, status, message) VALUES
  ('Loja', 'operational', 'Funcionando normalmente'),
  ('Pagamentos', 'operational', 'Processando normalmente'),
  ('Hospedagem de Bots', 'operational', 'Todos os bots online'),
  ('API', 'operational', 'Respondendo normalmente'),
  ('Suporte', 'operational', 'Disponível');

-- Usuário admin padrão (senha: Admin@2024 - TROQUE IMEDIATAMENTE)
-- Hash bcrypt de 'Admin@2024'
INSERT OR IGNORE INTO users (email, username, password_hash, role, bot_limit) VALUES
  ('admin@srbots.shop', 'admin', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uOeS', 'admin', 999);
