const app = require('./app');
const config = require('./config');
const fs = require('fs');

const nodeMajor = parseInt(process.versions.node.split('.')[0], 10);
const nodeMinor = parseInt(process.versions.node.split('.')[1], 10);
if (nodeMajor < 22 || (nodeMajor === 22 && nodeMinor < 5)) {
  console.error(
    `\n  Hata: Node.js ${process.version} desteklenmiyor.\n  Bu proje için Node.js 22.5 veya üzeri gerekir (yerleşik SQLite).\n  İndirin: https://nodejs.org/\n`
  );
  process.exit(1);
}

if (!fs.existsSync(config.uploadsDir)) {
  fs.mkdirSync(config.uploadsDir, { recursive: true });
}

const server = app.listen(config.port, () => {
  console.log(`\n  Manşet Parti sunucusu çalışıyor: http://localhost:${config.port}`);
  console.log(`  Yönetim paneli: http://localhost:${config.port}/admin\n`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  Hata: Port ${config.port} zaten kullanımda.`);
    console.error('  Çalışan sunucuyu durdurun veya .env dosyasında PORT değerini değiştirin.\n');
  } else {
    console.error('\n  Sunucu hatası:', err.message, '\n');
  }
  process.exit(1);
});
