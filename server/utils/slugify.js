const slugifyLib = require('slugify');

function createSlug(text, existingSlugs = []) {
  let base = slugifyLib(text, { lower: true, strict: true, locale: 'tr' });
  if (!base) base = 'item';
  let slug = base;
  let counter = 1;
  while (existingSlugs.includes(slug)) {
    slug = `${base}-${counter++}`;
  }
  return slug;
}

module.exports = { createSlug };
