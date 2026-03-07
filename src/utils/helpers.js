/**
 * SrBots.shop - Utilitários e Helpers
 * Funções auxiliares para autenticação, validação, formatação e logging
 */

/**
 * Retorna headers CORS configurados
 * @param {Object} env - Variáveis de ambiente
 * @returns {Object} Headers CORS
 */
export function corsHeaders(env) {
  const origin = env?.ALLOWED_ORIGIN || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * Retorna resposta JSON com CORS headers
 * @param {*} data - Dados a serializar
 * @param {number} status - Status HTTP
 * @param {Object} env - Variáveis de ambiente
 * @returns {Response} Resposta HTTP
 */
export function jsonResponse(data, status = 200, env = null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(env),
    },
  });
}

/**
 * Retorna resposta de erro
 * @param {string} message - Mensagem de erro
 * @param {number} status - Status HTTP
 * @param {*} details - Detalhes adicionais
 * @returns {Response} Resposta HTTP
 */
export function errorResponse(message, status = 400, details = null) {
  return new Response(JSON.stringify({ error: message, details }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(),
    },
  });
}

/**
 * Retorna resposta de sucesso
 * @param {*} data - Dados da resposta
 * @param {string} message - Mensagem de sucesso
 * @param {number} status - Status HTTP
 * @returns {Response} Resposta HTTP
 */
export function successResponse(data, message = 'Sucesso', status = 200) {
  return new Response(JSON.stringify({ success: true, message, data }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(),
    },
  });
}

/**
 * Hash de senha usando SHA-256
 * @param {string} password - Senha em texto plano
 * @returns {Promise<string>} Hash em base64
 */
export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

/**
 * Verifica se a senha corresponde ao hash
 * @param {string} password - Senha em texto plano
 * @param {string} hash - Hash armazenado
 * @returns {Promise<boolean>} True se a senha é válida
 */
export async function verifyPassword(password, hash) {
  const computed = await hashPassword(password);
  return computed === hash;
}

/**
 * Cria um JWT assinado
 * @param {Object} payload - Dados do token
 * @param {string} secret - Chave secreta
 * @param {number} expiresInSeconds - Tempo de expiração em segundos
 * @returns {Promise<string>} Token JWT
 */
export async function createJWT(payload, secret, expiresInSeconds = 86400) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now, exp: now + expiresInSeconds };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(fullPayload))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(`${headerB64}.${payloadB64}`));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${headerB64}.${payloadB64}.${sigB64}`;
}

/**
 * Gera um ID aleatório
 * @param {number} length - Comprimento do ID
 * @returns {string} ID aleatório
 */
export function generateId(length = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length];
  }
  return result;
}

/**
 * Gera um número de pedido único
 * @returns {string} Número do pedido (ex: SRB240307XXXXX)
 */
export function generateOrderNumber() {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 99999)
    .toString()
    .padStart(5, '0');
  return `SRB${year}${month}${day}${random}`;
}

/**
 * Converte texto para slug (URL-friendly)
 * @param {string} text - Texto a converter
 * @returns {string} Slug
 */
export function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * Formata valor em moeda BRL
 * @param {number} value - Valor a formatar
 * @returns {string} Valor formatado
 */
export function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Registra atividade do usuário
 * @param {Object} env - Variáveis de ambiente
 * @param {number} userId - ID do usuário
 * @param {string} action - Ação realizada
 * @param {string} entityType - Tipo de entidade
 * @param {number} entityId - ID da entidade
 * @param {Object} details - Detalhes adicionais
 * @param {string} ip - IP do cliente
 * @returns {Promise<void>}
 */
export async function logActivity(
  env,
  userId,
  action,
  entityType = null,
  entityId = null,
  details = null,
  ip = null
) {
  try {
    await env.DB.prepare(
      'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)'
    )
      .bind(userId, action, entityType, entityId, details ? JSON.stringify(details) : null, ip)
      .run();
  } catch (e) {
    console.error('Log activity error:', e);
  }
}

/**
 * Obtém o IP do cliente a partir do request
 * @param {Request} request - Request HTTP
 * @returns {string} IP do cliente
 */
export function getClientIP(request) {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

/**
 * Valida e parseia o body do request
 * @param {Request} request - Request HTTP
 * @param {string[]} requiredFields - Campos obrigatórios
 * @returns {Promise<Object>} { error, body }
 */
export async function validateBody(request, requiredFields = []) {
  let body;
  try {
    body = await request.json();
  } catch {
    return { error: 'JSON inválido', body: null };
  }

  for (const field of requiredFields) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      return { error: `Campo obrigatório: ${field}`, body: null };
    }
  }

  return { error: null, body };
}
