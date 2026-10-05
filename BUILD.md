# Generación del catálogo

Las páginas revisadas de `templates/` son las fuentes editoriales. Los HTML de
la raíz, `productos/`, `categorias/` y `marcas/` son resultados de publicación.
El generador ya no extrae las descripciones antiguas de `store.js` ni toma la
portada generada como plantilla para todas las páginas.

1. Editar la página correspondiente en `templates/`. Para contenido compartido
   (navegación, tarjetas o pie), actualizar las plantillas donde aparece.
2. Ejecutar `node build-pages.cjs`.
3. Ejecutar `node verify-catalog.cjs` y revisar el diff antes de publicar.

Al agregar un producto, registrar sus datos operativos en `store.js`, crear su
plantilla en `templates/productos/` y enlazarlo desde portada, categoría y marca.
Copiar una ficha existente y actualizar canonical, título, descripción, enlaces,
imágenes e identificadores `data-product-*`. No copiar precios: los precios
siguen viniendo de Firestore y el HTML inicial ofrece consultar por WhatsApp.
Las páginas de categorías y marcas también se mantienen en `templates/`.

Las guías editoriales se mantienen en `templates/guias/` y usan
`assets/guides.css` junto con la hoja de la tienda. No cargan el carrito ni
Firebase: sus enlaces conducen al catálogo y a WhatsApp. Al editar una guía,
conservar sus fuentes, fecha de revisión y metadatos; actualizar los enlaces de
portada y categoría cuando corresponda. El generador incluye estas páginas en
el sitemap y la verificación comprueba también sus datos estructurados y secciones.

El sitemap se deriva automáticamente de las plantillas. Las rutas de compatibilidad
`Vitalcore/` se generan con redirección de navegador; no reemplazan las
redirecciones HTTP del alojamiento. No se eliminan rutas antiguas automáticamente:
al retirar una página hay que decidir su redirección antes de quitarla.

`SITE_ORIGIN` permite preparar otro origen HTTPS. La verificación usa ese mismo
valor; no se debe publicar una compilación de prueba en el dominio real.

Las pruebas verifican enlaces y recursos locales, metadatos, consistencia de
identificadores, precios válidos e inválidos y reproducción exacta de las fuentes.
No conectan con Firestore ni envían mensajes o pedidos.

La medición opcional de GA4 se mantiene en `assets/measurement.js`, con el ID
del flujo en `assets/measurement-config.js`. Antes de activar un ID, desactivar
todos los eventos de Medición mejorada en ese flujo: las visitas y los clics de
esta implementación se envían manualmente y sin parámetros del enlace a WhatsApp.
El generador deriva `assets/measurement-pages.js` de las plantillas públicas:
es la lista cerrada de rutas, títulos e identificadores permitidos para Analytics.
Al agregar una nueva clase de página, clasificarla explícitamente en el generador.

Las preferencias de Analytics son independientes del contador existente de
Firebase en `metrics.js`. Los enlaces usan una sola escucha de clics para GA4.
El checkout que abre WhatsApp mediante código emite `vitalcore:consultation`
después de abrir la ventana; ese aviso lleva únicamente `kind:checkoutClicks`,
y se mide una vez como intención de contacto, sin datos del carrito. La capa
`vitalcoreAnalyticsLayer` está separada del `dataLayer` preexistente del contador.

`templates/privacidad.html` se genera sin Analytics ni Firebase, con `noindex,
follow` y fuera del sitemap. Mantener los scripts, la hoja de consentimiento y
el control de preferencias en las fuentes públicas para que una regeneración
no borre la integración. Verificar también `node --test tests/*.test.cjs`.

Los recursos de medición y `metrics.js` se enlazan con `?v=20261005` para evitar
versiones antiguas o respuestas 404 conservadas en la caché. Al modificar estos
scripts o estilos, incrementar la versión en sus referencias públicas de
`templates/`, actualizar su comprobación en el verificador y regenerar las páginas.
