/**
 * SrBots.shop - Rotas Administrativas
 */

import {
  errorResponse, successResponse, validateBody,
  slugify, logActivity, getClientIP, hashPassword
} from '../utils/helpers.js';

export async function handleAdmin(request, env, user) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // ── Dashboard ─────────────────────────────────────────────
  if (path === '/api/admin/dashboard' && method === 'GET') {
    return await getDashboard(env);
  }

  // ── Produtos ──────────────────────────────────────────────
  if (path === '/api/admin/products' && method === 'GET') return await adminListProducts(env, url);
  if (path === '/api/admin/products' && method === 'POST') return await adminCreateProduct(request, env, user);
  const prodMatch = path.match(/^\/api\/admin\/products\/(\d+)$/);
  if (prodMatch && method === 'PUT') return await adminUpdateProduct(prodMatch[1], request, env, user);
  if (prodMatch && method === 'DELETE') return await adminDeleteProduct(prodMatch[1], env, user);

  // ── Categorias ────────────────────────────────────────────
  if (path === '/api/admin/categories' && method === 'GET') return await adminListCategories(env);
  if (path === '/api/admin/categories' && method === 'POST') return await adminCreateCategory(request, env);
  const catMatch = path.match(/^\/api\/admin\/categories\/(\d+)$/);
  if (catMatch && method === 'PUT') return await adminUpdateCategory(catMatch[1], request, env);
  if (catMatch && method === 'DELETE') return await adminDeleteCategory(catMatch[1], env);

  // ── Usuários ──────────────────────────────────────────────
  if (path === '/api/admin/users' && method === 'GET') return await adminListUsers(env, url);
  const userMatch = path.match(/^\/api\/admin\/users\/(\d+)$/);
  if (userMatch && method === 'GET') return await adminGetUser(userMatch[1], env);
  if (userMatch && method === 'PUT') return await adminUpdateUser(userMatch[1], request, env, user);
  if (path.match(/^\/api\/admin\/users\/(\d+)\/ban$/) && method === 'POST') {
    const id = path.match(/^\/api\/admin\/users\/(\d+)\/ban$/)[1];
    return await adminBanUser(id, request, env, user);
  }
  if (path.match(/^\/api\/admin\/users\/(\d+)\/unban$/) && method === 'POST') {
    const id = path.match(/^\/api\/admin\/users\/(\d+)\/unban$/)[1];
    return await adminUnbanUser(id, env, user);
  }

  // ── Pedidos ───────────────────────────────────────────────
  if (path === '/api/admin/orders' && method === 'GET') return await adminListOrders(env, url);
  const orderMatch = path.match(/^\/api\/admin\/orders\/(\d+)$/);
  if (orderMatch && method === 'GET') return await adminGetOrder(orderMatch[1], env);
  if (orderMatch && method === 'PUT') return await adminUpdateOrder(orderMatch[1], request, env, user);

  // ── Bots ──────────────────────────────────────────────────
  if (path === '/api/admin/bots' && method === 'GET') return await adminListBots(env, url);
  const botMatch = path.match(/^\/api\/admin\/bots\/(\d+)$/);
  if (botMatch && method === 'PUT') return await adminUpdateBot(botMatch[1], request, env);
  if (botMatch && method === 'DELETE') return await adminDeleteBot(botMatch[1], env, user);

  // ── Configurações ─────────────────────────────────────────
  if (path === '/api/admin/settings' && method === 'GET') return await adminGetSettings(env);
  if (path === '/api/admin/settings' && method === 'PUT') return await adminUpdateSettings(request, env, user);

  // ── Status ────────────────────────────────────────────────
  if (path === '/api/admin/status' && method === 'GET') return await adminGetStatus(env);
  if (path === '/api/admin/status' && method === 'PUT') return await adminUpdateStatus(request, env, user);

  // ── Logs ──────────────────────────────────────────────────
  if (path === '/api/admin/logs' && method === 'GET') return await adminGetLogs(env, url);

  // ── Cupons ────────────────────────────────────────────────
  if (path === '/api/admin/coupons' && method === 'GET') return await adminListCoupons(env);
  if (path === '/api/admin/coupons' && method === 'POST') return await adminCreateCoupon(request, env);
  const couponMatch = path.match(/^\/api\/admin\/coupons\/(\d+)$/);
  if (couponMatch && method === 'DELETE') return await adminDeleteCoupon(couponMatch[1], env);

  // ── Webhooks ──────────────────────────────────────────────
  if (path === '/api/admin/webhooks' && method === 'GET') return await adminGetWebhooks(env, url);

  return errorResponse('Rota não encontrada', 404);
}

