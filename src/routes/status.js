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
  const services = await env.DB.prepare(
    'SELECT * FROM system_status ORDER BY id ASC'
  ).all();

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
}
