// Tulis _routes.json biar CF Pages Functions trigger ke semua route
const fs = require('fs');
const path = require('path');

const routes = {
  version: 1,
  include: ['/*'],
  exclude: ['/_next/static/*', '/_next/image/*', '/logo*.png', '/manifest.json']
};

const dest = path.join(__dirname, '..', '.vercel', 'output', 'static', '_routes.json');
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, JSON.stringify(routes));
console.log('_routes.json written to', dest);
