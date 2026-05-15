const { getDb } = require('../db/database');
const { createSlug } = require('../utils/slugify');

function list({ categorySlug, featured, publishedOnly = true } = {}) {
  const db = getDb();
  let sql = `
    SELECT o.*, oc.name AS category_name, oc.slug AS category_slug,
      (SELECT path FROM organization_images WHERE organization_id = o.id ORDER BY sort_order LIMIT 1) AS image_path
    FROM organizations o
    LEFT JOIN organization_categories oc ON oc.id = o.category_id
    WHERE 1=1
  `;
  const params = [];
  if (publishedOnly) {
    sql += ' AND o.is_published = 1';
  }
  if (categorySlug) {
    sql += ' AND oc.slug = ?';
    params.push(categorySlug);
  }
  if (featured) sql += ' AND o.is_featured = 1';
  sql += ' ORDER BY o.sort_order, o.event_date DESC, o.created_at DESC';
  return db.prepare(sql).all(...params);
}

function findBySlug(slug) {
  const db = getDb();
  const org = db
    .prepare(
      `SELECT o.*, oc.name AS category_name, oc.slug AS category_slug
       FROM organizations o
       LEFT JOIN organization_categories oc ON oc.id = o.category_id
       WHERE o.slug = ?`
    )
    .get(slug);
  if (!org) return null;
  org.images = db
    .prepare('SELECT * FROM organization_images WHERE organization_id = ? ORDER BY sort_order')
    .all(org.id);
  return org;
}

function findById(id) {
  const db = getDb();
  const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(id);
  if (!org) return null;
  org.images = db
    .prepare('SELECT * FROM organization_images WHERE organization_id = ? ORDER BY sort_order')
    .all(id);
  return org;
}

function adminList() {
  return getDb()
    .prepare(
      `SELECT o.*, oc.name AS category_name
       FROM organizations o LEFT JOIN organization_categories oc ON oc.id = o.category_id
       ORDER BY o.created_at DESC`
    )
    .all();
}

function listCategories() {
  return getDb()
    .prepare('SELECT * FROM organization_categories ORDER BY sort_order, name')
    .all();
}

function create(data) {
  const db = getDb();
  const slugs = db.prepare('SELECT slug FROM organizations').all().map((r) => r.slug);
  const slug = createSlug(data.title, slugs);
  const result = db
    .prepare(
      `INSERT INTO organizations (title, slug, description, category_id, location, event_date,
        is_published, is_featured, sort_order) VALUES (?,?,?,?,?,?,?,?,?)`
    )
    .run(
      data.title,
      slug,
      data.description || '',
      data.category_id || null,
      data.location || '',
      data.event_date || null,
      data.is_published !== false ? 1 : 0,
      data.is_featured ? 1 : 0,
      data.sort_order || 0
    );
  return findById(result.lastInsertRowid);
}

function update(id, data) {
  const db = getDb();
  const existing = findById(id);
  if (!existing) return null;
  let slug = existing.slug;
  if (data.title && data.title !== existing.title) {
    const slugs = db
      .prepare('SELECT slug FROM organizations WHERE id != ?')
      .all(id)
      .map((r) => r.slug);
    slug = createSlug(data.title, slugs);
  }
  db.prepare(
    `UPDATE organizations SET title=?, slug=?, description=?, category_id=?, location=?,
      event_date=?, is_published=?, is_featured=?, sort_order=?, updated_at=datetime('now')
     WHERE id=?`
  ).run(
    data.title ?? existing.title,
    slug,
    data.description ?? existing.description,
    data.category_id !== undefined ? data.category_id : existing.category_id,
    data.location ?? existing.location,
    data.event_date ?? existing.event_date,
    data.is_published !== undefined ? (data.is_published ? 1 : 0) : existing.is_published,
    data.is_featured !== undefined ? (data.is_featured ? 1 : 0) : existing.is_featured,
    data.sort_order ?? existing.sort_order,
    id
  );
  return findById(id);
}

function remove(id) {
  getDb().prepare('DELETE FROM organizations WHERE id = ?').run(id);
}

function addImage(orgId, path, caption = '') {
  const db = getDb();
  const maxOrder = db
    .prepare(
      'SELECT COALESCE(MAX(sort_order), -1) AS m FROM organization_images WHERE organization_id = ?'
    )
    .get(orgId).m;
  return db
    .prepare(
      'INSERT INTO organization_images (organization_id, path, caption, sort_order) VALUES (?,?,?,?)'
    )
    .run(orgId, path, caption, maxOrder + 1);
}

module.exports = {
  list,
  findBySlug,
  findById,
  adminList,
  listCategories,
  create,
  update,
  remove,
  addImage,
};