// ── DASHBOARD ────────────────────────────────────────────────
async function getDashboard(env) {
  const [stats, recentOrders, recentUsers, revenue] = await Promise.all([
    env.DB.prepare(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE role = 'user') as total_users,
        (SELECT COUNT(*) FROM users WHERE is_banned = 1) as banned_users,
        (SELECT COUNT(*) FROM products WHERE is_active = 1) as active_products,
        (SELECT COUNT(*) FROM orders WHERE status = 'paid') as total_orders,
        (SELECT COUNT(*) FROM orders WHERE status = 'pending') as pending_orders,
        (SELECT COUNT(*) FROM hosted_bots) as total_bots,
        (SELECT COUNT(*) FROM hosted_bots WHERE status = 'online') as bots_online,
        (SELECT COALESCE(SUM(total_price), 0) FROM orders WHERE status = 'paid') as total_revenue,
        (SELECT COALESCE(SUM(total_price), 0) FROM orders WHERE status = 'paid' AND paid_at >= date('now', '-30 days')) as monthly_revenue
    `).first(),

    env.DB.prepare(`
      SELECT o.*, u.username, p.name as product_name
      FROM orders o JOIN users u ON o.user_id = u.id JOIN products p ON o.product_id = p.id
      ORDER BY o.created_at DESC LIMIT 10
    `).all(),

    env.DB.prepare('SELECT id, username, email, created_at FROM users ORDER BY created_at DESC LIMIT 5').all(),

    env.DB.prepare(`
      SELECT date(paid_at) as date, SUM(total_price) as revenue, COUNT(*) as orders
      FROM orders WHERE status = 'paid' AND paid_at >= date('now', '-30 days')
      GROUP BY date(paid_at) ORDER BY date ASC
    `).all(),
  ]);

  return successResponse({
    stats,
    recent_orders: recentOrders.results,
    recent_users: recentUsers.results,
    revenue_chart: revenue.results,
  });
}

// ── PRODUTOS ─────────────────────────────────────────────────
async function adminListProducts(env, url) {
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
  const search = url.searchParams.get('search');
  const offset = (page - 1) * limit;

  let query = `SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id`;
  const params = [];

  if (search) {
    query += ' WHERE p.name LIKE ? OR p.description LIKE ?';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const products = await env.DB.prepare(query).bind(...params).all();
  const total = await env.DB.prepare('SELECT COUNT(*) as total FROM products').first();

  return successResponse({
    items: products.results,
    pagination: { page, limit, total: total?.total || 0, pages: Math.ceil((total?.total || 0) / limit) }
  });
}

async function adminCreateProduct(request, env, user) {
  const { error, body } = await validateBody(request, ['name', 'category_id', 'price', 'product_type']);
  if (error) return errorResponse(error);

  const slug = slugify(body.name) + '-' + Date.now();

  const result = await env.DB.prepare(`
    INSERT INTO products (category_id, name, slug, description, short_description, price, original_price,
      product_type, delivery_type, delivery_content, thumbnail_url, gallery_urls, features,
      requirements, version, stock, is_active, is_featured)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    body.category_id, body.name, slug,
    body.description || null, body.short_description || null,
    body.price, body.original_price || null,
    body.product_type, body.delivery_type || 'automatic',
    body.delivery_content ? JSON.stringify(body.delivery_content) : null,
    body.thumbnail_url || null,
    body.gallery_urls ? JSON.stringify(body.gallery_urls) : null,
    body.features ? JSON.stringify(body.features) : null,
    body.requirements || null, body.version || '1.0.0',
    body.stock !== undefined ? body.stock : null,
    body.is_active !== undefined ? (body.is_active ? 1 : 0) : 1,
    body.is_featured ? 1 : 0
  ).run();

  await logActivity(env, user.id, 'create_product', 'product', result.meta.last_row_id, { name: body.name });
  return successResponse({ id: result.meta.last_row_id, slug }, 'Produto criado com sucesso!', 201);
}

async function adminUpdateProduct(id, request, env, user) {
  const product = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(id).first();
  if (!product) return errorResponse('Produto não encontrado', 404);

  let body;
  try { body = await request.json(); } catch { return errorResponse('JSON inválido'); }

  const fields = ['category_id','name','description','short_description','price','original_price',
    'product_type','delivery_type','delivery_content','thumbnail_url','gallery_urls','features',
    'requirements','version','stock','is_active','is_featured'];

  const updates = [];
  const params = [];

  for (const field of fields) {
    if (body[field] !== undefined) {
      if (['delivery_content','gallery_urls','features'].includes(field) && typeof body[field] === 'object') {
        updates.push(`${field} = ?`);
        params.push(JSON.stringify(body[field]));
      } else if (['is_active','is_featured'].includes(field)) {
        updates.push(`${field} = ?`);
        params.push(body[field] ? 1 : 0);
      } else {
        updates.push(`${field} = ?`);
        params.push(body[field]);
      }
    }
  }

  if (updates.length === 0) return errorResponse('Nenhum campo para atualizar');
  updates.push("updated_at = datetime('now')");
  params.push(id);

  await env.DB.prepare(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`).bind(...params).run();
  await logActivity(env, user.id, 'update_product', 'product', parseInt(id), { name: body.name || product.name });

  return successResponse(null, 'Produto atualizado com sucesso!');
}

async function adminDeleteProduct(id, env, user) {
  const product = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(id).first();
  if (!product) return errorResponse('Produto não encontrado', 404);

  await env.DB.prepare("UPDATE products SET is_active = 0, updated_at = datetime('now') WHERE id = ?").bind(id).run();
  await logActivity(env, user.id, 'delete_product', 'product', parseInt(id), { name: product.name });

  return successResponse(null, 'Produto desativado com sucesso!');
}

// ── CATEGORIAS ───────────────────────────────────────────────
async function adminListCategories(env) {
  const cats = await env.DB.prepare('SELECT * FROM categories ORDER BY sort_order ASC').all();
  return successResponse(cats.results);
}

async function adminCreateCategory(request, env) {
  const { error, body } = await validateBody(request, ['name']);
  if (error) return errorResponse(error);
  const slug = slugify(body.name) + '-' + Date.now();
  const result = await env.DB.prepare(
    'INSERT INTO categories (name, slug, description, icon, color, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(body.name, slug, body.description || null, body.icon || null, body.color || '#7c3aed', body.sort_order || 0).run();
  return successResponse({ id: result.meta.last_row_id }, 'Categoria criada!', 201);
}

async function adminUpdateCategory(id, request, env) {
  let body;
  try { body = await request.json(); } catch { return errorResponse('JSON inválido'); }
  const updates = [];
  const params = [];
  for (const f of ['name','description','icon','color','sort_order','is_active']) {
    if (body[f] !== undefined) { updates.push(`${f} = ?`); params.push(body[f]); }
  }
  if (!updates.length) return errorResponse('Nenhum campo');
  params.push(id);
  await env.DB.prepare(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`).bind(...params).run();
  return successResponse(null, 'Categoria atualizada!');
}

async function adminDeleteCategory(id, env) {
  await env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();
  return successResponse(null, 'Categoria removida!');
}

// ── USUÁRIOS ─────────────────────────────────────────────────
async function adminListUsers(env, url) {
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
  const search = url.searchParams.get('search');
  const offset = (page - 1) * limit;

  let query = `SELECT u.id, u.email, u.username, u.role, u.is_banned, u.ban_reason, u.bot_limit, u.created_at,
    (SELECT COUNT(*) FROM orders WHERE user_id = u.id AND status = 'paid') as total_purchases,
    (SELECT COUNT(*) FROM hosted_bots WHERE user_id = u.id) as total_bots
    FROM users u`;
  const params = [];

  if (search) {
    query += ' WHERE u.email LIKE ? OR u.username LIKE ?';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const users = await env.DB.prepare(query).bind(...params).all();
  const total = await env.DB.prepare('SELECT COUNT(*) as total FROM users').first();

  return successResponse({
    items: users.results,
    pagination: { page, limit, total: total?.total || 0, pages: Math.ceil((total?.total || 0) / limit) }
  });
}

async function adminGetUser(id, env) {
  const userData = await env.DB.prepare(
    'SELECT id, email, username, role, is_banned, ban_reason, bot_limit, avatar_url, created_at FROM users WHERE id = ?'
  ).bind(id).first();
  if (!userData) return errorResponse('Usuário não encontrado', 404);

  const [orders, bots] = await Promise.all([
    env.DB.prepare(`SELECT o.*, p.name as product_name FROM orders o JOIN products p ON o.product_id = p.id WHERE o.user_id = ? ORDER BY o.created_at DESC LIMIT 20`).bind(id).all(),
    env.DB.prepare('SELECT * FROM hosted_bots WHERE user_id = ? ORDER BY created_at DESC').bind(id).all(),
  ]);

  return successResponse({ ...userData, orders: orders.results, bots: bots.results });
}

async function adminUpdateUser(id, request, env, adminUser) {
  let body;
  try { body = await request.json(); } catch { return errorResponse('JSON inválido'); }

  const updates = [];
  const params = [];

  if (body.bot_limit !== undefined) { updates.push('bot_limit = ?'); params.push(parseInt(body.bot_limit)); }
  if (body.role !== undefined && ['user','admin'].includes(body.role)) { updates.push('role = ?'); params.push(body.role); }
  if (body.email !== undefined) { updates.push('email = ?'); params.push(body.email); }

  if (body.password) {
    const hash = await hashPassword(body.password);
    updates.push('password_hash = ?');
    params.push(hash);
  }

  if (!updates.length) return errorResponse('Nenhum campo');
  updates.push("updated_at = datetime('now')");
  params.push(id);

  await env.DB.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).bind(...params).run();
  await logActivity(env, adminUser.id, 'admin_update_user', 'user', parseInt(id), body);

  return successResponse(null, 'Usuário atualizado!');
}

async function adminBanUser(id, request, env, adminUser) {
  let body = {};
  try { body = await request.json(); } catch {}
  const reason = body.reason || 'Violação dos termos de uso';

  await env.DB.prepare("UPDATE users SET is_banned = 1, ban_reason = ?, updated_at = datetime('now') WHERE id = ?").bind(reason, id).run();
  await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id).run();
  await logActivity(env, adminUser.id, 'ban_user', 'user', parseInt(id), { reason });

  return successResponse(null, 'Usuário banido com sucesso!');
}

