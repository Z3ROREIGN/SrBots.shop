/**
 * SrBots.shop - Rotas de Bots Hospedados
 */

import { errorResponse, successResponse, validateBody, logActivity, getClientIP } from '../utils/helpers.js';

export async function handleBots(request, env, user) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // GET /api/bots - Listar bots do usuário
  if (path === '/api/bots' && method === 'GET') {
    return await listBots(env, user);
  }

  // POST /api/bots - Adicionar bot
  if (path === '/api/bots' && method === 'POST') {
    return await addBot(request, env, user);
  }

  // PUT /api/bots/:id - Atualizar bot
  const botMatch = path.match(/^\/api\/bots\/(\d+)$/);
  if (botMatch && method === 'PUT') {
    return await updateBot(botMatch[1], request, env, user);
  }

  // DELETE /api/bots/:id - Remover bot
  if (botMatch && method === 'DELETE') {
    return await deleteBot(botMatch[1], env, user);
  }

  return errorResponse('Rota não encontrada', 404);
}

async function listBots(env, user) {
  const bots = await env.DB.prepare(
    'SELECT b.*, o.order_number FROM hosted_bots b LEFT JOIN orders o ON b.order_id = o.id WHERE b.user_id = ? ORDER BY b.created_at DESC'
  ).bind(user.id).all();

  return successResponse(bots.results.map(b => ({
    ...b,
    config_data: b.config_data ? JSON.parse(b.config_data) : null,
    bot_token: b.bot_token ? '***' + b.bot_token.slice(-6) : null, // Mascarar token
  })));
}

async function addBot(request, env, user) {
  const { error, body } = await validateBody(request, ['bot_name']);
  if (error) return errorResponse(error);

  // Verificar limite de bots
  const botCount = await env.DB.prepare(
    "SELECT COUNT(*) as count FROM hosted_bots WHERE user_id = ? AND status != 'deleted'"
  ).bind(user.id).first();

  if (botCount.count >= user.bot_limit) {
    return errorResponse(`Você atingiu o limite de ${user.bot_limit} bot(s). Contate o suporte para aumentar seu limite.`);
  }

  const { bot_name, bot_token, bot_type, server_name, notes } = body;

  const result = await env.DB.prepare(
    'INSERT INTO hosted_bots (user_id, bot_name, bot_token, bot_type, server_name, notes) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(user.id, bot_name, bot_token || null, bot_type || 'discord', server_name || null, notes || null).run();

  await logActivity(env, user.id, 'add_bot', 'bot', result.meta.last_row_id, { botName: bot_name }, getClientIP(request));

  return successResponse({ id: result.meta.last_row_id }, 'Bot adicionado com sucesso!', 201);
}

async function updateBot(botId, request, env, user) {
  const bot = await env.DB.prepare(
    'SELECT * FROM hosted_bots WHERE id = ? AND user_id = ?'
  ).bind(botId, user.id).first();

  if (!bot) return errorResponse('Bot não encontrado', 404);

  let body;
  try { body = await request.json(); } catch { return errorResponse('JSON inválido'); }

  const updates = [];
  const params = [];

  if (body.bot_name !== undefined) { updates.push('bot_name = ?'); params.push(body.bot_name); }
  if (body.bot_token !== undefined) { updates.push('bot_token = ?'); params.push(body.bot_token); }
  if (body.server_name !== undefined) { updates.push('server_name = ?'); params.push(body.server_name); }
  if (body.notes !== undefined) { updates.push('notes = ?'); params.push(body.notes); }

  if (updates.length === 0) return errorResponse('Nenhum campo para atualizar');

  updates.push("updated_at = datetime('now')");
  params.push(botId);

  await env.DB.prepare(`UPDATE hosted_bots SET ${updates.join(', ')} WHERE id = ?`).bind(...params).run();

  return successResponse(null, 'Bot atualizado com sucesso!');
}

async function deleteBot(botId, env, user) {
  const bot = await env.DB.prepare(
    'SELECT * FROM hosted_bots WHERE id = ? AND user_id = ?'
  ).bind(botId, user.id).first();

  if (!bot) return errorResponse('Bot não encontrado', 404);

  await env.DB.prepare('DELETE FROM hosted_bots WHERE id = ?').bind(botId).run();

  await logActivity(env, user.id, 'delete_bot', 'bot', botId, { botName: bot.bot_name });

  return successResponse(null, 'Bot removido com sucesso!');
}
