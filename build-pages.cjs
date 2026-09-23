// Reviewed templates are the source of truth, not generated output or the
// legacy descriptions in store.js. See BUILD.md for catalog changes.
const fs = require('node:fs');
const path = require('node:path');
const ROOT = __dirname;
const DEFAULT_ORIGIN = 'https://vitalcore.com.ar';
function templateFiles(dir = path.join(ROOT, 'templates'), prefix = '') {
  return fs.readdirSync(dir, {withFileTypes:true}).flatMap(entry => {
    const relative = prefix + entry.name;
    return entry.isDirectory() ? templateFiles(path.join(dir, entry.name), relative + '/') : entry.name.endsWith('.html') ? [relative] : [];
  }).sort();
}
function outputs(originValue = process.env.SITE_ORIGIN || DEFAULT_ORIGIN) {
  const origin = new URL(originValue);
  if (origin.protocol !== 'https:' || origin.pathname !== '/' || origin.search || origin.hash || origin.username || origin.password) {
    throw new Error('SITE_ORIGIN debe ser un origen HTTPS sin rutas ni credenciales.');
  }
  const result = new Map();
  const urls = [];
  for (const file of templateFiles()) {
    const pathname = file === 'index.html' ? '/' : '/' + file;
    const target = new URL(pathname, origin).href;
    const html = fs.readFileSync(path.join(ROOT, 'templates', file), 'utf8').replaceAll(DEFAULT_ORIGIN, origin.origin);
    if (!html.includes(`<link rel="canonical" href="${target}">`)) throw new Error(`Canonical incorrecto: ${file}`);
    result.set(file, html);
    urls.push(target);
    result.set('Vitalcore/' + file, `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>VitalCore — Página trasladada</title>
<link rel="canonical" href="${target}">
<script>location.replace(${JSON.stringify(target)} + location.search + location.hash);</script>
<meta http-equiv="refresh" content="0; url=${target}">
</head><body><p>La tienda está en <a href="${target}">${target}</a>.</p></body></html>
`);
  }
  result.set('CNAME', origin.hostname + '\n');
  result.set('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${origin.origin}/sitemap.xml\n`);
  result.set('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls.map(url => `  <url><loc>${url}</loc></url>`).join('\n') + '\n</urlset>\n');
  return result;
}
function build() {
  const generated = outputs();
  for (const [file, content] of generated) {
    fs.mkdirSync(path.dirname(path.join(ROOT, file)), {recursive:true});
    fs.writeFileSync(path.join(ROOT, file), content);
  }
  console.log(`Generadas ${templateFiles().length} páginas públicas desde templates/.`);
}
module.exports = {outputs, templateFiles};
if (require.main === module) build();
