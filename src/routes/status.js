/**
 * SrBots.shop - Rotas de Status
 */

import { successResponse, errorResponse } from '../utils/helpers.js';

export async function handleStatus(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  if (path === '/api/status' && method === 'GET') {
    return await getStatus(env);
  }

  return errorResponse('Rota não encontrada', 404);
}

async function getStatus(env) {
  try {
    // Verificar se o banco de dados está acessível
    if (!env.DB) {
      return errorResponse('Banco de dados D1 não vinculado corretamente no Cloudflare', 500);
    }

    const services = await env.DB.prepare(
      'SELECT * FROM system_status ORDER BY id ASC'
    ).all();

    if (!services || !services.results) {
      return errorResponse('Falha ao ler status do sistema. Verifique se o schema SQL foi executado.', 500);
    }

    const allOperational = services.results.every(s => s.status === 'operational');
    const hasOutage = services.results.some(s => s.status === 'outage');

    const overallStatus = hasOutage ? 'outage' : (allOperational ? 'operational' : 'degraded');

    // Estatísticas públicas
    const stats = await env.DB.prepare(
      `SELECT
        (SELECT COUNT(*) FROM users WHERE role = 'user') as total_users,
        (SELECT COUNT(*) FROM orders WHERE status = 'paid') as total_orders,
        (SELECT COUNT(*) FROM products WHERE is_active = 1) as total_products,
        (SELECT COUNT(*) FROM hosted_bots WHERE status = 'online') as bots_online`
    ).first();

    return successResponse({
      overall: overallStatus,
      services: services.results,
      stats: {
        users: stats?.total_users || 0,
        orders: stats?.total_orders || 0,
        products: stats?.total_products || 0,
        bots_online: stats?.bots_online || 0,
      },
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Status API error:', err);
    return errorResponse(`Erro na API de Status: ${err.message}`, 500);
  }
}
