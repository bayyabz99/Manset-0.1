const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../db/database');
const { getAllSettings, setSetting } = require('../db/database');
const productsRepo = require('../repositories/products');
const categoriesRepo = require('../repositories/categories');
const organizationsRepo = require('../repositories/organizations');
const ordersRepo = require('../repositories/orders');
const { requireAuth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { processImage } = require('../services/imageProcessor');
const path = require('path');

const router = express.Router();

// ——— Public API ———
router.get('/products', (req, res) => {
  const products = productsRepo.list({
    categorySlug: req.query.category,
    search: req.query.q,
    discounted: req.query.discounted === '1',
    inStock: req.query.in_stock === '1',
    freeShipping: req.query.free_shipping === '1',
    sort: req.query.sort || 'popular',
  });
  res.json(products);
});

router.get('/categories', (_req, res) => {
  res.json(categoriesRepo.listActive());
});

router.get('/organizations', (req, res) => {
  res.json(
    organizationsRepo.list({
      categorySlug: req.query.category,
      featured: req.query.featured === '1',
    })
  );
});

router.post('/orders', (req, res) => {
  try {
    const settings = getAllSettings();
    const { customer, items, payment_method, notes } = req.body;

    if (!customer?.name || !customer?.phone || !customer?.address) {
      return res.status(400).json({ error: 'Müşteri bilgileri eksik' });
    }
    if (!items?.length) {
      return res.status(400).json({ error: 'Sepet boş' });
    }

    const paymentKey = {
      credit_card: 'payment_credit_card',
      cash_on_delivery: 'payment_cash_on_delivery',
      card_on_delivery: 'payment_card_on_delivery',
    }[payment_method];

    if (!paymentKey || settings[paymentKey] !== '1') {
      return res.status(400).json({ error: 'Seçilen ödeme yöntemi aktif değil' });
    }

    let subtotal = 0;
    const orderItems = [];
    for (const item of items) {
      const product = productsRepo.findById(item.product_id);
      if (!product || !product.is_active) {
        return res.status(400).json({ error: `Ürün bulunamadı: ${item.product_id}` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({ error: `${product.title} için yeterli stok yok` });
      }
      const price = product.sale_price ?? product.price;
      subtotal += price * item.quantity;
      orderItems.push({
        product_id: product.id,
        title: product.title,
        price,
        quantity: item.quantity,
      });
    }

    const threshold = parseFloat(settings.free_shipping_threshold) || 500;
    const shippingFee = parseFloat(settings.shipping_fee) || 49;
    const allFreeShipping = orderItems.every((_, i) => {
      const p = productsRepo.findById(items[i].product_id);
      return p?.free_shipping;
    });
    const shipping = subtotal >= threshold || allFreeShipping ? 0 : shippingFee;
    const total = subtotal + shipping;

    if (payment_method === 'credit_card') {
      const iyzico = settings.iyzico_enabled === '1';
      const stripe = settings.stripe_enabled === '1';
      if (!iyzico && !stripe) {
        return res.status(501).json({
          error: 'Online ödeme henüz yapılandırılmadı. Kapıda ödeme seçeneklerini kullanabilirsiniz.',
          code: 'PAYMENT_NOT_CONFIGURED',
        });
      }
    }

    const order = ordersRepo.create({
      customer,
      items: orderItems,
      payment_method,
      subtotal,
      shipping,
      total,
      notes,
    });

    res.status(201).json({
      success: true,
      order_number: order.order_number,
      order_id: order.id,
      payment_method,
      total,
      message:
        payment_method === 'credit_card'
          ? 'Sipariş oluşturuldu. Ödeme sayfasına yönlendirileceksiniz.'
          : 'Siparişiniz alındı. En kısa sürede sizinle iletişime geçeceğiz.',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sipariş oluşturulamadı' });
  }
});

// ——— Admin API ———
router.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username?.trim() || !password) {
    return res.status(400).json({ error: 'Kullanıcı adı ve şifre zorunludur' });
  }
  const user = getDb()
    .prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE')
    .get(username.trim());
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı' });
  }
  req.session.userId = user.id;
  req.session.userName = user.name;
  req.session.username = user.username;
  res.json({ success: true, name: user.name, username: user.username });
});

router.post('/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

router.use(requireAuth);

router.put('/admin/profile', async (req, res) => {
  const { current_password, new_username, new_password } = req.body;
  if (!current_password) {
    return res.status(400).json({ error: 'Mevcut şifre zorunludur' });
  }

  const user = getDb().prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  if (!user || !(await bcrypt.compare(current_password, user.password_hash))) {
    return res.status(401).json({ error: 'Mevcut şifre hatalı' });
  }

  const usernameChanged =
    new_username?.trim() && new_username.trim() !== (user.username || '');
  const passwordChanged = Boolean(new_password);

  if (!usernameChanged && !passwordChanged) {
    return res.status(400).json({ error: 'Yeni kullanıcı adı veya şifre girin' });
  }

  if (usernameChanged) {
    const uname = new_username.trim();
    if (uname.length < 3) {
      return res.status(400).json({ error: 'Kullanıcı adı en az 3 karakter olmalı' });
    }
    const taken = getDb()
      .prepare('SELECT id FROM users WHERE username = ? AND id != ?')
      .get(uname, user.id);
    if (taken) return res.status(400).json({ error: 'Bu kullanıcı adı kullanılıyor' });
    getDb().prepare('UPDATE users SET username = ? WHERE id = ?').run(uname, user.id);
    req.session.username = uname;
  }

  if (passwordChanged) {
    if (new_password.length < 6) {
      return res.status(400).json({ error: 'Yeni şifre en az 6 karakter olmalı' });
    }
    const hash = await bcrypt.hash(new_password, 12);
    getDb().prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, user.id);
  }

  res.json({
    success: true,
    username: req.session.username,
    message: 'Bilgileriniz güncellendi',
  });
});

router.get('/admin/products', (req, res) => {
  res.json(productsRepo.adminList({ search: req.query.q, categoryId: req.query.category_id }));
});

router.post('/admin/products', (req, res) => {
  const product = productsRepo.create(req.body);
  res.status(201).json(product);
});

router.put('/admin/products/:id', (req, res) => {
  const product = productsRepo.update(parseInt(req.params.id, 10), req.body);
  if (!product) return res.status(404).json({ error: 'Ürün bulunamadı' });
  res.json(product);
});

router.delete('/admin/products/:id', (req, res) => {
  productsRepo.remove(parseInt(req.params.id, 10));
  res.json({ success: true });
});

router.post(
  '/admin/products/:id/images',
  upload.single('image'),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'Görsel gerekli' });
      const sizes = await processImage(req.file.path, 'products');
      productsRepo.addImage(parseInt(req.params.id, 10), sizes.medium, req.body.alt || '');
      res.json({ path: sizes.medium, sizes });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.get('/admin/categories', (_req, res) => {
  res.json(categoriesRepo.listAll());
});

