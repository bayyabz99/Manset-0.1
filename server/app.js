const express = require('express');
const path = require('path');
const session = require('express-session');
const helmet = require('helmet');
const compression = require('compression');
const config = require('./config');
const { getDb } = require('./db/database');

const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');

getDb();

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(config.rootDir, 'views'));

app.use(
  helmet({
    contentSecurityPolicy: config.nodeEnv === 'production',
    crossOriginEmbedderPolicy: false,
  })
);
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(config.rootDir, 'public')));

app.use(
  session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: config.nodeEnv === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

app.locals.formatPrice = (price) => {
  if (price == null) return '';
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(price);
};

app.use((req, res, next) => {
  res.locals.siteName = 'Manşet Parti & Organizasyon';
  next();
});

app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);
app.use(publicRoutes);

app.use((req, res) => {
  res.status(404).render('public/404', { title: 'Sayfa Bulunamadı' });
});

app.use((err, req, res, _next) => {
  console.error(err);
  if (req.path.startsWith('/api')) {
    return res.status(500).json({ error: err.message || 'Sunucu hatası' });
  }
  res.status(500).render('public/404', { title: 'Hata', message: 'Bir hata oluştu.' });
});

module.exports = app;
