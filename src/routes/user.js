/**
 * SrBots.shop - Rotas do Usuário
 */

import { errorResponse, successResponse, hashPassword, verifyPassword, validateBody } from '../utils/helpers.js';

export async function handleUser(request, env, user) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // GET /api/user/profile - Perfil do usuário
  if (path === '/api/user/profile' && method === 'GET') {
    return await getProfile(env, user);
  }

  // PUT /api/user/profile - Atualizar perfil
  if (path === '/api/user/profile' && method === 'PUT') {
    return await updateProfile(request, env, user);
  }

  // PUT /api/user/password - Alterar senha
  if (path === '/api/user/password' && method === 'PUT') {
    return await changePassword(request, env, user);
  }

  // GET /api/user/purchases - Compras do usuário
  if (path === '/api/user/purchases' && method === 'GET') {
    return await getPurchases(env, user);
  }

  // GET /api/user/dashboard - Dados do dashboard
  if (path === '/api/user/dashboard' && method === 'GET') {
    return await getDashboard(env, user);
  }

  return errorResponse('Rota não encontrada', 404);
}

async function getProfile(env, user) {
  const userData = await env.DB.prepare(
    'SELECT id, email, username, avatar_url, discord_id, discord_username, role, bot_limit, created_at FROM users WHERE id = ?'
  ).bind(user.id).first();

  if (!userData) return errorResponse('Usuário não encontrado', 404);

  return successResponse(userData);
}

async function updateProfile(request, env, user) {
  let body;
  try { body = await request.json(); } catch { return errorResponse('JSON inválido'); }

  const updates = [];
  const params = [];

  if (body.username !== undefined) {
    if (body.username.length < 3 || body.username.length > 30) {
      return errorResponse('Username deve ter entre 3 e 30 caracteres');
    }
    if (!/^[a-zA-Z0-9_]+$/.test(body.username)) {
      return errorResponse('Username inválido');
    }
    // Verificar duplicado
    const existing = await env.DB.prepare(
      'SELECT id FROM users WHERE username = ? AND id != ?'
    ).bind(body.username.toLowerCase(), user.id).first();
    if (existing) return errorResponse('Username já está em uso');

    updates.push('username = ?');
    params.push(body.username.toLowerCase());
  }

  if (body.avatar_url !== undefined) {
    updates.push('avatar_url = ?');
    params.push(body.avatar_url);
  }

  if (updates.length === 0) return errorResponse('Nenhum campo para atualizar');

  updates.push("updated_at = datetime('now')");
  params.push(user.id);

  await env.DB.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).bind(...params).run();

  return successResponse(null, 'Perfil atualizado com sucesso!');
}

async function changePassword(request, env, user) {
  const { error, body } = await validateBody(request, ['current_password', 'new_password']);
  if (error) return errorResponse(error);

  const { current_password, new_password } = body;

  if (new_password.length < 6) {
    return errorResponse('Nova senha deve ter pelo menos 6 caracteres');
  }

  const userData = await env.DB.prepare('SELECT password_hash FROM users WHERE id = ?').bind(user.id).first();
  const valid = await verifyPassword(current_password, userData.password_hash);

  if (!valid) return errorResponse('Senha atual incorreta');

  const newHash = await hashPassword(new_password);
  await env.DB.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").bind(newHash, user.id).run();

  // Invalidar todas as sessões
  await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id).run();

  return successResponse(null, 'Senha alterada com sucesso! Faça login novamente.');
}

async function getPurchases(env, user) {
  const purchases = await env.DB.prepare(
    `SELECT o.id, o.order_number, o.status, o.total_price, o.paid_at, o.delivery_data,
            p.name as product_name, p.thumbnail_url, p.product_type, p.delivery_type, p.version
     FROM orders o
     JOIN products p ON o.product_id = p.id
     WHERE o.user_id = ? AND o.status = 'paid'
     ORDER BY o.paid_at DESC`
  ).bind(user.id).all();

  return successResponse(purchases.results.map(p => ({
    ...p,
    delivery_data: p.delivery_data ? JSON.parse(p.delivery_data) : null,
  })));
}

async function getDashboard(env, user) {
  const [bots, purchases, orders] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) as total, SUM(CASE WHEN status='online' THEN 1 ELSE 0 END) as online FROM hosted_bots WHERE user_id = ?").bind(user.id).first(),
    env.DB.prepare("SELECT COUNT(*) as total FROM orders WHERE user_id = ? AND status = 'paid'").bind(user.id).first(),
    env.DB.prepare("SELECT COUNT(*) as total FROM orders WHERE user_id = ? AND status = 'pending'").bind(user.id).first(),
  ]);

  return successResponse({
    bots: { total: bots?.total || 0, online: bots?.online || 0, limit: user.bot_limit },
    purchases: purchases?.total || 0,
    pending_orders: orders?.total || 0,
  });
}
