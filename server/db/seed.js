require('dotenv').config();
const bcrypt = require('bcryptjs');
const path = require('path');
const { getDb } = require('./database');
const config = require('../config');

const db = getDb();

console.log('Veritabanı seed işlemi başlıyor...');

// Admin kullanıcı
const username = config.adminUsername;
const existingUser =
  db.prepare('SELECT id FROM users WHERE username = ?').get(username) ||
  db.prepare('SELECT id FROM users LIMIT 1').get();

if (!existingUser) {
  const hash = bcrypt.hashSync(config.adminPassword, 12);
  const cols = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
  if (cols.includes('username')) {
    db.prepare(
      'INSERT INTO users (username, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)'
    ).run(username, null, hash, 'Admin', 'admin');
  } else {
    db.prepare('INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)').run(
      `${username}@local`,
      hash,
      'Admin',
      'admin'
    );
  }
  console.log(`Admin oluşturuldu: ${username} / ${config.adminPassword}`);
} else if (!existingUser.username) {
  db.prepare('UPDATE users SET username = ? WHERE id = ?').run(username, existingUser.id);
}

// Ürün kategorileri
const productCategories = [
  { name: 'Balonlar', slug: 'balonlar', sort_order: 1 },
  { name: 'Parti Malzemeleri', slug: 'parti-malzemeleri', sort_order: 2 },
  { name: 'Hediyelik & Çiçek', slug: 'hediyelik-cicek', sort_order: 3 },
  { name: 'Pastane Ürünleri', slug: 'pastane-urunleri', sort_order: 4 },
  { name: 'Kiralama', slug: 'kiralama', sort_order: 5 },
];

const insertCat = db.prepare(
  'INSERT OR IGNORE INTO categories (name, slug, sort_order) VALUES (?, ?, ?)'
);
productCategories.forEach((c) => insertCat.run(c.name, c.slug, c.sort_order));

const catMap = Object.fromEntries(
  db.prepare('SELECT slug, id FROM categories').all().map((r) => [r.slug, r.id])
);

// Organizasyon kategorileri
const orgCategories = [
  { name: 'Açılış Organizasyonu', slug: 'acilis-organizasyonu', sort_order: 1 },
  { name: 'Konseptler', slug: 'konseptler', sort_order: 2 },
  { name: 'Organizasyonlar', slug: 'organizasyonlar', sort_order: 3 },
  { name: 'Hastane Odası', slug: 'hastane-odasi', sort_order: 4 },
  { name: 'Bride to Be', slug: 'bride-to-be', sort_order: 5 },
  { name: 'Doğum Günü', slug: 'dogum-gunu', sort_order: 6 },
];

const insertOrgCat = db.prepare(
  'INSERT OR IGNORE INTO organization_categories (name, slug, sort_order) VALUES (?, ?, ?)'
);
orgCategories.forEach((c) => insertOrgCat.run(c.name, c.slug, c.sort_order));

const orgCatMap = Object.fromEntries(
  db.prepare('SELECT slug, id FROM organization_categories').all().map((r) => [r.slug, r.id])
);