router.post('/admin/categories', (req, res) => {
  res.status(201).json(categoriesRepo.create(req.body));
});

router.put('/admin/categories/:id', (req, res) => {
  const cat = categoriesRepo.update(parseInt(req.params.id, 10), req.body);
  if (!cat) return res.status(404).json({ error: 'Kategori bulunamadı' });
  res.json(cat);
});

router.delete('/admin/categories/:id', (req, res) => {
  categoriesRepo.remove(parseInt(req.params.id, 10));
  res.json({ success: true });
});

router.get('/admin/organizations', (_req, res) => {
  res.json(organizationsRepo.adminList());
});

router.post('/admin/organizations', (req, res) => {
  res.status(201).json(organizationsRepo.create(req.body));
});

router.put('/admin/organizations/:id', (req, res) => {
  const org = organizationsRepo.update(parseInt(req.params.id, 10), req.body);
  if (!org) return res.status(404).json({ error: 'Bulunamadı' });
  res.json(org);
});

router.delete('/admin/organizations/:id', (req, res) => {
  organizationsRepo.remove(parseInt(req.params.id, 10));
  res.json({ success: true });
});

router.post(
  '/admin/organizations/:id/images',
  upload.single('image'),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'Görsel gerekli' });
      const sizes = await processImage(req.file.path, 'organizations');
      organizationsRepo.addImage(parseInt(req.params.id, 10), sizes.large, req.body.caption || '');
      res.json({ path: sizes.large, sizes });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.get('/admin/orders', (_req, res) => {
  res.json(ordersRepo.list());
});

router.patch('/admin/orders/:id', (req, res) => {
  const order = ordersRepo.updateStatus(parseInt(req.params.id, 10), req.body);
  if (!order) return res.status(404).json({ error: 'Sipariş bulunamadı' });
  res.json(order);
});

router.get('/admin/settings', (_req, res) => {
  res.json(getAllSettings());
});

router.put('/admin/settings', (req, res) => {
  for (const [key, value] of Object.entries(req.body)) {
    setSetting(key, value);
  }
  res.json(getAllSettings());
});

module.exports = router;
