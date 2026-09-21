import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
        import { getFirestore, collection, doc, setDoc, onSnapshot, increment, writeBatch } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

        // Configuración Firebase
        const firebaseConfig = {
            apiKey: "AIzaSyBelpHAhAcmqFpCcfrSwn027HOt1x4D_kQ",
            authDomain: "vitalcore-7db63.firebaseapp.com",
            projectId: "vitalcore-7db63",
            storageBucket: "vitalcore-7db63.firebasestorage.app",
            messagingSenderId: "114574548383",
            appId: "1:114574548383:web:f1c62e20311c35c01571aa"
        };

        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);

        // --- DATOS ESTÁTICOS DE PRODUCTOS ---
        let products = [
            { id: 1, brand: "Star Nutrition", name: "Nitro Whey", price: null, ordersCount: 0, description: "Blend de máxima pureza y rápida absorción. La fórmula definitiva para potenciar tu recuperación y crecimiento magro.", category: "Proteínas" },
            { id: 2, brand: "Star Nutrition", name: "Whey Protein Platinum 2lb", price: null, ordersCount: 0, description: "Concentrado de suero 100% premium. Rica en BCAAs para un desarrollo muscular sólido y un sabor increíble.", category: "Proteínas" },
            { id: 3, brand: "Star Nutrition", name: "Whey Protein 2lb Doy Pack", price: null, ordersCount: 0, description: "La calidad Platinum en formato refill. Misma potencia muscular, a un precio más inteligente y conveniente.", category: "Proteínas" },
            { id: 4, brand: "Star Nutrition", name: "Creatina Monohidratada 300g", price: null, ordersCount: 0, description: "Micronizada y 100% pura. Llevá tu fuerza, resistencia y potencia explosiva al siguiente nivel.", category: "Creatinas" },
            { id: 6, brand: "Star Nutrition", name: "Ami.Esenciales (EAA)", price: null, ordersCount: 0, description: "Perfil completo de los 9 aminoácidos esenciales. Bloquea el desgaste muscular y acelera tu regeneración al máximo.", category: "Aminoácidos" },
            { id: 20, brand: "Star Nutrition", name: "Creatina Doy pack 300g", price: null, ordersCount: 0, description: "Formato refill económico. La misma creatina micronizada de siempre, 100% pura.", category: "Creatinas" },
            { id: 7, brand: "Star Nutrition", name: "Pump 3D Pre-Entreno", price: null, ordersCount: 0, description: "Energía explosiva, resistencia extrema y máxima concentración para superar tus límites en cada sesión.", category: "Pre-Entrenos" },
            { id: 8, brand: "Ena", name: "Protein Bar Crunch", price: null, ordersCount: 0, description: "El snack proteico perfecto. Práctico, delicioso y cargado de proteínas para tu recuperación muscular.", category: "Snacks" },
            { id: 9, brand: "Gold Nutrition", name: "Proteína Doypack Gold Nutrition", price: null, ordersCount: 0, description: "Proteína de alta calidad en formato Doypack. Ideal para una rápida recuperación y desarrollo muscular.", category: "Proteínas" },
            { id: 10, brand: "Ena", name: "Hydroxy Max Night x 120 tabs", price: null, ordersCount: 0, description: "Quemador de grasas nocturno sin estimulantes. Optimiza el metabolismo mientras favorece un descanso profundo.", category: "Quemadores" },
            { id: 11, brand: "Star Nutrition", name: "Magnesio", price: null, ordersCount: 0, description: "Suplemento esencial para la óptima recuperación muscular, prevención de calambres y mejora del rendimiento físico.", category: "Minerales" },
            { id: 12, brand: "Ena", name: "Magnesio", price: null, ordersCount: 0, description: "Magnesio de alta absorción. Ayuda a reducir la fatiga, mejora la contracción muscular y equilibra los electrolitos.", category: "Minerales" },
            { id: 13, brand: "Ena", name: "Caja Iron Bar x 12 unid.", price: null, ordersCount: 0, description: "Caja cerrada de barras hiperproteicas. Excelente sabor y el mejor aporte nutricional para tus colaciones.", category: "Snacks" },
            { id: 14, brand: "Star Nutrition", name: "Cafeína 200mg", price: null, ordersCount: 0, description: "Energía pura en cápsulas. Ideal para mejorar la concentración, aumentar el estado de alerta y potenciar tus entrenamientos.", category: "Energizantes" },
            { id: 15, brand: "Ena", name: "Caffeine 200", price: null, ordersCount: 0, description: "Máxima pureza para un impulso de energía inmediato. Reduce la fatiga y optimiza tu rendimiento físico y mental.", category: "Energizantes" }
        ];

        const slug = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const productUrl = product => 'productos/' + slug(product.brand + '-' + product.name) + '.html';
        const categoryUrl = category => 'categorias/' + slug(category) + '.html';

        // Estado del Carrito de Compras
        const CART_STORAGE_KEY = 'vitalcore-cart-v1';

        const loadCart = () => {
            try {
                const storedCart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || '[]');
                if (!Array.isArray(storedCart)) return [];

                const validIds = new Set(products.map(product => product.id));
                const quantities = new Map();

                storedCart.forEach(item => {
                    const id = Number(item?.id);
                    const quantity = Number(item?.quantity);
                    if (!validIds.has(id) || !Number.isInteger(quantity) || quantity <= 0) return;
                    quantities.set(id, Math.min((quantities.get(id) || 0) + quantity, 99));
                });

                return [...quantities].map(([id, quantity]) => ({ id, quantity }));
            } catch (error) {
                console.warn('No se pudo recuperar el carrito guardado:', error);
                return [];
            }
        };

        const persistCart = () => {
            try {
                localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
            } catch (error) {
                console.warn('No se pudo guardar el carrito:', error);
            }
        };

        let cart = loadCart();
        let isCheckingOut = false;

        const getDetailedCart = () => cart
            .map(cartItem => {
                const product = products.find(p => p.id === cartItem.id);
                return product ? { ...product, quantity: cartItem.quantity } : null;
            })
            .filter(Boolean);

        // --- FORMATEO DE PRECIOS ---
        const parsePriceNumber = (price) => {
            if (typeof price === 'number') {
                return Number.isFinite(price) && price > 0 && price <= Number.MAX_SAFE_INTEGER ? price : null;
            }
            if (typeof price !== 'string') return null;
            const cleanPrice = price.trim().replace(/^\$\s*/, '');
            // Formato argentino: miles con punto y decimales con coma.
            if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(cleanPrice)) return null;
            const number = Number(cleanPrice.replace(/\./g, '').replace(',', '.'));
            return Number.isFinite(number) && number > 0 && number <= Number.MAX_SAFE_INTEGER ? number : null;
        };

        const hasValidPrice = (price) => parsePriceNumber(price) !== null;

        const formatPrice = (price) => {
            const number = parsePriceNumber(price);
            return number === null ? 'Consultar precio' : number.toLocaleString('es-AR');
        };

        const priceInquiryUrl = (product) => `https://wa.me/5491165846235?text=${encodeURIComponent(`Hola, quisiera consultar el precio de ${product.name} (${product.brand}).`)}`;

        function setFirestoreStatus(status) {
            const statusElement = document.getElementById('firestore-status');
            if (!statusElement) return;

            const states = {
                connected: {
                    className: 'flex items-center gap-1 text-green-600 font-semibold',
                    content: '<i class="fa-solid fa-wifi"></i> Conectado a Firestore'
                },
                error: {
                    className: 'flex items-center gap-1 text-red-600 font-semibold',
                    content: '<i class="fa-solid fa-triangle-exclamation"></i> Sin conexión con Firestore'
                }
            };

            const state = states[status];
            if (!state) return;
            statusElement.className = state.className;
            statusElement.innerHTML = state.content;
        }

        // --- SINCRONIZACIÓN FIREBASE EN TIEMPO REAL ---
        onSnapshot(collection(db, "products"), (snapshot) => {
            products.forEach(product => { product.price = null; });
            snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                const localProduct = products.find(p => p.id.toString() === docSnap.id);
                if (localProduct) {
                    localProduct.price = parsePriceNumber(data.price);
                    if (data.ordersCount !== undefined) localProduct.ordersCount = data.ordersCount;
                }
            });

            renderProducts();
            updateCartUI();
            setFirestoreStatus('connected');
            
            if (!document.getElementById('admin-modal').classList.contains('hidden')) {
                renderAdminProducts();
                renderStatsRanking();
            }
        }, (error) => {
            console.error('Error al sincronizar productos con Firestore:', error);
            setFirestoreStatus('error');
            showToast('No pudimos actualizar los productos. Revisá tu conexión e intentá nuevamente.');
        });

        // --- CARRITO DE COMPRAS ---
        let cartReturnFocus = null;
        let adminReturnFocus = null;

        function updateBodyScroll() {
            const cartOpen = !document.getElementById('cart-drawer').classList.contains('hidden');
            const adminOpen = !document.getElementById('admin-modal').classList.contains('hidden');
            document.body.classList.toggle('overflow-hidden', cartOpen || adminOpen);
        }

        window.toggleCart = function(forceOpen) {
            const drawer = document.getElementById('cart-drawer');
            const openButton = document.getElementById('cart-open-btn');
            const shouldOpen = typeof forceOpen === 'boolean'
                ? forceOpen
                : drawer.classList.contains('hidden');

            drawer.classList.toggle('hidden', !shouldOpen);
            drawer.setAttribute('aria-hidden', String(!shouldOpen));
            openButton.setAttribute('aria-expanded', String(shouldOpen));
            updateBodyScroll();

            if (shouldOpen) {
                cartReturnFocus = document.activeElement;
                requestAnimationFrame(() => document.getElementById('cart-close-btn').focus());
            } else if (cartReturnFocus instanceof HTMLElement) {
                cartReturnFocus.focus();
                cartReturnFocus = null;
            }
        };

        window.addToCart = function(productId) {
            const product = products.find(p => p.id === productId);
            if (!product || !hasValidPrice(product.price)) {
                showToast('Este producto todavía no tiene un precio válido.');
                return;
            }

            const existingItem = cart.find(item => item.id === productId);
            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                cart.push({ id: product.id, quantity: 1 });
            }

            persistCart();
            updateCartUI();
            showToast(`¡${product.name} agregado al carrito!`);
        };

        window.updateCartQuantity = function(productId, delta) {
            const item = cart.find(i => i.id === productId);
            if (!item) return;

            item.quantity += delta;
            if (item.quantity <= 0) {
                cart = cart.filter(i => i.id !== productId);
            }
            persistCart();
            updateCartUI();
        };

        window.removeFromCart = function(productId) {
            cart = cart.filter(i => i.id !== productId);
            persistCart();
            updateCartUI();
        };

        function updateCartUI() {
            const itemsContainer = document.getElementById('cart-items');
            const badge = document.getElementById('cart-badge');
            const totalElement = document.getElementById('cart-total');
            const checkoutBtn = document.getElementById('checkout-btn');
            const detailedCart = getDetailedCart();

            const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

            // Badge del navbar
            if (totalItems > 0) {
                badge.innerText = totalItems;
                badge.classList.remove('scale-0');
            } else {
                badge.classList.add('scale-0');
            }

            // Renderizado items
            if (detailedCart.length === 0) {
                itemsContainer.innerHTML = `
                    <div class="text-center py-12 text-gray-400 flex flex-col items-center gap-3">
                        <i class="fa-solid fa-basket-shopping text-5xl text-gray-300"></i>
                        <p class="font-medium text-sm">Tu carrito está vacío</p>
                    </div>
                `;
                totalElement.innerText = '$0';
                checkoutBtn.disabled = true;
                return;
            }

            checkoutBtn.disabled = isCheckingOut || detailedCart.some(item => !hasValidPrice(item.price));
            let totalPrice = 0;
            itemsContainer.innerHTML = '';

            detailedCart.forEach(item => {
                const itemPriceNum = parsePriceNumber(item.price) ?? 0;
                const subtotal = itemPriceNum * item.quantity;
                totalPrice += subtotal;
                const itemPriceDisplay = hasValidPrice(item.price)
                    ? `$${formatPrice(item.price)}`
                    : `<a href="${priceInquiryUrl(item)}" target="_blank" rel="noopener noreferrer" class="underline">Consultar precio por WhatsApp</a>`;

                const itemRow = document.createElement('div');
                itemRow.className = 'bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between gap-3';
                itemRow.innerHTML = `
                    <div class="w-12 h-12 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                        <img src="tarjeta${item.id}.1.jpg" alt="${item.name}" onerror="this.src='https://placehold.co/100'" class="w-full h-full object-cover">
                    </div>
                    <div class="flex-grow min-w-0">
                        <h4 class="font-bold text-gray-800 text-xs truncate">${item.name}</h4>
                        <p class="text-[11px] text-brand-dark font-semibold">${itemPriceDisplay}</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                            <button onclick="updateCartQuantity(${item.id}, -1)" aria-label="Reducir cantidad de ${item.name}" class="px-2 py-1 text-gray-600 hover:bg-gray-200 text-xs font-bold">-</button>
                            <span class="px-2 text-xs font-bold text-gray-800">${item.quantity}</span>
                            <button onclick="updateCartQuantity(${item.id}, 1)" aria-label="Aumentar cantidad de ${item.name}" class="px-2 py-1 text-gray-600 hover:bg-gray-200 text-xs font-bold">+</button>
                        </div>
                        <button onclick="removeFromCart(${item.id})" aria-label="Eliminar ${item.name} del carrito" class="text-red-400 hover:text-red-600 p-1 text-xs" title="Eliminar">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                `;
                itemsContainer.appendChild(itemRow);
            });

            totalElement.innerText = detailedCart.some(item => !hasValidPrice(item.price))
                ? 'Consultar precio' : `$${formatPrice(totalPrice)}`;
        }

        window.checkoutOrder = async function() {
            if (isCheckingOut) return;

            const orderItems = getDetailedCart();
            if (orderItems.length === 0) return;
            if (orderItems.some(item => !hasValidPrice(item.price))) {
                showToast('Hay productos sin un precio válido en el carrito.');
                return;
            }

            // 1. Construir el mensaje antes de realizar cualquier operación asíncrona
            const phone = "5491165846235";
            let message = "Hola VitalCore! 👋 Quisiera realizar el siguiente pedido:\n\n";

            let grandTotal = 0;
            orderItems.forEach((item, index) => {
                const subtotal = parsePriceNumber(item.price) * item.quantity;
                grandTotal += subtotal;
                message += `${index + 1}. *${item.name}* (${item.brand})\n   Cantidad: ${item.quantity} x $${formatPrice(item.price)} = *$${formatPrice(subtotal)}*\n`;
            });

            message += `\n💰 *TOTAL ESTIMADO: $${formatPrice(grandTotal)}*\n\n¿Tienen stock disponible para coordinar la entrega?`;

            // 2. Abrir WhatsApp directamente desde el clic para evitar bloqueadores
            const checkoutBtn = document.getElementById('checkout-btn');
            const originalContent = checkoutBtn.innerHTML;
            const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

            isCheckingOut = true;
            checkoutBtn.disabled = true;
            checkoutBtn.setAttribute('aria-busy', 'true');
            checkoutBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-xl"></i> Abriendo WhatsApp...';

            let whatsappWindow = null;
            try {
                whatsappWindow = window.open(whatsappUrl, '_blank');
                if (whatsappWindow) whatsappWindow.opener = null;
            } catch (error) {
                console.error('No se pudo abrir WhatsApp:', error);
            }

            if (!whatsappWindow) {
                isCheckingOut = false;
                checkoutBtn.removeAttribute('aria-busy');
                checkoutBtn.innerHTML = originalContent;
                updateCartUI();
                showToast('No se pudo abrir WhatsApp. Habilitá las ventanas emergentes e intentá nuevamente.');
                return;
            }

            showToast('¡Pedido abierto en WhatsApp! Revisalo antes de enviarlo.');

            // 3. Registrar la intención de pedido una sola vez y en una escritura atómica
            try {
                const batch = writeBatch(db);
                orderItems.forEach(item => {
                    batch.set(doc(db, "products", item.id.toString()), {
                        ordersCount: increment(item.quantity)
                    }, { merge: true });
                });
                await batch.commit();
            } catch (error) {
                console.error("Error al registrar estadísticas:", error);
            } finally {
                isCheckingOut = false;
                checkoutBtn.removeAttribute('aria-busy');
                checkoutBtn.innerHTML = originalContent;
                updateCartUI();
            }
        };

        function showToast(msg) {
            const toast = document.getElementById('toast');
            document.getElementById('toast-text').innerText = msg;
            toast.style.opacity = '1';
            toast.classList.remove('opacity-0', 'pointer-events-none');
            setTimeout(() => {
                toast.classList.add('opacity-0', 'pointer-events-none');
            }, 3000);
        }

        // --- RENDERIZADO DE TARJETAS CARD FLIP 3D ---
        const grid = document.getElementById('product-grid');

        window.renderProducts = function() {
            grid.innerHTML = ''; 

            const { category, brand, productId } = document.body.dataset;
            const filtered = products.filter(p => (!category || p.category === category) && (!brand || p.brand === brand) && (!productId || p.id === Number(productId)));
            if (productId) {
                const product = filtered[0];
                const price = document.getElementById('detail-price');
                const action = document.getElementById('detail-action');
                if (product && price && action) {
                    price.textContent = hasValidPrice(product.price) ? '$' + formatPrice(product.price) : 'Consultar precio';
                    action.innerHTML = hasValidPrice(product.price)
                        ? '<button onclick="addToCart(' + product.id + ')" class="bg-brand-primary text-brand-dark font-bold px-6 py-3 rounded-lg">Agregar al carrito</button>'
                        : '<a href="' + priceInquiryUrl(product) + '" target="_blank" rel="noopener noreferrer" class="bg-brand-primary text-brand-dark font-bold px-6 py-3 rounded-lg inline-block">Consultar por WhatsApp</a>';
                }
                return;
            }

            if (filtered.length === 0) {
                 grid.innerHTML = `<p class="col-span-full text-center text-gray-500 py-10">No hay productos disponibles en esta categoría.</p>`;
                 return;
            }

            filtered.forEach((product, index) => {
                const cardContainer = document.createElement('div');
                cardContainer.className = 'card-container h-[460px] w-full';
                cardContainer.setAttribute('data-aos', 'fade-up');
                cardContainer.setAttribute('data-aos-delay', (index % 4) * 100);

                const image1 = `tarjeta${product.id}.1.jpg`;
                const image2 = `tarjeta${product.id}.2.jpg`;
                const fallbackImage = `https://placehold.co/600x600/f1f5f9/0f172a?text=${encodeURIComponent(product.name)}`;

                const validPrice = hasValidPrice(product.price);
                let priceDisplay = validPrice
                    ? `$${formatPrice(product.price)}` 
                    : '<span class="text-sm text-gray-400">Consultar precio</span>';

                cardContainer.innerHTML = `
                    <div class="card-inner hover-flip rounded-xl shadow-lg border border-gray-100 bg-white" id="card-inner-${product.id}">
                        
                        <!-- FRENTE DE LA TARJETA -->
                        <div class="card-front bg-white flex flex-col justify-between p-5" aria-hidden="false">
                            <div>
                                <div class="relative h-52 w-full bg-slate-50 rounded-lg overflow-hidden mb-3 flex items-center justify-center">
                                    <span class="absolute top-2 left-2 bg-brand-dark text-brand-primary text-[10px] font-bold px-2.5 py-1 rounded-full z-10 uppercase tracking-wide">
                                        ${product.brand}
                                    </span>
                                    <button type="button" onclick="flipCard(${product.id}, event)" aria-label="Ver dorso de ${product.name}" class="absolute top-2 right-2 bg-white/90 hover:bg-white text-brand-dark p-2 rounded-full shadow-md z-10 text-xs transition-transform transform hover:scale-110" title="Ver Dorso">
                                        <i class="fa-solid fa-rotate"></i>
                                    </button>
                                    <img src="${image1}" 
                                         alt="${product.name} - Frente" 
                                         loading="lazy" 
                                         width="300" 
                                         height="208" 
                                         class="w-full h-full object-contain p-2"
                                         onerror="this.onerror=null; this.src='${fallbackImage}';">
                                </div>
                                <div class="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-1"><a href="${categoryUrl(product.category)}" class="hover:underline">${product.category}</a></div>
                                <h3 class="text-base font-bold text-gray-800 mb-1 line-clamp-1"><a href="${productUrl(product)}" class="underline decoration-brand-primary underline-offset-4">${product.name}</a></h3>
                                <p class="text-gray-500 text-xs line-clamp-2">${product.description}</p>
                            </div>

                            <div class="flex items-center justify-between pt-3 border-t border-gray-100 mt-2">
                                <span class="text-xl font-display font-bold text-brand-dark">${priceDisplay}</span>
                                ${validPrice ? `<button onclick="addToCart(${product.id})"
                                        class="${validPrice ? 'bg-brand-primary hover:bg-brand-dark text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'} px-3.5 py-2 rounded-lg transition-colors text-xs font-bold uppercase flex items-center gap-1.5 shadow-sm">
                                    <i class="fa-solid fa-cart-plus text-sm"></i> Agregar
                                </button>` : `<a href="${priceInquiryUrl(product)}" target="_blank" rel="noopener noreferrer" aria-label="Consultar precio de ${product.name} por WhatsApp" class="bg-brand-primary hover:bg-brand-dark text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5"><i class="fa-brands fa-whatsapp"></i> WhatsApp</a>`}
                            </div>
                        </div>

                        <!-- DORSO DE LA TARJETA -->
                        <div class="card-back bg-slate-900 text-white flex flex-col justify-between p-5" aria-hidden="true" inert>
                            <div>
                                <div class="relative h-52 w-full bg-black/30 rounded-lg overflow-hidden mb-3 flex items-center justify-center">
                                    <span class="absolute top-2 left-2 bg-brand-primary text-brand-dark text-[10px] font-bold px-2.5 py-1 rounded-full z-10 uppercase tracking-wide">
                                        Información / Dorso
                                    </span>
                                    <button type="button" onclick="flipCard(${product.id}, event)" aria-label="Volver al frente de ${product.name}" class="absolute top-2 right-2 bg-white/20 hover:bg-white/40 text-white p-2 rounded-full shadow-md z-10 text-xs transition-transform transform hover:scale-110" title="Ver Frente">
                                        <i class="fa-solid fa-rotate"></i>
                                    </button>
                                    <img src="${image2}" 
                                         alt="${product.name} - Dorso" 
                                         loading="lazy" 
                                         width="300" 
                                         height="208" 
                                         class="w-full h-full object-contain p-2"
                                         onerror="this.onerror=null; this.src='${fallbackImage}';">
                                </div>
                                <h3 class="text-base font-bold text-brand-primary mb-1"><a href="${productUrl(product)}" class="underline decoration-brand-primary underline-offset-4">${product.name}</a></h3>
                                <p class="text-gray-300 text-xs line-clamp-3">${product.description}</p>
                            </div>

                            <div class="pt-3 border-t border-gray-700 mt-2 flex flex-col gap-2">
                                <div class="flex justify-between items-center">
                                    <span class="text-xs text-gray-400">Precio actual:</span>
                                    <span class="text-lg font-display font-bold text-brand-accent">${priceDisplay}</span>
                                </div>
                                ${validPrice ? `<button onclick="addToCart(${product.id})"
                                        class="${validPrice ? 'bg-brand-primary hover:bg-brand-accent text-brand-dark' : 'bg-gray-700 text-gray-500 cursor-not-allowed'} w-full py-2.5 rounded-lg font-bold text-xs uppercase tracking-wide transition-all flex items-center justify-center gap-2">
                                    <i class="fa-solid fa-cart-plus text-base"></i> Agregar al Carrito
                                </button>` : `<a href="${priceInquiryUrl(product)}" target="_blank" rel="noopener noreferrer" class="bg-brand-primary hover:bg-brand-accent text-brand-dark w-full py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-2"><i class="fa-brands fa-whatsapp"></i> Consultar por WhatsApp</a>`}
                            </div>
                        </div>

                    </div>
                `;
                grid.appendChild(cardContainer);
            });

            setTimeout(() => { AOS.refresh(); }, 100);
        };

        window.flipCard = function(id, event) {
            if (event) event.stopPropagation();
            const cardInner = document.getElementById(`card-inner-${id}`);
            if (cardInner) {
                const isFlipped = cardInner.classList.toggle('is-flipped');
                const front = cardInner.querySelector('.card-front');
                const back = cardInner.querySelector('.card-back');

                front.setAttribute('aria-hidden', String(isFlipped));
                back.setAttribute('aria-hidden', String(!isFlipped));
                front.toggleAttribute('inert', isFlipped);
                back.toggleAttribute('inert', !isFlipped);

                const targetButton = (isFlipped ? back : front).querySelector('button');
                requestAnimationFrame(() => targetButton?.focus());
            }
        };

        window.toggleMenu = function(forceOpen) {
            const menu = document.getElementById('mobile-menu');
            const icon = document.getElementById('menu-icon');
            const button = document.getElementById('menu-toggle-btn');
            const shouldOpen = typeof forceOpen === 'boolean'
                ? forceOpen
                : menu.classList.contains('menu-hidden');

            menu.setAttribute('aria-hidden', String(!shouldOpen));
            menu.toggleAttribute('inert', !shouldOpen);
            button.setAttribute('aria-expanded', String(shouldOpen));
            button.setAttribute('aria-label', shouldOpen ? 'Cerrar menú' : 'Abrir menú');

            if (shouldOpen) {
                menu.classList.remove('menu-hidden'); 
                menu.classList.add('menu-visible'); 
                icon.classList.remove('fa-bars'); 
                icon.classList.add('fa-xmark');
            } else {
                menu.classList.remove('menu-visible'); 
                menu.classList.add('menu-hidden'); 
                icon.classList.remove('fa-xmark'); 
                icon.classList.add('fa-bars');
            }
        };

        function trapFocus(container, event) {
            const focusable = [...container.querySelectorAll(
                'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )].filter(element => element.offsetParent !== null && !element.closest('[inert]'));

            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }

        document.addEventListener('keydown', (event) => {
            const adminModal = document.getElementById('admin-modal');
            const cartDrawer = document.getElementById('cart-drawer');
            const mobileMenu = document.getElementById('mobile-menu');
            const adminOpen = !adminModal.classList.contains('hidden');
            const cartOpen = !cartDrawer.classList.contains('hidden');
            const menuOpen = mobileMenu.classList.contains('menu-visible');

            if (event.key === 'Escape') {
                if (adminOpen) {
                    closeAdmin();
                } else if (cartOpen) {
                    toggleCart(false);
                } else if (menuOpen) {
                    toggleMenu(false);
                    document.getElementById('menu-toggle-btn').focus();
                }
                return;
            }

            if (event.key === 'Tab') {
                if (adminOpen) trapFocus(adminModal, event);
                else if (cartOpen) trapFocus(cartDrawer, event);
            }
        });

        // --- ADMINISTRACIÓN Y ESTADÍSTICAS ---
        window.openAdminModal = function() {
            const modal = document.getElementById('admin-modal');
            const login = document.getElementById('admin-login');
            const dashboard = document.getElementById('admin-dashboard');
            const input = document.getElementById('admin-password');
            const error = document.getElementById('login-error');
            adminReturnFocus = document.activeElement;
            modal.classList.remove('hidden');
            modal.setAttribute('aria-hidden', 'false');
            modal.setAttribute('aria-labelledby', 'admin-login-title');
            login.classList.remove('hidden'); 
            dashboard.classList.add('hidden');
            input.value = ''; 
            error.classList.add('hidden'); 
            updateBodyScroll();
            requestAnimationFrame(() => input.focus());
        };

        window.closeAdmin = function() {
            const modal = document.getElementById('admin-modal');
            modal.classList.add('hidden');
            modal.setAttribute('aria-hidden', 'true');
            updateBodyScroll();
            if (adminReturnFocus instanceof HTMLElement) adminReturnFocus.focus();
            adminReturnFocus = null;
        };
        window.handleEnter = function(e) { if (e.key === 'Enter') checkAdmin(); };

        window.checkAdmin = function() {
            const input = document.getElementById('admin-password');
            if (input.value === 'dario') {
                document.getElementById('admin-login').classList.add('hidden');
                document.getElementById('admin-dashboard').classList.remove('hidden');
                document.getElementById('admin-modal').setAttribute('aria-labelledby', 'admin-dashboard-title');
                switchAdminTab('prices');
                requestAnimationFrame(() => document.getElementById('tab-btn-prices').focus());
            } else {
                document.getElementById('login-error').classList.remove('hidden');
                input.classList.add('border-red-500');
            }
        };

        window.switchAdminTab = function(tab) {
            const pricesContent = document.getElementById('tab-content-prices');
            const statsContent = document.getElementById('tab-content-stats');
            const btnPrices = document.getElementById('tab-btn-prices');
            const btnStats = document.getElementById('tab-btn-stats');

            if (tab === 'prices') {
                pricesContent.classList.remove('hidden');
                statsContent.classList.add('hidden');
                btnPrices.className = "flex-1 py-3 px-4 font-bold text-sm text-brand-dark border-b-2 border-brand-primary bg-white flex items-center justify-center gap-2";
                btnStats.className = "flex-1 py-3 px-4 font-bold text-sm text-gray-500 hover:text-brand-dark flex items-center justify-center gap-2";
                btnPrices.setAttribute('aria-selected', 'true');
                btnStats.setAttribute('aria-selected', 'false');
                renderAdminProducts();
            } else {
                pricesContent.classList.add('hidden');
                statsContent.classList.remove('hidden');
                btnStats.className = "flex-1 py-3 px-4 font-bold text-sm text-brand-dark border-b-2 border-brand-primary bg-white flex items-center justify-center gap-2";
                btnPrices.className = "flex-1 py-3 px-4 font-bold text-sm text-gray-500 hover:text-brand-dark flex items-center justify-center gap-2";
                btnStats.setAttribute('aria-selected', 'true');
                btnPrices.setAttribute('aria-selected', 'false');
                renderStatsRanking();
            }
        };

        function renderAdminProducts() {
            const list = document.getElementById('tab-content-prices');
            list.innerHTML = '';
            products.forEach(p => {
                const item = document.createElement('div');
                item.className = 'bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col md:flex-row items-center gap-4';
                const priceValue = hasValidPrice(p.price) ? formatPrice(p.price) : '';
                item.innerHTML = `
                    <div class="w-12 h-12 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                        <img src="tarjeta${p.id}.1.jpg" alt="${p.name}" onerror="this.src='https://placehold.co/100'" class="w-full h-full object-cover">
                    </div>
                    <div class="flex-grow text-center md:text-left">
                        <h4 class="font-bold text-gray-800 text-sm">${p.name}</h4>
                        <p class="text-xs text-gray-500">${p.brand}</p>
                    </div>
                    <div class="flex items-center gap-2 w-full md:w-auto">
                        <span class="text-gray-500 font-bold">$</span>
                        <input type="text" inputmode="numeric" id="price-input-${p.id}" value="${priceValue}" placeholder="Sin precio" class="w-full md:w-28 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-brand-primary focus:outline-none font-bold text-gray-800">
                        <button onclick="savePrice(${p.id}, event)" aria-label="Guardar precio de ${p.name}" class="bg-brand-primary text-white px-4 py-2 rounded hover:bg-brand-dark transition-colors">
                            <i class="fa-solid fa-floppy-disk"></i>
                        </button>
                    </div>
                `;
                list.appendChild(item);
            });
        }

        function renderStatsRanking() {
            const list = document.getElementById('stats-ranking-list');
            list.innerHTML = '';

            // Ordenar productos por cantidad de pedidos descendente
            const sorted = [...products].sort((a, b) => (b.ordersCount || 0) - (a.ordersCount || 0));
            const maxOrders = sorted[0]?.ordersCount || 1;

            sorted.forEach((p, idx) => {
                const count = p.ordersCount || 0;
                const percentage = Math.round((count / (maxOrders || 1)) * 100);

                const item = document.createElement('div');
                item.className = 'bg-slate-50 p-4 rounded-xl border border-gray-200 flex flex-col gap-2';
                item.innerHTML = `
                    <div class="flex justify-between items-center">
                        <div class="flex items-center gap-3">
                            <span class="w-7 h-7 rounded-full ${idx === 0 ? 'bg-amber-400 text-amber-950 font-bold' : idx === 1 ? 'bg-gray-300 text-gray-800 font-bold' : idx === 2 ? 'bg-amber-700 text-white font-bold' : 'bg-gray-200 text-gray-600'} text-xs flex items-center justify-center font-display">
                                #${idx + 1}
                            </span>
                            <div>
                                <h4 class="font-bold text-gray-800 text-sm">${p.name}</h4>
                                <span class="text-xs text-gray-500 font-medium">${p.brand}</span>
                            </div>
                        </div>
                        <div class="text-right">
                            <span class="text-base font-bold text-brand-dark font-display">${count}</span>
                            <span class="text-xs text-gray-500 block">unidades solicitadas</span>
                        </div>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                        <div class="bg-gradient-to-r from-brand-primary to-brand-accent h-2.5 rounded-full transition-all duration-500" style="width: ${percentage}%"></div>
                    </div>
                `;
                list.appendChild(item);
            });
        }

        window.savePrice = async function(id, event) {
            const input = document.getElementById(`price-input-${id}`);
            const rawPrice = input.value.trim();
            const newPrice = rawPrice === '' ? null : parsePriceNumber(rawPrice);
            const btn = event ? event.currentTarget : null;

            if (rawPrice !== '' && newPrice === null) {
                input.classList.add('border-red-500', 'focus:ring-red-500');
                input.focus();
                alert('Ingresá un precio numérico mayor que cero. Ejemplo: 38000, 38.000 o 38.000,50. Dejá el campo vacío para mostrar Consultar precio.');
                return;
            }

            input.classList.remove('border-red-500', 'focus:ring-red-500');
            
            try {
                await setDoc(doc(db, "products", id.toString()), {
                    price: newPrice
                }, { merge: true });

                if (btn) {
                    const originalContent = btn.innerHTML;
                    btn.innerHTML = '<i class="fa-solid fa-check"></i>';
                    btn.classList.remove('bg-brand-primary'); 
                    btn.classList.add('bg-green-500');
                    setTimeout(() => {
                        btn.innerHTML = originalContent;
                        btn.classList.remove('bg-green-500'); 
                        btn.classList.add('bg-brand-primary');
                    }, 1500);
                }

            } catch (error) {
                console.error("Error al guardar precio:", error);
                alert("Error al guardar: " + error.message);
            }
        };

        document.addEventListener('DOMContentLoaded', () => {
             renderProducts();
             updateCartUI();
             AOS.init({ duration: 800, once: true, offset: 100, easing: 'ease-out-cubic' });
        });
