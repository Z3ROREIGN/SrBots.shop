/**
 * SrBots.shop - Rotas de Produtos
 */

import { jsonResponse, errorResponse, successResponse } from '../utils/helpers.js';

export async function handleProducts(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // GET /api/products - Listar produtos
  if (path === '/api/products' && method === 'GET') {
    return await listProducts(request, env);
  }

  // GET /api/products/categories - Listar categorias
  if (path === '/api/products/categories' && method === 'GET') {
    return await listCategories(env);
  }

  // GET /api/products/featured - Produtos em destaque
  if (path === '/api/products/featured' && method === 'GET') {
    return await getFeatured(env);
  }

  // GET /api/products/:id - Detalhe do produto
  const productMatch = path.match(/^\/api\/products\/([^\/]+)$/);
  if (productMatch && method === 'GET') {
    return await getProduct(productMatch[1], env);
  }

  return errorResponse('Rota não encontrada', 404);
}

async function listProducts(request, env) {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '12'), 50);
  const category = url.searchParams.get('category');
  const type = url.searchParams.get('type');
  const search = url.searchParams.get('search');
  const sort = url.searchParams.get('sort') || 'created_at';
  const order = url.searchParams.get('order') || 'DESC';
  const offset = (page - 1) * limit;

  let query = `
    SELECT p.*, c.name as category_name, c.slug as category_slug, c.color as category_color
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.is_active = 1
  `;
  const params = [];

  if (category) {
    query += ' AND c.slug = ?';
    params.push(category);
  }
  if (type) {
    query += ' AND p.product_type = ?';
    params.push(type);
  }
  if (search) {
    query += ' AND (p.name LIKE ? OR p.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  const allowedSorts = ['created_at', 'price', 'sales_count', 'name'];
  const safeSort = allowedSorts.includes(sort) ? sort : 'created_at';
  const safeOrder = order === 'ASC' ? 'ASC' : 'DESC';

  query += ` ORDER BY p.${safeSort} ${safeOrder} LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const products = await env.DB.prepare(query).bind(...params).all();

  // Contar total
  let countQuery = `SELECT COUNT(*) as total FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.is_active = 1`;
  const countParams = [];
  if (category) { countQuery += ' AND c.slug = ?'; countParams.push(category); }
  if (type) { countQuery += ' AND p.product_type = ?'; countParams.push(type); }
  if (search) { countQuery += ' AND (p.name LIKE ? OR p.description LIKE ?)'; countParams.push(`%${search}%`, `%${search}%`); }

  const countResult = await env.DB.prepare(countQuery).bind(...countParams).first();
  const total = countResult?.total || 0;

  // Parsear JSON fields
  const items = products.results.map(p => ({
    ...p,
    features: safeParseJSON(p.features, []),
    gallery_urls: safeParseJSON(p.gallery_urls, []),
  }));

  return successResponse({
    items,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}

async function listCategories(env) {
  const categories = await env.DB.prepare(
    'SELECT c.*, COUNT(p.id) as product_count FROM categories c LEFT JOIN products p ON c.id = p.category_id AND p.is_active = 1 WHERE c.is_active = 1 GROUP BY c.id ORDER BY c.sort_order ASC'
  ).all();

  return successResponse(categories.results);
}

async function getFeatured(env) {
  const products = await env.DB.prepare(
    `SELECT p.*, c.name as category_name, c.slug as category_slug, c.color as category_color
     FROM products p LEFT JOIN categories c ON p.category_id = c.id
     WHERE p.is_active = 1 AND p.is_featured = 1
     ORDER BY p.sales_count DESC LIMIT 8`
  ).all();

  const items = products.results.map(p => ({
    ...p,
    features: safeParseJSON(p.features, []),
  }));

  return successResponse(items);
}

async function getProduct(identifier, env) {
  const isId = /^\d+$/.test(identifier);
  const query = isId
    ? 'SELECT p.*, c.name as category_name, c.slug as category_slug, c.color as category_color FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ? AND p.is_active = 1'
    : 'SELECT p.*, c.name as category_name, c.slug as category_slug, c.color as category_color FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.slug = ? AND p.is_active = 1';

  const product = await env.DB.prepare(query).bind(identifier).first();
  if (!product) return errorResponse('Produto não encontrado', 404);

  // Buscar avaliações
  const reviews = await env.DB.prepare(
    'SELECT r.*, u.username FROM reviews r JOIN users u ON r.user_id = u.id WHERE r.product_id = ? AND r.is_approved = 1 ORDER BY r.created_at DESC LIMIT 10'
  ).bind(product.id).all();

  const avgRating = reviews.results.length > 0
    ? reviews.results.reduce((sum, r) => sum + r.rating, 0) / reviews.results.length
    : 0;

  return successResponse({
    ...product,
    features: safeParseJSON(product.features, []),
    gallery_urls: safeParseJSON(product.gallery_urls, []),
    reviews: reviews.results,
    avg_rating: Math.round(avgRating * 10) / 10,
    review_count: reviews.results.length
  });
}

function safeParseJSON(str, fallback = null) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}
