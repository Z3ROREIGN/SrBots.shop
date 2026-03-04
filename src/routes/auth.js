/**
 * SrBots.shop - Rotas de Autenticação
 */

import {
  jsonResponse, errorResponse, successResponse,
  hashPassword, verifyPassword, createJWT,
  generateId, logActivity, getClientIP, validateBody
} from '../utils/helpers.js';

export async function handleAuth(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // POST /api/auth/register
  if (path === '/api/auth/register' && method === 'POST') {
    return await register(request, env);
  }

  // POST /api/auth/login
  if (path === '/api/auth/login' && method === 'POST') {
    return await login(request, env);
  }

  // POST /api/auth/logout
  if (path === '/api/auth/logout' && method === 'POST') {
    return await logout(request, env);
  }

  // POST /api/auth/refresh
  if (path === '/api/auth/refresh' && method === 'POST') {
    return await refresh(request, env);
  }

  return errorResponse('Rota não encontrada', 404);
}

async function register(request, env) {
  const { error, body } = await validateBody(request, ['email', 'username', 'password']);
  if (error) return errorResponse(error);

  const { email, username, password } = body;

  // Verificar se registro está habilitado
  const regEnabled = await env.DB.prepare("SELECT value FROM settings WHERE key = 'registration_enabled'").first();
  if (regEnabled?.value === '0') {
    return errorResponse('Registro de novos usuários está desabilitado no momento', 403);
  }

  // Validações
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return errorResponse('Email inválido');
  }
  if (username.length < 3 || username.length > 30) {
    return errorResponse('Username deve ter entre 3 e 30 caracteres');
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return errorResponse('Username deve conter apenas letras, números e underscore');
  }
  if (password.length < 6) {
    return errorResponse('Senha deve ter pelo menos 6 caracteres');
  }

  // Verificar duplicados
  const existing = await env.DB.prepare(
    'SELECT id FROM users WHERE email = ? OR username = ?'
  ).bind(email.toLowerCase(), username.toLowerCase()).first();

  if (existing) {
    return errorResponse('Email ou username já está em uso');
  }

  // Buscar limite padrão de bots
  const defaultLimit = await env.DB.prepare("SELECT value FROM settings WHERE key = 'default_bot_limit'").first();
  const botLimit = parseInt(defaultLimit?.value || '1');

  // Criar usuário
  const passwordHash = await hashPassword(password);
  const result = await env.DB.prepare(
    'INSERT INTO users (email, username, password_hash, bot_limit) VALUES (?, ?, ?, ?)'
  ).bind(email.toLowerCase(), username.toLowerCase(), passwordHash, botLimit).run();

  const userId = result.meta.last_row_id;

  // Criar sessão
  const { token, sessionId } = await createSession(userId, request, env);

  await logActivity(env, userId, 'register', 'user', userId, { email, username }, getClientIP(request));

  return successResponse({
    token,
    user: { id: userId, email: email.toLowerCase(), username: username.toLowerCase(), role: 'user' }
  }, 'Conta criada com sucesso!', 201);
}

async function login(request, env) {
  const { error, body } = await validateBody(request, ['email', 'password']);
  if (error) return errorResponse(error);

  const { email, password } = body;

  const user = await env.DB.prepare(
    'SELECT * FROM users WHERE email = ?'
  ).bind(email.toLowerCase()).first();

  if (!user) return errorResponse('Email ou senha incorretos', 401);

  if (user.is_banned) {
    return errorResponse(`Conta banida. Motivo: ${user.ban_reason || 'Violação dos termos de uso'}`, 403);
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) return errorResponse('Email ou senha incorretos', 401);

  // Limpar sessões antigas
  await env.DB.prepare(
    'DELETE FROM sessions WHERE user_id = ? AND expires_at < datetime("now")'
  ).bind(user.id).run();

  const { token } = await createSession(user.id, request, env);

  await logActivity(env, user.id, 'login', 'user', user.id, { email }, getClientIP(request));

  return successResponse({
    token,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      avatar_url: user.avatar_url,
      bot_limit: user.bot_limit
    }
  }, 'Login realizado com sucesso!');
}

async function logout(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    // Extrair sessionId do token sem verificar (já que estamos fazendo logout)
    try {
      const parts = token.split('.');
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (payload.sessionId) {
        await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(payload.sessionId).run();
      }
    } catch {}
  }
  return successResponse(null, 'Logout realizado com sucesso');
}

async function refresh(request, env) {
  // O middleware principal já verifica o token, aqui apenas retornamos novo token
  return errorResponse('Use o endpoint de login para obter novo token', 400);
}

async function createSession(userId, request, env) {
  const sessionId = generateId(32);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);

  await env.DB.prepare(
    'INSERT INTO sessions (id, user_id, ip_address, user_agent, expires_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(
    sessionId,
    userId,
    getClientIP(request),
    request.headers.get('User-Agent')?.substring(0, 255) || null,
    expiresAt
  ).run();

  const token = await createJWT({ sessionId, userId }, env.JWT_SECRET, 7 * 24 * 60 * 60);
  return { token, sessionId };
}
