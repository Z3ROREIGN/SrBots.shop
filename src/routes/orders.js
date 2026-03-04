/**
 * SrBots.shop - Rotas de Pedidos
 */

import {
  errorResponse, successResponse,
  generateOrderNumber, logActivity, getClientIP, validateBody
} from '../utils/helpers.js';

export async function handleOrders(request, env, user) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // GET /api/orders - Listar pedidos do usuário
  if (path === '/api/orders' && method === 'GET') {
    return await listOrders(env, user);
  }

  // POST /api/orders - Criar pedido
  if (path === '/api/orders' && method === 'POST') {
    return await createOrder(request, env, user);
  }

  // GET /api/orders/:id - Detalhe do pedido
  const orderMatch = path.match(/^\/api\/orders\/([^\/]+)$/);
  if (orderMatch && method === 'GET') {
    return await getOrder(orderMatch[1], env, user);
  }

  return errorResponse('Rota não encontrada', 404);
}

async function listOrders(env, user) {
  const orders = await env.DB.prepare(
    `SELECT o.*, p.name as product_name, p.thumbnail_url, p.product_type
     FROM orders o
     JOIN products p ON o.product_id = p.id
     WHERE o.user_id = ?
     ORDER BY o.created_at DESC`
  ).bind(user.id).all();

  return successResponse(orders.results);
}

async function createOrder(request, env, user) {
  const { error, body } = await validateBody(request, ['product_id', 'payer_name', 'payer_document']);
  if (error) return errorResponse(error);

  const { product_id, payer_name, payer_document, coupon_code } = body;

  // Verificar produto
  const product = await env.DB.prepare(
    'SELECT * FROM products WHERE id = ? AND is_active = 1'
  ).bind(product_id).first();

  if (!product) return errorResponse('Produto não encontrado');

  // Verificar estoque
  if (product.stock !== null && product.stock <= 0) {
    return errorResponse('Produto fora de estoque');
  }

  // Verificar se já comprou este produto
  const existingOrder = await env.DB.prepare(
    'SELECT id FROM orders WHERE user_id = ? AND product_id = ? AND status = "paid"'
  ).bind(user.id, product_id).first();

  if (existingOrder) {
    return errorResponse('Você já adquiriu este produto. Acesse sua área de downloads.');
  }

  let finalPrice = product.price;
  let couponData = null;

  // Aplicar cupom
  if (coupon_code) {
    const coupon = await env.DB.prepare(
      'SELECT * FROM coupons WHERE code = ? AND is_active = 1 AND (expires_at IS NULL OR expires_at > datetime("now")) AND (max_uses IS NULL OR uses_count < max_uses)'
    ).bind(coupon_code.toUpperCase()).first();

    if (!coupon) return errorResponse('Cupom inválido ou expirado');
    if (coupon.min_order_value && finalPrice < coupon.min_order_value) {
      return errorResponse(`Valor mínimo para este cupom: R$ ${coupon.min_order_value.toFixed(2)}`);
    }

    if (coupon.discount_type === 'percentage') {
      finalPrice = finalPrice * (1 - coupon.discount_value / 100);
    } else {
      finalPrice = Math.max(0, finalPrice - coupon.discount_value);
    }
    couponData = coupon;
  }

  finalPrice = Math.round(finalPrice * 100) / 100;

  // Buscar configurações MisticPay
  const settings = await env.DB.prepare(
    "SELECT key, value FROM settings WHERE key IN ('misticpay_client_id', 'misticpay_client_secret', 'payment_expiry_minutes', 'site_url')"
  ).all();

  const cfg = {};
  settings.results.forEach(s => { cfg[s.key] = s.value; });

  if (!cfg.misticpay_client_id || !cfg.misticpay_client_secret) {
    return errorResponse('Sistema de pagamento não configurado. Entre em contato com o suporte.');
  }

  const orderNumber = generateOrderNumber();
  const expiryMinutes = parseInt(cfg.payment_expiry_minutes || '30');
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);

  // Criar transação na MisticPay
  let paymentData;
  try {
    const webhookUrl = `${cfg.site_url || 'https://srbots.shop'}/api/webhook/payment`;
    const mpResponse = await fetch('https://api.misticpay.com/api/transactions/create', {
      method: 'POST',
      headers: {
        'ci': cfg.misticpay_client_id,
        'cs': cfg.misticpay_client_secret,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: finalPrice,
        payerName: payer_name,
        payerDocument: payer_document.replace(/\D/g, ''),
        transactionId: orderNumber,
        description: `SrBots - ${product.name}`,
        projectWebhook: webhookUrl,
      }),
    });

    const mpData = await mpResponse.json();
    if (!mpResponse.ok || !mpData.data) {
      console.error('MisticPay error:', mpData);
      return errorResponse('Erro ao gerar pagamento. Tente novamente.');
    }

    paymentData = mpData.data;
  } catch (e) {
    console.error('MisticPay fetch error:', e);
    return errorResponse('Erro de conexão com gateway de pagamento');
  }

  // Criar pedido no banco
  const result = await env.DB.prepare(
    `INSERT INTO orders (order_number, user_id, product_id, quantity, unit_price, total_price, payment_id, payment_data, payer_name, payer_document, expires_at)
     VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    orderNumber,
    user.id,
    product_id,
    product.price,
    finalPrice,
    paymentData.transactionId,
    JSON.stringify(paymentData),
    payer_name,
    payer_document.replace(/\D/g, ''),
    expiresAt
  ).run();

  // Incrementar uso do cupom
  if (couponData) {
    await env.DB.prepare('UPDATE coupons SET uses_count = uses_count + 1 WHERE id = ?').bind(couponData.id).run();
  }

  await logActivity(env, user.id, 'create_order', 'order', result.meta.last_row_id, { orderNumber, productId: product_id, amount: finalPrice }, getClientIP(request));

  return successResponse({
    order_id: result.meta.last_row_id,
    order_number: orderNumber,
    product_name: product.name,
    amount: finalPrice,
    expires_at: expiresAt,
    payment: {
      transaction_id: paymentData.transactionId,
      qr_code_base64: paymentData.qrCodeBase64,
      qr_code_url: paymentData.qrcodeUrl,
      copy_paste: paymentData.copyPaste,
    }
  }, 'Pedido criado! Realize o pagamento via Pix.', 201);
}

async function getOrder(orderId, env, user) {
  const order = await env.DB.prepare(
    `SELECT o.*, p.name as product_name, p.thumbnail_url, p.product_type, p.delivery_type
     FROM orders o JOIN products p ON o.product_id = p.id
     WHERE o.id = ? AND o.user_id = ?`
  ).bind(orderId, user.id).first();

  if (!order) return errorResponse('Pedido não encontrado', 404);

  return successResponse({
    ...order,
    payment_data: order.payment_data ? JSON.parse(order.payment_data) : null,
    delivery_data: order.delivery_data ? JSON.parse(order.delivery_data) : null,
  });
}
