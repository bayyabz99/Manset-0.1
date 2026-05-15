const express = require('express');
const productsRepo = require('../repositories/products');
const categoriesRepo = require('../repositories/categories');
const organizationsRepo = require('../repositories/organizations');
const ordersRepo = require('../repositories/orders');
const { getAllSettings } = require('../db/database');
const { requireAuth, requireGuest } = require('../middleware/auth');

const router = express.Router();

router.get('/giris', requireGuest, (req, res) => {
  res.render('admin/login', {
    title: 'Giriş',
    layout: false,
    redirect: req.query.redirect || '/admin',
    error: null,
  });
});

router.get('/cikis', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/giris'));
});

router.use(requireAuth);

router.use((req, res, next) => {
  res.locals.userName = req.session.userName || 'Admin';
  res.locals.username = req.session.username || '';
  next();
});

router.get('/', (req, res) => {
  const products = productsRepo.adminList();
  const orders = ordersRepo.list().slice(0, 5);
  const organizations = organizationsRepo.adminList().slice(0, 5);
  res.render('admin/dashboard', {
    title: 'Dashboard',
    stats: {
      products: products.length,
      orders: ordersRepo.list().length,
      organizations: organizationsRepo.adminList().length,
    },
    recentOrders: orders,
    recentOrgs: organizations,
    userName: req.session.userName,
  });
});

router.get('/urunler', (req, res) => {
  res.render('admin/products/list', {
    title: 'Ürünler',
    products: productsRepo.adminList({ search: req.query.q }),
    categories: categoriesRepo.listAll(),
    search: req.query.q || '',
    userName: req.session.userName,
  });
});

router.get('/urunler/yeni', (req, res) => {
  res.render('admin/products/form', {
    title: 'Yeni Ürün',
    product: null,
    categories: categoriesRepo.listAll(),
    userName: req.session.userName,
  });
});

router.get('/urunler/:id/duzenle', (req, res) => {
  const product = productsRepo.findById(parseInt(req.params.id, 10));
  if (!product) return res.redirect('/admin/urunler');
  res.render('admin/products/form', {
    title: 'Ürün Düzenle',
    product,
    categories: categoriesRepo.listAll(),
    userName: req.session.userName,
  });
});

router.get('/kategoriler', (req, res) => {
  res.render('admin/categories/list', {
    title: 'Ürün Kategorileri',
    categories: categoriesRepo.listAll(),
    userName: req.session.userName,
  });
});

router.get('/organizasyonlar', (req, res) => {
  res.render('admin/organizations/list', {
    title: 'Organizasyonlar',
    organizations: organizationsRepo.adminList(),
    orgCategories: organizationsRepo.listCategories(),
    userName: req.session.userName,
  });
});

router.get('/organizasyonlar/yeni', (req, res) => {
  res.render('admin/organizations/form', {
    title: 'Yeni Organizasyon',
    org: null,
    orgCategories: organizationsRepo.listCategories(),
    userName: req.session.userName,
  });
});

router.get('/organizasyonlar/:id/duzenle', (req, res) => {
  const org = organizationsRepo.findById(parseInt(req.params.id, 10));
  if (!org) return res.redirect('/admin/organizasyonlar');
  res.render('admin/organizations/form', {
    title: 'Organizasyon Düzenle',
    org,
    orgCategories: organizationsRepo.listCategories(),
    userName: req.session.userName,
  });
});

router.get('/siparisler', (req, res) => {
  res.render('admin/orders/list', {
    title: 'Siparişler',
    orders: ordersRepo.list(),
    userName: req.session.userName,
  });
});

router.get('/ayarlar', (req, res) => {
  res.render('admin/settings', {
    title: 'Sistem Ayarları',
    settings: getAllSettings(),
    userName: req.session.userName,
  });
});

module.exports = router;
