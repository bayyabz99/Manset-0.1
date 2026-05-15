const { getDb } = require('../db/database');
const { createSlug } = require('../utils/slugify');

function list({ categorySlug, search, discounted, inStock, freeShipping, sort = 'popular', limit, offset = 0 } = {}) {
  const db = getDb();
  let sql = `
    SELECT p.*, c.name AS category_name, c.slug AS category_slug,
      (SELECT path FROM product_images WHERE product_id = p.id ORDER BY sort_order LIMIT 1) AS image_path
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.is_active = 1
  `;
  const params = [];

  if (categorySlug && categorySlug !== 'tumu') {
    sql += ' AND c.slug = ?';
    params.push(categorySlug);
  }
  if (search) {
    sql += ' AND (p.title LIKE ? OR p.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (discounted) sql += ' AND p.sale_price IS NOT NULL AND p.sale_price < p.price';
  if (inStock) sql += ' AND p.stock > 0';
  if (freeShipping) sql += ' AND p.free_shipping = 1';

  const orderMap = {
    popular: 'p.is_featured DESC, p.created_at DESC',
    price_asc: 'COALESCE(p.sale_price, p.price) ASC',
    price_desc: 'COALESCE(p.sale_price, p.price) DESC',
    newest: 'p.created_at DESC',
    name: 'p.title ASC',
  };
  sql += ` ORDER BY ${orderMap[sort] || orderMap.popular}`;

  if (limit) {
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);
  }

  return db.prepare(sql).all(...params);
}

function count(filters = {}) {
  const items = list({ ...filters, limit: null });
  return items.length;
}

function findBySlug(slug) {
  const db = getDb();
  const product = db
    .prepare(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug
       FROM products p LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.slug = ? AND p.is_active = 1`
    )
    .get(slug);
  if (!product) return null;
  product.images = db
    .prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order')
    .all(product.id);
  product.colors = db.prepare('SELECT * FROM product_colors WHERE product_id = ?').all(product.id);
  return product;
}

function findById(id) {
  const db = getDb();
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!product) return null;
  product.images = db
    .prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order')
    .all(id);
  product.colors = db.prepare('SELECT * FROM product_colors WHERE product_id = ?').all(id);
  const cat = db.prepare('SELECT name, slug FROM categories WHERE id = ?').get(product.category_id);
  product.category_name = cat?.name;
  product.category_slug = cat?.slug;
  return product;
}

function adminList({ search, categoryId } = {}) {
  const db = getDb();
  let sql = `
    SELECT p.*, c.name AS category_name
    FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE 1=1
  `;
  const params = [];
  if (search) {
    sql += ' AND p.title LIKE ?';
    params.push(`%${search}%`);
  }
  if (categoryId) {
    sql += ' AND p.category_id = ?';
    params.push(categoryId);
  }
  sql += ' ORDER BY p.updated_at DESC';
  return db.prepare(sql).all(...params);
}

function create(data) {
  const db = getDb();
  const slugs = db.prepare('SELECT slug FROM products').all().map((r) => r.slug);
  const slug = createSlug(data.title, slugs);
  const discount = calcDiscount(data.price, data.sale_price);

  const result = db
    .prepare(
      `INSERT INTO products (title, slug, description, price, sale_price, stock, sku, category_id,
        discount_percent, is_featured, is_active, free_shipping, meta_title, meta_description)
       VALUES (@title, @slug, @description, @price, @sale_price, @stock, @sku, @category_id,
        @discount_percent, @is_featured, @is_active, @free_shipping, @meta_title, @meta_description)`
    )
    .run({
      title: data.title,
      slug,
      description: data.description || '',
      price: parseFloat(data.price),
      sale_price: data.sale_price ? parseFloat(data.sale_price) : null,
      stock: parseInt(data.stock, 10) || 0,
      sku: data.sku || null,
      category_id: data.category_id || null,
      discount_percent: discount,
      is_featured: data.is_featured ? 1 : 0,
      is_active: data.is_active !== false ? 1 : 0,
      free_shipping: data.free_shipping ? 1 : 0,
      meta_title: data.meta_title || data.title,
      meta_description: data.meta_description || '',
    });
  return findById(result.lastInsertRowid);
}

function update(id, data) {
  const db = getDb();
  const existing = findById(id);
  if (!existing) return null;

  let slug = existing.slug;
  if (data.title && data.title !== existing.title) {
    const slugs = db
      .prepare('SELECT slug FROM products WHERE id != ?')
      .all(id)
      .map((r) => r.slug);
    slug = createSlug(data.title, slugs);
  }

  const price = data.price !== undefined ? parseFloat(data.price) : existing.price;
  const salePrice =
    data.sale_price !== undefined
      ? data.sale_price
        ? parseFloat(data.sale_price)
        : null
      : existing.sale_price;
  const discount = calcDiscount(price, salePrice);

  db.prepare(
    `UPDATE products SET title=@title, slug=@slug, description=@description, price=@price,
      sale_price=@sale_price, stock=@stock, sku=@sku, category_id=@category_id,
      discount_percent=@discount_percent, is_featured=@is_featured, is_active=@is_active,
      free_shipping=@free_shipping, meta_title=@meta_title, meta_description=@meta_description,
      updated_at=datetime('now') WHERE id=@id`
  ).run({
    id,
    title: data.title ?? existing.title,
    slug,
    description: data.description ?? existing.description,
    price,
    sale_price: salePrice,
    stock: data.stock !== undefined ? parseInt(data.stock, 10) : existing.stock,
    sku: data.sku ?? existing.sku,
    category_id: data.category_id !== undefined ? data.category_id : existing.category_id,
    discount_percent: discount,
    is_featured: data.is_featured !== undefined ? (data.is_featured ? 1 : 0) : existing.is_featured,
    is_active: data.is_active !== undefined ? (data.is_active ? 1 : 0) : existing.is_active,
    free_shipping:
      data.free_shipping !== undefined ? (data.free_shipping ? 1 : 0) : existing.free_shipping,
    meta_title: data.meta_title ?? existing.meta_title,
    meta_description: data.meta_description ?? existing.meta_description,
  });

  return findById(id);
}

function remove(id) {
  getDb().prepare('DELETE FROM products WHERE id = ?').run(id);
}

function addImage(productId, path, alt = '') {
  const db = getDb();
  const maxOrder = db
    .prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM product_images WHERE product_id = ?')
    .get(productId).m;
  return db
    .prepare(
      'INSERT INTO product_images (product_id, path, alt, sort_order) VALUES (?, ?, ?, ?)'
    )
    .run(productId, path, alt, maxOrder + 1);
}

function calcDiscount(price, salePrice) {
  if (!salePrice || salePrice >= price) return 0;
  return Math.round(((price - salePrice) / price) * 100);
}

module.exports = {
  list,
  count,
  findBySlug,
  findById,
  adminList,
  create,
  update,
  remove,
  addImage,
};
