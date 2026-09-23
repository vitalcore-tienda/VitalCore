const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const {outputs, templateFiles} = require('./build-pages.cjs');
process.chdir(__dirname);
const source = fs.readFileSync('store.js', 'utf8');
const products = vm.runInNewContext(source.match(/let products = (\[[\s\S]*?\n        \]);/)[1]);
const slug = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const productPath = p => 'productos/' + slug(p.brand + '-' + p.name) + '.html';
const ids = new Set(products.map(p => String(p.id)));
const expected = outputs();
assert.deepEqual([...outputs()], [...expected], 'La generación debe ser determinista');
for (const [file, text] of expected) assert.equal(fs.readFileSync(file, 'utf8'), text, `Regenerar ${file}`);
const files = templateFiles();
assert.equal(files.filter(f => f.startsWith('productos/')).length, products.length);
for (const p of products) assert.ok(files.includes(productPath(p)), `Falta ficha para ${p.name}`);
for (const file of files) {
  const html = expected.get(file);
  assert.equal((html.match(/<h1\b/g) || []).length, 1, file);
  assert.equal((html.match(/rel="canonical"/g) || []).length, 1, file);
  assert.equal((html.match(/name="robots" content="index, follow"/g) || []).length, 1, file);
  assert.ok(html.includes('assets/store.css') && html.includes('metrics.js') && html.includes('store.js'), file);
  assert.ok(!html.includes('cdn.tailwindcss.com'), file);
  for (const [, url] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (/^(https?:|data:|mailto:|tel:|#)/.test(url)) continue;
    const local = decodeURIComponent(url.split(/[?#]/)[0]).replace(/^\//, '') || 'index.html';
    assert.ok(fs.existsSync(local), `${file}: recurso inexistente ${url}`);
  }
  const prices = [...html.matchAll(/data-product-price="(\d+)"/g)].map(m => m[1]).sort();
  const actions = [...html.matchAll(/data-product-action="(\d+)"/g)].map(m => m[1]).sort();
  assert.deepEqual(prices, actions, `${file}: precios sin botón correspondiente`);
  for (const id of prices) assert.ok(ids.has(id), `${file}: producto desconocido ${id}`);
  for (const [, image] of html.matchAll(/src="([^"]*product-[^"]+)"/g)) assert.ok(image.endsWith('.webp'), image);
  if (!file.startsWith('productos/')) assert.ok(html.includes('id="catalog-search"'), file);
  if (file.startsWith('productos/')) {
    const p = products.find(p => productPath(p) === file);
    assert.ok(html.includes(`data-product-price="${p.id}"`) && html.includes(`data-product-action="${p.id}"`), file);
    assert.ok(html.includes('fetchpriority="high"'), file);
  }
}
// Test actual runtime price/render functions, without connecting to Firebase.
const priceCode = source.slice(source.indexOf('const parsePriceNumber ='), source.indexOf('function setFirestoreStatus'));
const renderCode = source.slice(source.indexOf('window.renderProducts ='), source.indexOf('window.toggleMenu ='));
for (const p of products) {
  const priceNode = {textContent:''};
  const actionNode = {dataset:{state:'inquiry'}, innerHTML:'original inquiry'};
  const context = {products:[{...p}], document:{querySelectorAll(selector) { return selector.includes('data-product-price') ? [priceNode] : [actionNode]; }}};
  context.window = context;
  vm.createContext(context);
  vm.runInContext(priceCode + '\n' + renderCode, context);
  for (const [value, label, valid] of [[38000.5, '$38.000,5', true], ['45.000,50', '$45.000,5', true], [0, 'Consultar precio', false], ['0','Consultar precio',false], [-2,'Consultar precio',false], [null,'Consultar precio',false], ['no disponible','Consultar precio',false]]) {
    context.products[0].price = value;
    context.renderProducts();
    assert.equal(priceNode.textContent, label, p.name);
    assert.equal(actionNode.dataset.state, valid ? 'buy' : 'inquiry');
    assert.ok(actionNode.innerHTML.includes(valid ? `addToCart(${p.id})` : 'https://wa.me/'), p.name);
  }
}
for (const bad of ['http://example.com', 'https://example.com/path', 'https://user:pass@example.com', 'https://example.com/?test=1']) assert.throws(() => outputs(bad));
const alternate = outputs('https://preview.example');
assert.ok(alternate.get('sitemap.xml').includes('https://preview.example/productos/'));
assert.ok(!alternate.get('index.html').includes('https://vitalcore.com.ar'));
console.log(`OK: ${files.length} páginas, enlaces, WebP, metadatos, reproducción exacta y precios de ${products.length} productos.`);
