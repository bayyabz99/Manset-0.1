const express = require('express');
const productsRepo = require('../repositories/products');
const categoriesRepo = require('../repositories/categories');
const organizationsRepo = require('../repositories/organizations');
const { getAllSettings } = require('../db/database');

const router = express.Router();

function siteLocals(req, res, next) {
  res.locals.settings = getAllSettings();
  res.locals.currentPath = req.path;
  next();
}

router.use(siteLocals);

router.get('/', (req, res) => {
  const featuredProducts = productsRepo.list({ limit: 8 });
  const featuredOrgs = organizationsRepo.list({ featured: true }).slice(0, 6);
  res.render('public/home', {
    title: 'Ana Sayfa',
    featuredProducts,
    featuredOrgs,
  });
});

router.get('/urunler', (req, res) => {
  const categories = categoriesRepo.listActive();
  const categorySlug = req.query.kategori || 'tumu';
  const products = productsRepo.list({
    categorySlug: categorySlug === 'tumu' ? null : categorySlug,
    search: req.query.ara,
    discounted: req.query.indirimli === '1',
    inStock: req.query.stokta === '1',
    freeShipping: req.query.ucretsiz_kargo === '1',
    sort: req.query.sirala || 'popular',
  });
  res.render('public/products', {
    title: 'Ürünler',
    categories,
    products,
    filters: {
      kategori: categorySlug,
      ara: req.query.ara || '',
      indirimli: req.query.indirimli === '1',
      stokta: req.query.stokta === '1',
      ucretsiz_kargo: req.query.ucretsiz_kargo === '1',
      sirala: req.query.sirala || 'popular',
    },
  });
});

router.get('/urun/:slug', (req, res) => {
  const product = productsRepo.findBySlug(req.params.slug);
  if (!product) return res.status(404).render('public/404', { title: 'Ürün Bulunamadı' });
  const related = productsRepo
    .list({ categorySlug: product.category_slug, limit: 4 })
    .filter((p) => p.id !== product.id);
  res.render('public/product-detail', { title: product.title, product, related });
});

router.get('/gerceklestirdigimiz-isler', (req, res) => {
  const orgCategories = organizationsRepo.listCategories();
  const categorySlug = req.query.kategori;
  const organizations = organizationsRepo.list({ categorySlug });
  res.render('public/portfolio', {
    title: 'Gerçekleştirdiğimiz İşler',
    orgCategories,
    organizations,
    activeCategory: categorySlug || null,
  });
});

router.get('/is/:slug', (req, res) => {
  const org = organizationsRepo.findBySlug(req.params.slug);
  if (!org || !org.is_published) {
    return res.status(404).render('public/404', { title: 'İçerik Bulunamadı' });
  }
  res.render('public/portfolio-detail', { title: org.title, org });
});

router.get('/sepet', (_req, res) => {
  res.render('public/cart', { title: 'Sepetim' });
});

router.get('/odeme', (_req, res) => {
  const settings = getAllSettings();
  res.render('public/checkout', {
    title: 'Ödeme',
    paymentMethods: {
      credit_card: settings.payment_credit_card === '1',
      cash_on_delivery: settings.payment_cash_on_delivery === '1',
      card_on_delivery: settings.payment_card_on_delivery === '1',
    },
  });
});

router.get('/iletisim', (_req, res) => {
  res.render('public/contact', { title: 'İletişim' });
});

module.exports = router;
