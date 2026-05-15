const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const config = require('../config');

const SIZES = {
  thumb: { width: 400, height: 400 },
  medium: { width: 800, height: 800 },
  large: { width: 1400, height: 1400 },
};

async function processImage(inputPath, subfolder = 'products') {
  const ext = '.webp';
  const basename = path.basename(inputPath, path.extname(inputPath));
  const outDir = path.join(config.uploadsDir, subfolder, basename);

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const results = {};
  for (const [sizeName, dims] of Object.entries(SIZES)) {
    const outPath = path.join(outDir, `${sizeName}${ext}`);
    await sharp(inputPath)
      .resize(dims.width, dims.height, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: sizeName === 'thumb' ? 80 : 85 })
      .toFile(outPath);
    results[sizeName] = `/uploads/${subfolder}/${basename}/${sizeName}${ext}`;
  }

  if (fs.existsSync(inputPath) && inputPath.includes('temp')) {
    fs.unlinkSync(inputPath);
  }

  return results;
}

module.exports = { processImage, SIZES };
