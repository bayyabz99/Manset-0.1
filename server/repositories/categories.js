const { getDb } = require('../db/database');
const { createSlug } = require('../utils/slugify');

function listActive() {
  return getDb()
    .prepare('SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order, name')
    .all();
}

function listAll() {
  return getDb().prepare('SELECT * FROM categories ORDER BY sort_order, name').all();
}

function findBySlug(slug) {
  return getDb().prepare('SELECT * FROM categories WHERE slug = ?').get(slug);
}

function findById(id) {
  return getDb().prepare('SELECT * FROM categories WHERE id = ?').get(id);
}

function create({ name, description, parent_id, sort_order }) {
  const db = getDb();
  const slugs = db.prepare('SELECT slug FROM categories').all().map((r) => r.slug);
  const slug = createSlug(name, slugs);
  const result = db
    .prepare(
      'INSERT INTO categories (name, slug, description, parent_id, sort_order) VALUES (?, ?, ?, ?, ?)'
    )
    .run(name, slug, description || '', parent_id || null, sort_order || 0);
  return findById(result.lastInsertRowid);
}

function update(id, data) {
  const db = getDb();
  const existing = findById(id);
  if (!existing) return null;
  let slug = existing.slug;
  if (data.name && data.name !== existing.name) {
    const slugs = db
      .prepare('SELECT slug FROM categories WHERE id != ?')
      .all(id)
      .map((r) => r.slug);
    slug = createSlug(data.name, slugs);
  }
  db.prepare(
    `UPDATE categories SET name=?, slug=?, description=?, parent_id=?, sort_order=?, is_active=?
     WHERE id=?`
  ).run(
    data.name ?? existing.name,
    slug,
    data.description ?? existing.description,
    data.parent_id !== undefined ? data.parent_id : existing.parent_id,
    data.sort_order ?? existing.sort_order,
    data.is_active !== undefined ? (data.is_active ? 1 : 0) : existing.is_active,
    id
  );
  return findById(id);
}

function remove(id) {
  getDb().prepare('DELETE FROM categories WHERE id = ?').run(id);
}

module.exports = { listActive, listAll, findBySlug, findById, create, update, remove };