// Örnek ürünler
const products = [
  {
    title: '100 Adet 12 İnç Pastel Balon',
    slug: '100-adet-pastel-balon',
    description: '8 farklı pastel renk seçeneği. Nakit alımlarda geçerli şok fiyat.',
    price: 350,
    sale_price: 290,
    stock: 50,
    category_id: catMap['balonlar'],
    is_featured: 1,
    discount_percent: 17,
  },
  {
    title: '23 Nisan Süsleme Seti (120 Parça)',
    slug: '23-nisan-susleme-seti',
    description: 'Türk bayrağı motifli 23 Nisan özel süsleme seti.',
    price: 189,
    sale_price: null,
    stock: 30,
    category_id: catMap['parti-malzemeleri'],
    is_featured: 1,
  },
  {
    title: 'Hoş Geldin Bebek Balon Buketi',
    slug: 'hos-geldin-bebek-balon-buketi',
    description: 'Şeffaf dev balon, mini balonlar, ayıcık ve güller ile özel tasarım.',
    price: 850,
    sale_price: 750,
    stock: 15,
    category_id: catMap['hediyelik-cicek'],
    is_featured: 1,
    discount_percent: 12,
  },
  {
    title: 'Gül Ayıcık Hediye Kutusu',
    slug: 'gul-ayicik-hediye-kutusu',
    description: 'Mini gül ayıcıklar ve I Love You kalpli pelüş ayı seti.',
    price: 450,
    sale_price: null,
    stock: 20,
    category_id: catMap['hediyelik-cicek'],
  },
  {
    title: 'Profesyonel Ses Sistemi Kiralama',
    slug: 'ses-sistemi-kiralama',
    description: 'Etkinlik ve açılışlar için profesyonel hoparlör kiralama hizmeti.',
    price: 2500,
    sale_price: null,
    stock: 5,
    category_id: catMap['kiralama'],
    free_shipping: 1,
  },
];

const insertProduct = db.prepare(`
  INSERT OR IGNORE INTO products (title, slug, description, price, sale_price, stock, category_id,
    discount_percent, is_featured, is_active, free_shipping)
  VALUES (@title, @slug, @description, @price, @sale_price, @stock, @category_id,
    @discount_percent, @is_featured, 1, @free_shipping)
`);

products.forEach((p) => {
  insertProduct.run({
    ...p,
    free_shipping: p.free_shipping ? 1 : 0,
    discount_percent: p.discount_percent || 0,
    is_featured: p.is_featured ? 1 : 0,
  });
});

// Örnek organizasyonlar
const organizations = [
  {
    title: 'Mağaza Açılış Balon Kemeri',
    slug: 'magaza-acilis-balon-kemer',
    description: 'Kırmızı-beyaz balon kemer ile mağaza açılış süslemesi.',
    category_id: orgCatMap['acilis-organizasyonu'],
    location: 'Konya',
    is_featured: 1,
  },
  {
    title: 'Deniz & Aslı Nişan Konsepti',
    slug: 'deniz-asli-nisan-konsepti',
    description: 'Beyaz fon, gold şamdanlar ve neon tabela ile şık nişan organizasyonu.',
    category_id: orgCatMap['konseptler'],
    location: 'Konya',
    is_featured: 1,
  },
  {
    title: 'Hoş Geldin Bebek Hastane Odası',
    slug: 'hastane-odasi-bebek-susleme',
    description: 'Mavi-beyaz balonlar ve yıldız motifleri ile hastane odası süslemesi.',
    category_id: orgCatMap['hastane-odasi'],
    location: 'Konya',
    is_featured: 1,
  },
  {
    title: 'Bride to Be Parti Dekorasyonu',
    slug: 'bride-to-be-parti',
    description: 'Pembe-beyaz tema ile bekârlığa veda partisi konsepti.',
    category_id: orgCatMap['bride-to-be'],
    location: 'Konya',
  },
  {
    title: 'Çocuk Doğum Günü Organizasyonu',
    slug: 'cocuk-dogum-gunu',
    description: 'Tema balonları, fon ve masa düzeni ile unutulmaz doğum günü.',
    category_id: orgCatMap['dogum-gunu'],
    location: 'Konya',
    is_featured: 1,
  },
];

const insertOrg = db.prepare(`
  INSERT OR IGNORE INTO organizations (title, slug, description, category_id, location, is_published, is_featured)
  VALUES (@title, @slug, @description, @category_id, @location, 1, @is_featured)
`);

organizations.forEach((o) => {
  insertOrg.run({ ...o, is_featured: o.is_featured ? 1 : 0 });
});

console.log('Seed tamamlandı.');
console.log(`\n  Site: http://localhost:${config.port}`);
console.log(`  Admin: http://localhost:${config.port}/admin`);
  console.log(`  Giriş: ${username} / ${config.adminPassword}\n`);