async function adminUnbanUser(id, env, adminUser) {
  await env.DB.prepare("UPDATE users SET is_banned = 0, ban_reason = NULL, updated_at = datetime('now') WHERE id = ?").bind(id).run();
  await logActivity(env, adminUser.id, 'unban_user', 'user', parseInt(id));
  return successResponse(null, 'Usuário desbanido com sucesso!');
}

// ── PEDIDOS ──────────────────────────────────────────────────
async function adminListOrders(env, url) {
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
  const status = url.searchParams.get('status');
  const search = url.searchParams.get('search');
  const offset = (page - 1) * limit;

  let query = `SELECT o.*, u.username, u.email, p.name as product_name FROM orders o
    JOIN users u ON o.user_id = u.id JOIN products p ON o.product_id = p.id WHERE 1=1`;
  const params = [];

  if (status) { query += ' AND o.status = ?'; params.push(status); }
  if (search) { query += ' AND (o.order_number LIKE ? OR u.username LIKE ? OR u.email LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }

  query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const orders = await env.DB.prepare(query).bind(...params).all();
  const total = await env.DB.prepare('SELECT COUNT(*) as total FROM orders').first();

  return successResponse({
    items: orders.results,
    pagination: { page, limit, total: total?.total || 0, pages: Math.ceil((total?.total || 0) / limit) }
  });
}

async function adminGetOrder(id, env) {
  const order = await env.DB.prepare(
    `SELECT o.*, u.username, u.email, p.name as product_name, p.product_type
     FROM orders o JOIN users u ON o.user_id = u.id JOIN products p ON o.product_id = p.id
     WHERE o.id = ?`
  ).bind(id).first();
  if (!order) return errorResponse('Pedido não encontrado', 404);
  return successResponse({
    ...order,
    payment_data: order.payment_data ? JSON.parse(order.payment_data) : null,
    delivery_data: order.delivery_data ? JSON.parse(order.delivery_data) : null,
  });
}

async function adminUpdateOrder(id, request, env, adminUser) {
  let body;
  try { body = await request.json(); } catch { return errorResponse('JSON inválido'); }

  const updates = [];
  const params = [];

  const allowedStatuses = ['pending','paid','delivered','cancelled','refunded'];
  if (body.status && allowedStatuses.includes(body.status)) {
    updates.push('status = ?');
    params.push(body.status);
    if (body.status === 'paid') { updates.push("paid_at = datetime('now')"); }
  }
  if (body.notes !== undefined) { updates.push('notes = ?'); params.push(body.notes); }
  if (body.delivery_data !== undefined) {
    updates.push('delivery_data = ?');
    params.push(JSON.stringify(body.delivery_data));
    updates.push("delivered_at = datetime('now')");
  }

  if (!updates.length) return errorResponse('Nenhum campo');
  updates.push("updated_at = datetime('now')");
  params.push(id);

  await env.DB.prepare(`UPDATE orders SET ${updates.join(', ')} WHERE id = ?`).bind(...params).run();
  await logActivity(env, adminUser.id, 'admin_update_order', 'order', parseInt(id), body);

  return successResponse(null, 'Pedido atualizado!');
}

// ── BOTS ─────────────────────────────────────────────────────
async function adminListBots(env, url) {
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
  const search = url.searchParams.get('search');
  const offset = (page - 1) * limit;

  let query = `SELECT b.*, u.username, u.email FROM hosted_bots b JOIN users u ON b.user_id = u.id WHERE 1=1`;
  const params = [];

  if (search) { query += ' AND (b.bot_name LIKE ? OR u.username LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

  query += ' ORDER BY b.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const bots = await env.DB.prepare(query).bind(...params).all();
  const total = await env.DB.prepare('SELECT COUNT(*) as total FROM hosted_bots').first();

  return successResponse({
    items: bots.results.map(b => ({ ...b, bot_token: b.bot_token ? '***' + b.bot_token.slice(-6) : null })),
    pagination: { page, limit, total: total?.total || 0, pages: Math.ceil((total?.total || 0) / limit) }
  });
}

async function adminUpdateBot(id, request, env) {
  let body;
  try { body = await request.json(); } catch { return errorResponse('JSON inválido'); }

  const updates = [];
  const params = [];

  const allowedStatuses = ['online','offline','error','suspended'];
  if (body.status && allowedStatuses.includes(body.status)) { updates.push('status = ?'); params.push(body.status); }
  if (body.notes !== undefined) { updates.push('notes = ?'); params.push(body.notes); }
  if (body.bot_name !== undefined) { updates.push('bot_name = ?'); params.push(body.bot_name); }

  if (!updates.length) return errorResponse('Nenhum campo');
  updates.push("updated_at = datetime('now')");
  params.push(id);

  await env.DB.prepare(`UPDATE hosted_bots SET ${updates.join(', ')} WHERE id = ?`).bind(...params).run();
  return successResponse(null, 'Bot atualizado!');
}

async function adminDeleteBot(id, env, adminUser) {
  const bot = await env.DB.prepare('SELECT * FROM hosted_bots WHERE id = ?').bind(id).first();
  if (!bot) return errorResponse('Bot não encontrado', 404);
  await env.DB.prepare('DELETE FROM hosted_bots WHERE id = ?').bind(id).run();
  await logActivity(env, adminUser.id, 'admin_delete_bot', 'bot', parseInt(id), { botName: bot.bot_name });
  return successResponse(null, 'Bot removido!');
}

// ── CONFIGURAÇÕES ─────────────────────────────────────────────
async function adminGetSettings(env) {
  const settings = await env.DB.prepare('SELECT * FROM settings ORDER BY key ASC').all();
  const obj = {};
  settings.results.forEach(s => { obj[s.key] = s.value; });
  // Mascarar segredos
  if (obj.misticpay_client_secret) obj.misticpay_client_secret = '***' + obj.misticpay_client_secret.slice(-4);
  return successResponse(obj);
}

async function adminUpdateSettings(request, env, adminUser) {
  let body;
  try { body = await request.json(); } catch { return errorResponse('JSON inválido'); }

  const sensitiveKeys = ['misticpay_client_id', 'misticpay_client_secret', 'webhook_secret', 'jwt_secret'];

  for (const [key, value] of Object.entries(body)) {
    if (typeof value !== 'string') continue;
    // Não atualizar se for valor mascarado
    if (sensitiveKeys.includes(key) && value.startsWith('***')) continue;

    await env.DB.prepare(
      "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
    ).bind(key, value).run();
  }

  await logActivity(env, adminUser.id, 'update_settings', null, null, { keys: Object.keys(body) });
  return successResponse(null, 'Configurações salvas com sucesso!');
}

// ── STATUS ────────────────────────────────────────────────────
async function adminGetStatus(env) {
  const services = await env.DB.prepare('SELECT * FROM system_status ORDER BY id ASC').all();
  return successResponse(services.results);
}

async function adminUpdateStatus(request, env, adminUser) {
  let body;
  try { body = await request.json(); } catch { return errorResponse('JSON inválido'); }

  if (!Array.isArray(body.services)) return errorResponse('services deve ser um array');

  for (const svc of body.services) {
    if (!svc.id) continue;
    await env.DB.prepare(
      "UPDATE system_status SET status = ?, message = ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(svc.status || 'operational', svc.message || null, svc.id).run();
  }

  await logActivity(env, adminUser.id, 'update_status', null, null, { count: body.services.length });
  return successResponse(null, 'Status atualizado!');
}

// ── LOGS ──────────────────────────────────────────────────────
async function adminGetLogs(env, url) {
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
  const offset = (page - 1) * limit;

  const logs = await env.DB.prepare(
    `SELECT l.*, u.username FROM activity_logs l LEFT JOIN users u ON l.user_id = u.id
     ORDER BY l.created_at DESC LIMIT ? OFFSET ?`
  ).bind(limit, offset).all();

  const total = await env.DB.prepare('SELECT COUNT(*) as total FROM activity_logs').first();

  return successResponse({
    items: logs.results,
    pagination: { page, limit, total: total?.total || 0, pages: Math.ceil((total?.total || 0) / limit) }
  });
}

// ── CUPONS ────────────────────────────────────────────────────
async function adminListCoupons(env) {
  const coupons = await env.DB.prepare('SELECT * FROM coupons ORDER BY created_at DESC').all();
  return successResponse(coupons.results);
}

async function adminCreateCoupon(request, env) {
  const { error, body } = await validateBody(request, ['code', 'discount_type', 'discount_value']);
  if (error) return errorResponse(error);

  const result = await env.DB.prepare(
    'INSERT INTO coupons (code, discount_type, discount_value, min_order_value, max_uses, expires_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(
    body.code.toUpperCase(),
    body.discount_type,
    body.discount_value,
    body.min_order_value || null,
    body.max_uses || null,
    body.expires_at || null
  ).run();

  return successResponse({ id: result.meta.last_row_id }, 'Cupom criado!', 201);
}

async function adminDeleteCoupon(id, env) {
  await env.DB.prepare('DELETE FROM coupons WHERE id = ?').bind(id).run();
  return successResponse(null, 'Cupom removido!');
}

// ── WEBHOOKS ──────────────────────────────────────────────────
async function adminGetWebhooks(env, url) {
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = 50;
  const offset = (page - 1) * limit;

  const webhooks = await env.DB.prepare(
    'SELECT id, transaction_id, event_type, processed, processed_at, created_at FROM payment_webhooks ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).bind(limit, offset).all();

  const total = await env.DB.prepare('SELECT COUNT(*) as total FROM payment_webhooks').first();

  return successResponse({
    items: webhooks.results,
    pagination: { page, limit, total: total?.total || 0, pages: Math.ceil((total?.total || 0) / limit) }
  });
}
