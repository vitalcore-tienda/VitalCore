(() => {
  'use strict';

  const pathname = window.location.pathname === '/index.html' ? '/' : window.location.pathname;
  const pages = window.VITALCORE_STORE_PAGES;
  if (!pages || !Object.hasOwn(pages, pathname)) return;
  const page = pages[pathname];
  const id = window.VITALCORE_STORE_MEASUREMENT?.measurementId;
  if (typeof id !== 'string' || !/^G-[A-Z0-9]{6,20}$/.test(id)) return;
  const key = 'vitalcore_store_measurement_choice_v1';
  const layer = 'vitalcoreAnalyticsLayer';
  const whatsapp = 'https://wa.me/5491165846235';
  const productIds = new Set(['1','2','3','4','6','7','8','9','10','11','12','13','14','15','20']);
  let choice = null;
  let started = false;
  let tag;
  let preferenceButton;
  try {
    const saved = window.localStorage.getItem(key);
    if (saved === 'accepted' || saved === 'declined') choice = saved;
  } catch (_) { /* La elección también funciona en memoria. */ }

  function referrerOrigin() {
    try {
      const url = new URL(document.referrer);
      return /^https?:$/.test(url.protocol) ? url.origin + '/' : '';
    } catch (_) { return ''; }
  }
  function gtag() { window[layer].push(arguments); }
  function publicFields() {
    return {
      page_location: page.canonical,
      page_title: page.title,
      page_referrer: referrerOrigin(),
      page_type: page.pageType,
      content_slug: page.slug,
      product_id: productIds.has(page.productId) ? page.productId : 'site'
    };
  }
  function start() {
    if (choice !== 'accepted' || started) return;
    started = true;
    window[`ga-disable-${id}`] = false;
    window[layer] = window[layer] || [];
    // Use a dedicated layer: metrics.js keeps its existing Firebase queue.
    gtag('js', new Date());
    gtag('config', id, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      cookie_domain: 'none',
      cookie_path: '/',
      ...publicFields()
    });
    gtag('event', 'page_view', publicFields());
    tag = document.createElement('script');
    tag.async = true;
    tag.id = 'vitalcore-store-measurement-tag';
    tag.src = `https://www.googletagmanager.com/gtag/js?id=${id}&l=${layer}`;
    document.head.append(tag);
  }
  function clearCookies() {
    for (const item of document.cookie.split(';')) {
      const name = item.trim().split('=')[0];
      if (name === '_ga' || name === '_ga_' + id.slice(2)) {
        document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
      }
    }
  }
  function choose(value) {
    choice = value;
    try { window.localStorage.setItem(key, value); } catch (_) { /* Preferencia en memoria. */ }
    if (choice === 'accepted') start();
    else {
      window[`ga-disable-${id}`] = true;
      tag?.remove();
      if (window[layer]) window[layer].length = 0;
      started = false;
      clearCookies();
    }
    panel.hidden = true;
    preferenceButton?.focus();
  }
  const panel = document.createElement('aside');
  panel.className = 'vc-store-measurement';
  panel.hidden = true;
  panel.setAttribute('aria-labelledby', 'store-measurement-heading');
  panel.innerHTML = '<h2 id="store-measurement-heading" tabindex="-1">Preferencias de medición</h2><p>Podés permitir Google Analytics para medir visitas y clics a WhatsApp en la tienda y sus guías. No enviamos el texto de tus mensajes ni el contenido del carrito o los formularios.</p><p>Podés navegar y comprar sin aceptar. Los contadores existentes de intención de contacto son independientes. Consultá la <a href="/privacidad.html">información de privacidad</a> y cambiá tu elección desde el pie de página.</p><div class="vc-store-measurement-actions"><button type="button" data-measurement-decline>Seguir sin Analytics</button><button type="button" data-measurement-accept>Aceptar Analytics</button></div>';
  document.body.append(panel);
  panel.querySelector('[data-measurement-accept]').addEventListener('click', () => choose('accepted'));
  panel.querySelector('[data-measurement-decline]').addEventListener('click', () => choose('declined'));
  document.querySelectorAll('[data-measurement-preferences]').forEach(button => {
    button.hidden = false;
    button.addEventListener('click', () => {
      preferenceButton = button;
      panel.hidden = false;
      panel.querySelector('h2').focus();
    });
  });

  function trackWhatsapp(location, productId) {
    if (choice !== 'accepted' || !started) return;
    gtag('event', 'whatsapp_click', {
      ...publicFields(),
      cta_location: location,
      product_id: productIds.has(String(productId)) ? String(productId) : 'site',
      link_url: whatsapp,
      transport_type: 'beacon'
    });
  }
  document.addEventListener('click', event => {
    if (choice !== 'accepted' || !started || event.defaultPrevented || (event.button !== undefined && event.button !== 0)) return;
    const link = event.target.closest?.('a[href]');
    if (!link || link.closest('#admin-modal, form')) return;
    let url;
    try { url = new URL(link.href, window.location.href); } catch (_) { return; }
    if (url.origin !== 'https://wa.me' || url.pathname !== '/5491165846235') return;
    const location = link.closest('footer') ? 'footer'
      : link.closest('header, nav') ? 'header'
      : link.closest('[data-measurement-location="floating"]') ? 'floating'
      : link.closest('main, #cart-drawer, #catalogo, section') ? 'content' : 'other';
    trackWhatsapp(location, link.dataset.productId || 'site');
  });
  // checkoutOrder opens WhatsApp programmatically after validation. Only its
  // existing success notification is measured; normal links use the handler above.
  window.addEventListener('vitalcore:consultation', event => {
    if (event.detail?.kind === 'checkoutClicks') trackWhatsapp('content', 'site');
  });
  if (choice === 'accepted') start();
  if (choice === null) panel.hidden = false;
})();
