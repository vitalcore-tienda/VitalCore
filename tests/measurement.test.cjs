const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'assets/measurement.js'), 'utf8');
const metricsSource = fs.readFileSync(path.join(root, 'metrics.js'), 'utf8');
const pagesSource = fs.readFileSync(path.join(root, 'assets/measurement-pages.js'), 'utf8');
const base = 'https://vitalcore.com.ar';
const id = 'G-D9B599ML4C';
const key = 'vitalcore_store_measurement_choice_v1';
const layer = 'vitalcoreAnalyticsLayer';

function harness(options = {}) {
  const nodes = [];
  const listeners = {};
  const stored = new Map(options.choice ? [[key, options.choice]] : []);
  const cookies = new Map([['_ga', 'abc'], ['_ga_D9B599ML4C', 'def'], ['_ga_OTHER', 'keep'], ['unrelated', 'keep']]);
  const deletions = [];
  function node(tag) {
    const handlers = {};
    const children = new Map();
    const value = {
      tag, handlers, hidden:true, removed:false, focused:false,
      addEventListener(type, fn) { handlers[type] = fn; },
      setAttribute() {},
      querySelector(selector) {
        if (!children.has(selector)) children.set(selector, node('button'));
        return children.get(selector);
      },
      focus() { this.focused = true; },
      remove() { this.removed = true; }
    };
    nodes.push(value);
    return value;
  }
  function on(target, type, fn) { (listeners[target + ':' + type] ||= []).push(fn); }
  function emit(target, type, event) { for (const fn of listeners[target + ':' + type] || []) fn(event); }
  const preference = node('button');
  const document = {
    referrer:'https://www.google.com/search?q=persona%40example.com#private',
    head:{append(value) { value.inHead = true; }},
    body:{append(value) { value.inBody = true; }},
    createElement:node,
    querySelectorAll() { return [preference]; },
    addEventListener(type, fn) { on('document', type, fn); }
  };
  Object.defineProperty(document, 'cookie', {
    get() { return [...cookies].map(([name, value]) => `${name}=${value}`).join('; '); },
    set(value) { if (value.includes('Max-Age=0')) { deletions.push(value); cookies.delete(value.split('=')[0]); } }
  });
  const window = {
    location:new URL(options.url || base + '/guias/creatina-monohidratada.html?email=persona@example.com#private'),
    VITALCORE_STORE_MEASUREMENT:{measurementId:options.id === undefined ? id : options.id},
    dataLayer:[{event:'whatsapp_click', source:'private', page_path:'/admin?secret=private'}],
    localStorage:{
      getItem(name) { if (options.storageBlocked) throw Error('Unavailable'); return stored.get(name) || null; },
      setItem(name, value) { if (options.storageBlocked) throw Error('Unavailable'); stored.set(name, value); }
    },
    addEventListener(type, fn) { on('window', type, fn); },
    dispatchEvent(event) { emit('window', event.type, event); }
  };
  const context = {window, document, URL, Date, Set, location:window.location, localStorage:window.localStorage, console,
    CustomEvent:class { constructor(type, options) { this.type = type; this.detail = options.detail; } }
  };
  vm.createContext(context);
  vm.runInContext(pagesSource, context);
  if (options.metrics === 'before') vm.runInContext(metricsSource, context);
  vm.runInContext(source, context);
  if (options.metrics === 'after') vm.runInContext(metricsSource, context);
  const panel = nodes.find(value => value.tag === 'aside');
  function click(href, area = 'main', productId, extra = {}) {
    let prevented = false;
    const link = {href, dataset:{productId}, closest(selector) { return selector.split(',').map(value => value.trim()).includes(area) ? {} : null; }};
    const event = {target:{closest() { return link; }}, preventDefault() { prevented = true; }, ...extra};
    emit('document', 'click', event);
    assert.equal(prevented, false, 'la medición no bloquea el enlace');
    assert.equal(link.href, href, 'el destino y mensaje del enlace original permanecen intactos');
  }
  return {
    window, document, stored, cookies, deletions, panel, preference, click,
    accept() { panel.querySelector('[data-measurement-accept]').handlers.click(); },
    decline() { panel.querySelector('[data-measurement-decline]').handlers.click(); },
    checkout(extra = {}) { window.vitalcoreTrackConsultation({kind:'checkoutClicks', productId:'site', source:'checkout', ...extra}); },
    tags() { return nodes.filter(value => value.tag === 'script' && value.inHead && !value.removed); },
    events() { return JSON.parse(JSON.stringify((window[layer] || []).filter(args => args[0] === 'event').map(args => [args[1], args[2]]))); }
  };
}

