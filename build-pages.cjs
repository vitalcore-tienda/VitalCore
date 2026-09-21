// Run with node build-pages.cjs after changing the catalog or the home template.
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
process.chdir(__dirname);
// Set SITE_ORIGIN to the verified public origin when publishing.
const origin = new URL(process.env.SITE_ORIGIN || 'https://vitalcore.com.ar/');
if (origin && (origin.protocol !== 'https:' || origin.pathname !== '/' || origin.search || origin.hash || origin.username || origin.password)) {
    throw new Error('SITE_ORIGIN debe ser el dominio HTTPS sin rutas, parámetros ni credenciales.');
}
const canonical = pathname => origin ? new URL(pathname, origin).href : pathname;
const publicPaths = ['/'];
const consolidate = (html, pathname) => html
    .replace(/\s*<meta\b[^>]*name="robots"[^>]*>/g, '')
    .replace(/\s*<!-- legacy-route -->[\s\S]*?<!-- \/legacy-route -->/g, '')
    .replace(/\s*<base\b[^>]*>/g, '')
    .replace(/\s*<link\b[^>]*rel="canonical"[^>]*>/g, '')
    .replace('<head>', () => `<head>\n    <base href="/">\n    <meta name="robots" content="index, follow">\n    <link rel="canonical" href="${canonical(pathname)}">\n    <!-- legacy-route --><script>if (/^\\/Vitalcore(?:\\/|$)/.test(location.pathname)) location.replace(${JSON.stringify(canonical(pathname))} + location.search + location.hash);</script><!-- /legacy-route -->`)
    .replace(/href="(?:index\.html)?#/g, 'href="/#');
const source = fs.readFileSync('store.js', 'utf8');
const products = vm.runInNewContext(source.match(/let products = (\[[\s\S]*?\n        \]);/)[1]);
const slug = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const esc = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const productUrl = p => `productos/${slug(p.brand + '-' + p.name)}.html`;
const categoryUrl = category => `categorias/${slug(category)}.html`;
const brandUrl = brand => `marcas/${slug(brand)}.html`;
const categories = [...new Set(products.map(p => p.category))];
const brands = [...new Set(products.map(p => p.brand))];
const inquiry = p => `https://wa.me/5491165846235?text=${encodeURIComponent(`Hola, quisiera consultar el precio de ${p.name} (${p.brand}).`)}`;
const link = (url, label, active = false) => `<a href="${url}" ${active ? 'aria-current="page"' : ''} class="${active ? 'bg-brand-dark text-white' : 'bg-white text-gray-700'} px-5 py-2 rounded-full font-semibold text-sm border border-gray-200 hover:underline">${esc(label)}</a>`;
const navigation = (category, brand) => `<nav aria-label="Categorías" class="mt-6 flex flex-wrap justify-center gap-3">${link('index.html#catalogo', 'Todos', !category && !brand)}${categories.map(c => link(categoryUrl(c), c, c === category)).join('')}</nav><nav aria-label="Marcas" class="mt-4 flex flex-wrap justify-center gap-3">${brands.map(b => link(brandUrl(b), b, b === brand)).join('')}</nav>`;
const image = (p, side = 1) => fs.existsSync(`tarjeta${p.id}.${side}.jpg`) ? `<img src="tarjeta${p.id}.${side}.jpg" alt="${esc(p.name)} — ${side === 1 ? 'Frente' : 'Dorso'}" width="600" height="600" loading="lazy" class="w-full h-64 object-contain bg-white rounded-xl">` : '';
const cards = list => list.map(p => `<article class="bg-white rounded-xl border p-5 flex flex-col gap-3"><a href="${productUrl(p)}">${image(p)}<h3 class="font-display text-xl underline mt-3">${esc(p.name)}</h3></a><a href="${categoryUrl(p.category)}" class="text-sm underline">${esc(p.category)}</a><p class="text-sm text-gray-600">${esc(p.brand)}</p><p class="text-sm">${esc(p.description)}</p><p>Consultar precio</p><a href="${inquiry(p)}" target="_blank" rel="noopener noreferrer" class="font-bold underline">Consultar por WhatsApp</a></article>`).join('\n');
let home = fs.readFileSync('index.html', 'utf8');
// Markers keep repeated builds deterministic.
if (!home.includes('<!-- catalog-navigation -->')) {
    home = home.replace(/<div class="mt-6[^>]*id="filters">[\s\S]*?<\/div>/, '<!-- catalog-navigation --><!-- /catalog-navigation -->');
    home = home.replace(/(<div id="product-grid"[^>]*>)[\s\S]*?(\n            <\/div>)/, '$1<!-- catalog-cards --><!-- /catalog-cards -->$2');
}
home = home.replace(/<!-- catalog-navigation -->[\s\S]*?<!-- \/catalog-navigation -->/, `<!-- catalog-navigation -->${navigation()}<!-- /catalog-navigation -->`);
home = home.replace(/<!-- catalog-cards -->[\s\S]*?<!-- \/catalog-cards -->/, `<!-- catalog-cards -->${cards(products)}<!-- /catalog-cards -->`);
home = consolidate(home, '/');
fs.writeFileSync('index.html', home);
fs.writeFileSync('CNAME', origin.hostname + '\n');
function legacyPage(url, pathname) {
    const target = canonical(pathname);
    const output = path.join('Vitalcore', url);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>VitalCore — Página trasladada</title>
<link rel="canonical" href="${target}">
<script>location.replace(${JSON.stringify(target)} + location.search + location.hash);</script>
<meta http-equiv="refresh" content="0; url=${target}">
</head><body><p>La tienda está en <a href="${target}">${target}</a>.</p></body></html>\n`);
}
legacyPage('index.html', '/');
function page(url, title, description, attributes, content) {
    publicPaths.push('/' + url);
    let html = home
        .replace(/<title>.*?<\/title>/, `<title>${esc(title)} | VitalCore</title>`)
        .replace(/(<meta (?:name="description"|property="og:description") content=")[^"]*"/g, `$1${esc(description)}"`)
        .replace(/(<meta property="og:title" content=")[^"]*"/, `$1${esc(title)} | VitalCore"`)
        .replace(/<body([^>]*)>/, `<body$1 ${attributes}>`)
        .replace(/href="#([^" ]*)"/g, 'href="index.html#$1"')
        .replace(/    <!-- Hero Section -->[\s\S]*?    <!-- Beneficios -->/, `<main class="bg-slate-50 py-12"><div class="container mx-auto px-4 md:px-6">${content}</div></main>\n    <!-- Beneficios -->`);
    fs.mkdirSync(path.dirname(url), { recursive: true });
    fs.writeFileSync(url, consolidate(html, '/' + url));
    legacyPage(url, '/' + url);
}
for (const [kind, values] of [['category', categories], ['brand', brands]]) {
    for (const value of values) {
        const list = products.filter(p => p[kind] === value);
        page(kind === 'category' ? categoryUrl(value) : brandUrl(value), value, `${value} en VitalCore. Explorá los ${list.length} productos y consultá sus precios.`, `data-${kind}="${esc(value)}"`, `
            <nav aria-label="Ruta de navegación"><a href="index.html#catalogo" class="underline">Catálogo</a> / <span aria-current="page">${esc(value)}</span></nav>
            <h1 class="text-4xl font-display mt-6">${esc(value)}</h1><p class="mt-3">${list.length} productos disponibles en el catálogo.</p>
            ${navigation(kind === 'category' ? value : null, kind === 'brand' ? value : null)}
            <div id="product-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">${cards(list)}</div>`);
    }
}
for (const p of products) {
    page(productUrl(p), `${p.name} — ${p.brand}`, p.description, `data-product-id="${p.id}"`, `
        <nav aria-label="Ruta de navegación" class="text-sm"><a href="index.html#catalogo" class="underline">Catálogo</a> / <a href="${categoryUrl(p.category)}" class="underline">${esc(p.category)}</a> / <span aria-current="page">${esc(p.name)}</span></nav>
        <article class="grid md:grid-cols-2 gap-8 mt-8"><div class="grid gap-4">${image(p)}${image(p, 2)}</div><div>
            <a href="${brandUrl(p.brand)}" class="uppercase text-sm underline">${esc(p.brand)}</a><h1 class="text-4xl font-display mt-3">${esc(p.name)}</h1>
            <p class="mt-6 text-gray-600 leading-relaxed">${esc(p.description)}</p><p class="mt-4">Categoría: <a href="${categoryUrl(p.category)}" class="underline">${esc(p.category)}</a></p>
            <p id="detail-price" aria-live="polite" class="text-2xl font-bold mt-8">Consultar precio</p><div id="detail-action" class="mt-4"><a href="${inquiry(p)}" target="_blank" rel="noopener noreferrer" class="bg-brand-primary font-bold px-6 py-3 rounded-lg inline-block">Consultar por WhatsApp</a></div>
            <a href="${inquiry(p)}" target="_blank" rel="noopener noreferrer" class="block underline mt-6">Asesoramiento por WhatsApp</a>
        </div></article><div id="product-grid" hidden></div>
        <section class="mt-12"><h2 class="text-2xl font-display mb-6">Más productos para explorar</h2><div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">${cards(products.filter(other => other.id !== p.id && other.category === p.category).concat(products.filter(other => other.category !== p.category)).slice(0, 3))}</div></section>`);
}
// Include only canonical public pages; let crawlers follow legacy redirects.
// Omit lastmod because a build is not evidence of a content update.
fs.writeFileSync('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    [...new Set(publicPaths)].map(pathname => `  <url><loc>${esc(canonical(pathname))}</loc></url>`).join('\n') +
    '\n</urlset>\n');
fs.writeFileSync('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${canonical('/sitemap.xml')}\n`);
console.log(`Generadas ${products.length} fichas, ${categories.length} categorías y ${brands.length} marcas; sitemap y robots.txt actualizados.`);
