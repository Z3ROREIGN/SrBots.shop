/**
 * SrBots.shop - Cloudflare Worker
 * Backend completo: API REST + Servir arquivos estáticos
 * Versão: 1.3.0 (Otimizada para Cloudflare Pages & Workers Site)
 */

import { handleAuth } from './routes/auth.js';
import { handleProducts } from './routes/products.js';
import { handleOrders } from './routes/orders.js';
import { handlePayments } from './routes/payments.js';
import { handleAdmin } from './routes/admin.js';
import { handleBots } from './routes/bots.js';
import { handleStatus } from './routes/status.js';
import { handleWebhook } from './routes/webhook.js';
import { handleUser } from './routes/user.js';
import { corsHeaders, jsonResponse, errorResponse } from './utils/helpers.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Tratar preflight CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(env) });
    }

    try {
      // ── Rotas da API ──────────────────────────────────────────
      if (path.startsWith('/api/')) {
        return await handleAPI(request, env, ctx, path);
      }

      // ── Servir arquivos estáticos ─────────────────────────────
      // Se estiver usando Cloudflare Pages, os arquivos são servidos automaticamente
      // a menos que o Worker intercepte tudo. 
      return await serveStatic(request, env, path);

    } catch (err) {
      console.error('Worker error:', err);
      // Retornar o erro detalhado para ajudar o usuário a diagnosticar (D1 missing, etc)
      return errorResponse(`Erro Interno: ${err.message}. Certifique-se de que o Banco D1 e os Secrets estão configurados no painel da Cloudflare.`, 500);
    }
  }
};

async function handleAPI(request, env, ctx, path) {
  // Webhook MisticPay
  if (path === '/api/webhook/payment' || path === '/api/webhook/misticpay') {
    return await handleWebhook(request, env);
  }

  // Status público
  if (path.startsWith('/api/status')) {
    return await handleStatus(request, env);
  }

  // Autenticação
  if (path.startsWith('/api/auth/')) {
    return await handleAuth(request, env);
  }

  // Produtos
  if (path.startsWith('/api/products')) {
    return await handleProducts(request, env);
  }

  // Rotas protegidas - verificar JWT
  const authResult = await verifyAuth(request, env);

  // Pedidos
  if (path.startsWith('/api/orders')) {
    if (!authResult.user) return errorResponse('Não autorizado', 401);
    return await handleOrders(request, env, authResult.user);
  }

  // Pagamentos
  if (path.startsWith('/api/payments')) {
    if (!authResult.user) return errorResponse('Não autorizado', 401);
    return await handlePayments(request, env, authResult.user);
  }

  // Bots do usuário
  if (path.startsWith('/api/bots')) {
    if (!authResult.user) return errorResponse('Não autorizado', 401);
    return await handleBots(request, env, authResult.user);
  }

  // Perfil do usuário
  if (path.startsWith('/api/user')) {
    if (!authResult.user) return errorResponse('Não autorizado', 401);
    return await handleUser(request, env, authResult.user);
  }

  // Painel Admin
  if (path.startsWith('/api/admin')) {
    if (!authResult.user) return errorResponse('Não autorizado', 401);
    if (authResult.user.role !== 'admin') return errorResponse('Acesso negado', 403);
    return await handleAdmin(request, env, authResult.user);
  }

  return errorResponse('Rota não encontrada', 404);
}

async function verifyAuth(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null };
  }

  const token = authHeader.substring(7);
  try {
    const payload = await verifyJWT(token, env.JWT_SECRET);
    if (!payload) return { user: null };

    const session = await env.DB.prepare(
      'SELECT s.*, u.id as uid, u.email, u.username, u.role, u.is_banned, u.bot_limit FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.id = ? AND s.expires_at > datetime("now")'
    ).bind(payload.sessionId).first();

    if (!session || session.is_banned) return { user: null };

    return {
      user: {
        id: session.uid,
        email: session.email,
        username: session.username,
        role: session.role,
        bot_limit: session.bot_limit,
        sessionId: payload.sessionId
      }
    };
  } catch {
    return { user: null };
  }
}

async function verifyJWT(token, secret) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false, ['sign', 'verify']
    );

    const data = encoder.encode(`${parts[0]}.${parts[1]}`);
    const sig = base64UrlDecode(parts[2]);
    const valid = await crypto.subtle.verify('HMAC', key, sig, data);
    if (!valid) return null;

    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

function base64UrlDecode(str) {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function serveStatic(request, env, path) {
  // Se houver ASSETS (Workers Site), tentamos carregar do KV
  if (env.ASSETS) {
    const routes = {
      '/': '/index.html',
      '/loja': '/pages/store.html',
      '/produto': '/pages/product.html',
      '/checkout': '/pages/checkout.html',
      '/login': '/pages/login.html',
      '/registro': '/pages/register.html',
      '/dashboard': '/pages/dashboard.html',
      '/admin': '/pages/admin.html',
      '/status': '/pages/status.html',
    };

    let filePath = routes[path] || path;
    if (!filePath.startsWith('/')) filePath = '/' + filePath;

    try {
      const assetUrl = new URL(request.url);
      assetUrl.pathname = filePath;
      let response = await env.ASSETS.fetch(new Request(assetUrl.toString(), request));
      
      if (response.status === 404 && !filePath.includes('.')) {
        const indexUrl = new URL(request.url);
        indexUrl.pathname = '/index.html';
        response = await env.ASSETS.fetch(new Request(indexUrl.toString(), request));
      }
      
      if (response.status !== 404) return response;
    } catch (e) {
      console.error('KV Asset fetch error:', e);
    }
  }

  // Fallback final: Deixa o Cloudflare lidar com o request original
  // Isso é crucial para Cloudflare Pages e para evitar timeouts (Erro 522)
  return fetch(request);
}
