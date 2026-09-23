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

El sitemap se deriva automáticamente de las plantillas. Las rutas de compatibilidad
`Vitalcore/` se generan con redirección de navegador; no reemplazan las
redirecciones HTTP del alojamiento. No se eliminan rutas antiguas automáticamente:
al retirar una página hay que decidir su redirección antes de quitarla.

`SITE_ORIGIN` permite preparar otro origen HTTPS. La verificación usa ese mismo
valor; no se debe publicar una compilación de prueba en el dominio real.

Las pruebas verifican enlaces y recursos locales, metadatos, consistencia de
identificadores, precios válidos e inválidos y reproducción exacta de las fuentes.
No conectan con Firestore ni envían mensajes o pedidos.
