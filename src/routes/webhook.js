/**
 * SrBots.shop - Webhook MisticPay
 */

import { processPayment } from './payments.js';

export async function handleWebhook(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  console.log('Webhook received:', JSON.stringify(payload));

  // Salvar webhook no banco para auditoria
  try {
    await env.DB.prepare(
      'INSERT INTO payment_webhooks (transaction_id, event_type, payload) VALUES (?, ?, ?)'
    ).bind(
      payload.data?.transactionId || payload.transaction?.transactionId || 'unknown',
      payload.event || 'DEPOSIT',
      JSON.stringify(payload)
    ).run();
  } catch (e) {
    console.error('Webhook save error:', e);
  }

  // Processar evento de depósito (pagamento recebido)
  if (payload.event === 'DEPOSIT' || payload.data?.transactionState === 'COMPLETO') {
    const transactionId = payload.data?.transactionId || payload.transaction?.transactionId;
    const clientTransactionId = payload.data?.clientTransactionId;

    if (!transactionId && !clientTransactionId) {
      return new Response('OK', { status: 200 });
    }

    try {
      // Buscar pedido pelo payment_id (transactionId da MisticPay) ou order_number (clientTransactionId)
      let order = null;

      if (transactionId) {
        order = await env.DB.prepare(
          "SELECT * FROM orders WHERE payment_id = ? AND status = 'pending'"
        ).bind(String(transactionId)).first();
      }

      if (!order && clientTransactionId) {
        order = await env.DB.prepare(
          "SELECT * FROM orders WHERE order_number = ? AND status = 'pending'"
        ).bind(clientTransactionId).first();
      }

      if (order) {
        await processPayment(order, env);

        // Marcar webhook como processado
        await env.DB.prepare(
          "UPDATE payment_webhooks SET processed = 1, processed_at = datetime('now') WHERE transaction_id = ? AND processed = 0"
        ).bind(String(transactionId)).run();
      }
    } catch (e) {
      console.error('Webhook process error:', e);
    }
  }

  return new Response('OK', { status: 200 });
}
