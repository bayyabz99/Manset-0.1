const { getDb } = require('../db/database');

function generateOrderNumber() {
  const date = new Date();
  const prefix = `MP${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  const count =
    getDb()
      .prepare("SELECT COUNT(*) AS c FROM orders WHERE order_number LIKE ?")
      .get(`${prefix}%`).c + 1;
  return `${prefix}${String(count).padStart(5, '0')}`;
}

function create({ customer, items, payment_method, subtotal, shipping, total, notes }) {
  const db = getDb();
  const orderNumber = generateOrderNumber();

  const insertOrder = db.prepare(
    `INSERT INTO orders (order_number, customer_name, customer_phone, customer_email, address,
      city, district, payment_method, subtotal, shipping, total, notes)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
  );

  const insertItem = db.prepare(
    'INSERT INTO order_items (order_id, product_id, title, price, quantity) VALUES (?,?,?,?,?)'
  );

  const tx = db.transaction(() => {
    const result = insertOrder.run(
      orderNumber,
      customer.name,
      customer.phone,
      customer.email || null,
      customer.address,
      customer.city || null,
      customer.district || null,
      payment_method,
      subtotal,
      shipping,
      total,
      notes || null
    );
    const orderId = result.lastInsertRowid;
    for (const item of items) {
      insertItem.run(orderId, item.product_id || null, item.title, item.price, item.quantity);
      if (item.product_id) {
        db.prepare(
          'UPDATE products SET stock = CASE WHEN stock - ? < 0 THEN 0 ELSE stock - ? END WHERE id = ?'
        ).run(item.quantity, item.quantity, item.product_id);
      }
    }
    return orderId;
  });

  const orderId = tx();
  return findById(orderId);
}

function findById(id) {
  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!order) return null;
  order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id);
  return order;
}

function list() {
  return getDb().prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
}

function updateStatus(id, { order_status, payment_status }) {
  const db = getDb();
  const existing = findById(id);
  if (!existing) return null;
  db.prepare(
    'UPDATE orders SET order_status = COALESCE(?, order_status), payment_status = COALESCE(?, payment_status) WHERE id = ?'
  ).run(order_status || null, payment_status || null, id);
  return findById(id);
}

module.exports = { create, findById, list, updateStatus, generateOrderNumber };
