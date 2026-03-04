/**
 * SrBots.shop - Rotas de Pagamentos
 */

import { errorResponse, successResponse, logActivity, getClientIP } from '../utils/helpers.js';

export async function handlePayments(request, env, user) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // POST /api/payments/check/:orderId - Verificar status do pagamento
  const checkMatch = path.match(/^\/api\/payments\/check\/(\d+)$/);
  if (checkMatch && method === 'POST') {
    return await checkPayment(checkMatch[1], env, user);
  }

  // GET /api/payments/status/:orderId - Status do pedido
  const statusMatch = path.match(/^\/api\/payments\/status\/(\d+)$/);
  if (statusMatch && method === 'GET') {
    return await getPaymentStatus(statusMatch[1], env, user);
  }

  return errorResponse('Rota não encontrada', 404);
}

async function checkPayment(orderId, env, user) {
  const order = await env.DB.prepare(
    'SELECT * FROM orders WHERE id = ? AND user_id = ?'
  ).bind(orderId, user.id).first();

  if (!order) return errorResponse('Pedido não encontrado', 404);

  if (order.status === 'paid') {
    return successResponse({ status: 'paid', order_id: order.id }, 'Pagamento confirmado!');
  }

  if (order.status === 'cancelled') {
    return successResponse({ status: 'cancelled' }, 'Pedido cancelado');
  }

  // Verificar expiração
  if (order.expires_at && new Date(order.expires_at) < new Date()) {
    await env.DB.prepare("UPDATE orders SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?").bind(order.id).run();
    return successResponse({ status: 'expired' }, 'Pagamento expirado');
  }

  if (!order.payment_id) {
    return successResponse({ status: 'pending' }, 'Aguardando pagamento');
  }

  // Consultar MisticPay
  const settings = await env.DB.prepare(
    "SELECT key, value FROM settings WHERE key IN ('misticpay_client_id', 'misticpay_client_secret')"
  ).all();

  const cfg = {};
  settings.results.forEach(s => { cfg[s.key] = s.value; });

  try {
    const mpResponse = await fetch('https://api.misticpay.com/api/transactions/check', {
      method: 'POST',
      headers: {
        'ci': cfg.misticpay_client_id,
        'cs': cfg.misticpay_client_secret,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ transactionId: order.payment_id }),
    });

    const mpData = await mpResponse.json();

    if (mpData.transaction?.transactionState === 'COMPLETO') {
      // Processar pagamento
      await processPayment(order, env, user);
      return successResponse({ status: 'paid', order_id: order.id }, 'Pagamento confirmado!');
    }

    if (mpData.transaction?.transactionState === 'FALHA') {
      await env.DB.prepare("UPDATE orders SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?").bind(order.id).run();
      return successResponse({ status: 'failed' }, 'Pagamento falhou');
    }

    return successResponse({ status: 'pending' }, 'Aguardando confirmação do pagamento');
  } catch (e) {
    console.error('Check payment error:', e);
    return successResponse({ status: 'pending' }, 'Verificando pagamento...');
  }
}

async function getPaymentStatus(orderId, env, user) {
  const order = await env.DB.prepare(
    `SELECT o.id, o.order_number, o.status, o.total_price, o.payment_data, o.delivery_data, o.expires_at, o.paid_at,
            p.name as product_name, p.product_type, p.delivery_type
     FROM orders o JOIN products p ON o.product_id = p.id
     WHERE o.id = ? AND o.user_id = ?`
  ).bind(orderId, user.id).first();

  if (!order) return errorResponse('Pedido não encontrado', 404);

  const paymentData = order.payment_data ? JSON.parse(order.payment_data) : null;

  return successResponse({
    id: order.id,
    order_number: order.order_number,
    status: order.status,
    total_price: order.total_price,
    product_name: order.product_name,
    product_type: order.product_type,
    expires_at: order.expires_at,
    paid_at: order.paid_at,
    pix: order.status === 'pending' ? {
      copy_paste: paymentData?.copyPaste,
      qr_code_base64: paymentData?.qrCodeBase64,
      qr_code_url: paymentData?.qrcodeUrl,
    } : null,
    delivery: order.status === 'paid' ? (order.delivery_data ? JSON.parse(order.delivery_data) : null) : null,
  });
}

export async function processPayment(order, env, user = null) {
  // Buscar produto
  const product = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(order.product_id).first();
  if (!product) return;

  // Preparar dados de entrega
  let deliveryData = null;
  if (product.delivery_type === 'automatic' && product.delivery_content) {
    deliveryData = JSON.parse(product.delivery_content);
  }

  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

  // Atualizar pedido
  await env.DB.prepare(
    "UPDATE orders SET status = 'paid', paid_at = ?, delivered_at = ?, delivery_data = ?, updated_at = datetime('now') WHERE id = ?"
  ).bind(now, product.delivery_type === 'automatic' ? now : null, deliveryData ? JSON.stringify(deliveryData) : null, order.id).run();

  // Decrementar estoque
  if (product.stock !== null) {
    await env.DB.prepare('UPDATE products SET stock = MAX(0, stock - 1), sales_count = sales_count + 1 WHERE id = ?').bind(product.id).run();
  } else {
    await env.DB.prepare('UPDATE products SET sales_count = sales_count + 1 WHERE id = ?').bind(product.id).run();
  }

  await logActivity(env, order.user_id, 'payment_confirmed', 'order', order.id, {
    orderNumber: order.order_number,
    amount: order.total_price
  });
}