test('sin ID válido no se carga Google ni aparecen controles sin función', () => {
  for (const measurementId of ['', 'G-invalid', 'UA-12345678', 'G-123&private=1']) {
    const app = harness({id:measurementId});
    assert.equal(app.tags().length, 0);
    assert.equal(app.panel, undefined);
    assert.equal(app.preference.hidden, true);
    app.click('https://wa.me/5491165846235?text=private');
    assert.deepEqual(app.events(), []);
  }
});

test('se requiere aceptación explícita y rechazo o almacenamiento bloqueado no cargan Analytics', () => {
  for (const options of [{}, {storageBlocked:true}]) {
    const app = harness(options);
    assert.equal(app.preference.hidden, false);
    assert.equal(app.panel.hidden, false);
    assert.equal(app.tags().length, 0);
    app.click('https://wa.me/5491165846235?text=private');
    assert.deepEqual(app.events(), []);
    app.decline();
    assert.equal(app.tags().length, 0);
    assert.equal(app.window[`ga-disable-${id}`], true);
  }
  const declined = harness({choice:'declined'});
  assert.equal(declined.panel.hidden, true);
  assert.equal(declined.tags().length, 0);
});

test('aceptar carga un solo tag y envía metadatos estáticos sin mensajes ni URL privada', () => {
  const app = harness();
  app.accept();
  assert.equal(app.stored.get(key), 'accepted');
  assert.equal(app.tags().length, 1);
  assert.equal(app.tags()[0].src, 'https://www.googletagmanager.com/gtag/js?id=' + id + '&l=' + layer);
  const config = app.window[layer].find(args => args[0] === 'config')[2];
  for (const name of ['send_page_view','allow_google_signals','allow_ad_personalization_signals']) assert.equal(config[name], false);
  assert.equal(config.cookie_domain, 'none');
  assert.equal(config.cookie_path, '/');
  assert.equal(config.page_location, base + '/guias/creatina-monohidratada.html');
  assert.equal(config.page_referrer, 'https://www.google.com/');
  app.click('https://wa.me/5491165846235?text=persona%40example.com#private', 'main', '4');
  app.click('https://wa.me/5491165846235', 'footer', 'invalid-email@example.com');
  assert.deepEqual(app.events().map(([name]) => name), ['page_view','whatsapp_click','whatsapp_click']);
  assert.equal(app.events()[1][1].product_id, '4');
  assert.equal(app.events()[1][1].cta_location, 'content');
  assert.equal(app.events()[2][1].product_id, 'site');
  assert.equal(app.events()[2][1].cta_location, 'footer');
  assert.equal(app.events()[1][1].link_url, 'https://wa.me/5491165846235');
  assert.equal(app.events()[0][1].page_type, 'guide');
  assert.equal(app.events()[0][1].content_slug, 'creatina-monohidratada');
  assert.doesNotMatch(JSON.stringify(app.events()), /private|example\.com|%40|\?|#/);
  app.preference.handlers.click();
  app.accept();
  assert.equal(app.tags().length, 1);
  assert.equal(app.events().filter(([name]) => name === 'page_view').length, 1);
  assert.deepEqual(app.window.dataLayer, [{event:'whatsapp_click', source:'private', page_path:'/admin?secret=private'}]);
});

test('WhatsApp exige origen y número exactos; se excluyen admin, formularios y clics cancelados', () => {
  const app = harness({choice:'accepted'});
  for (const url of ['https://wa.me/other','http://wa.me/5491165846235','https://wa.me.evil.test/5491165846235','https://example.com/?next=https://wa.me/5491165846235','mailto:test@example.com']) app.click(url);
  app.click('https://wa.me/5491165846235', '#admin-modal');
  app.click('https://wa.me/5491165846235', 'form');
  app.click('https://wa.me/5491165846235', 'main', '4', {defaultPrevented:true});
  app.click('https://wa.me/5491165846235', 'main', '4', {button:1});
  assert.equal(app.events().length, 1);
  for (const [area, expected] of [['header','header'],['[data-measurement-location="floating"]','floating'],['unknown','other']]) {
    app.click('https://wa.me/5491165846235', area);
    assert.equal(app.events().at(-1)[1].cta_location, expected);
  }
});

test('revocar detiene eventos y borra solo cookies GA de tienda sin tocar contador Firebase', () => {
  const app = harness({choice:'accepted', metrics:'after'});
  app.preference.handlers.click();
  app.decline();
  assert.equal(app.window[`ga-disable-${id}`], true);
  assert.equal(app.tags().length, 0);
  assert.deepEqual([...app.cookies], [['_ga_OTHER','keep'],['unrelated','keep']]);
  assert.equal(app.deletions.length, 2);
  assert.equal(app.preference.focused, true);
  for (const deletion of app.deletions) assert.match(deletion, /path=\/; SameSite=Lax$/);
  app.click('https://wa.me/5491165846235?text=private', 'footer', '4');
  app.checkout();
  assert.deepEqual(app.events(), []);
  assert.equal(app.window.vitalcorePendingInquiries(), 2);
  assert.equal(app.window.dataLayer.length, 3);
  app.preference.handlers.click();
  app.accept();
  assert.equal(app.tags().length, 1);
  assert.equal(app.events().length, 1);
  assert.equal(app.window[`ga-disable-${id}`], false);
});

test('metrics antes o después mantiene conteos y genera un solo evento GA por enlace o checkout', () => {
  for (const order of ['before','after']) {
    const app = harness({choice:'accepted', metrics:order});
    app.click('https://wa.me/5491165846235?text=private', 'main', '4');
    assert.equal(app.window.vitalcorePendingInquiries(), 1);
    assert.equal(app.events().filter(([name]) => name === 'whatsapp_click').length, 1);
    app.checkout({message:'private@example.com', cart:[{name:'private'}]});
    assert.equal(app.window.vitalcorePendingInquiries(), 2);
    assert.equal(app.events().filter(([name]) => name === 'whatsapp_click').length, 2);
    assert.equal(app.events().at(-1)[1].product_id, 'site');
    assert.doesNotMatch(JSON.stringify(app.events()), /private|example\.com|message|cart|page_path|source/);
    app.checkout({productId:'not-a-known-id'});
    assert.equal(app.window.vitalcorePendingInquiries(), 2);
    assert.equal(app.events().filter(([name]) => name === 'whatsapp_click').length, 2);
    const queue = JSON.parse(app.stored.get('vitalcore-pending-inquiries-v1'));
    assert.deepEqual(queue, {'4:whatsappClicks':1, 'site:checkoutClicks':1});
  }
});

test('el mapa público coincide con las 29 plantillas y no admite privacidad, traslado ni admin', () => {
  const {outputs, templateFiles} = require('../build-pages.cjs');
  const expected = outputs();
  const app = harness({choice:'accepted'});
  const pages = app.window.VITALCORE_STORE_PAGES;
  const publicFiles = templateFiles().filter(file => file !== 'privacidad.html');
  assert.equal(Object.keys(pages).length, 29);
  assert.equal(publicFiles.length, 29);
  for (const file of publicFiles) {
    const pathname = file === 'index.html' ? '/' : '/' + file;
    const html = expected.get(file);
    assert.equal(pages[pathname].title, html.match(/<title>([^<]+)<\/title>/)[1]);
    assert.equal(pages[pathname].canonical, new URL(pathname, base).href);
    const page = harness({url:base + pathname + '?private=email@example.com#private', choice:'accepted'});
    assert.equal(page.tags().length, 1, file);
    assert.equal(page.events()[0][1].page_location, base + pathname, file);
    assert.equal(page.events()[0][1].product_id, pages[pathname].productId, file);
  }
  for (const file of ['privacidad.html','admin.html','Vitalcore/index.html','Vitalcore/guias/creatina-monohidratada.html','guias/otra.html','productos/inexistente.html']) {
    const excluded = harness({url:base + '/' + file, choice:'accepted'});
    assert.equal(excluded.tags().length, 0, file);
    assert.equal(excluded.panel, undefined, file);
    assert.deepEqual(excluded.events(), [], file);
  }
  assert.equal(harness({url:base + '/index.html', choice:'accepted'}).events()[0][1].page_location, base + '/');
  assert.ok(!expected.get('sitemap.xml').includes('/privacidad.html'));
  assert.match(expected.get('privacidad.html'), /noindex, follow/);
  assert.doesNotMatch(expected.get('privacidad.html'), /assets\/measurement|src="(?:metrics|store)\.js"/);
  assert.doesNotMatch(expected.get('Vitalcore/guias/creatina-monohidratada.html'), /measurement/);
});

test('los CTAs públicos de la portada y las secciones se identifican como contenido', () => {
  const app = harness({url:base + '/', choice:'accepted'});
  for (const area of ['#catalogo','section','#cart-drawer']) {
    app.click('https://wa.me/5491165846235?text=private', area, '4');
    assert.equal(app.events().at(-1)[1].cta_location, 'content');
    assert.equal(app.events().at(-1)[1].page_type, 'home');
    assert.equal(app.events().at(-1)[1].product_id, '4');
  }
  // These contact sections are outside <main> on the reviewed catalog pages.
  const html = fs.readFileSync(path.join(root, 'templates/index.html'), 'utf8');
  assert.match(html, /<section[^>]+id="catalogo"/);
  assert.match(html, /<section[^>]*>[\s\S]*?Hablar con un Asesor[\s\S]*?<\/section>/);
});
