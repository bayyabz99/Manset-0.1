function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return res.status(401).json({ error: 'Oturum gerekli' });
  }
  return res.redirect('/admin/giris?redirect=' + encodeURIComponent(req.originalUrl));
}

function requireGuest(req, res, next) {
  if (req.session && req.session.userId) {
    return res.redirect('/admin');
  }
  next();
}

module.exports = { requireAuth, requireGuest };
