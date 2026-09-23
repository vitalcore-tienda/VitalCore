/* Counts intent to contact, never messages, orders or completed sales. */
(() => {
    const KEY = 'vitalcore-pending-inquiries-v1';
    let pending = {};
    let flushing = false;
    try { pending = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { pending = {}; }
    if (!pending || typeof pending !== 'object' || Array.isArray(pending)) pending = {};
    for (const key of Object.keys(pending)) {
        if (!/^(site|1|2|3|4|6|7|8|9|10|11|12|13|14|15|20):(whatsappClicks|checkoutClicks)$/.test(key) || !Number.isInteger(pending[key]) || pending[key] < 1 || pending[key] > 1000) delete pending[key];
    }
    const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(pending)); } catch {} };
    async function flush() {
        if (flushing || typeof window.vitalcoreRecordInquiry !== 'function') return;
        flushing = true;
        try {
            while (Object.keys(pending).length) {
                for (const [key, count] of Object.entries(pending)) {
                    const [id, kind] = key.split(':');
                    await window.vitalcoreRecordInquiry(id, kind, count);
                    pending[key] -= count;
                    if (pending[key] <= 0) delete pending[key];
                    persist();
                }
            }
        } catch (error) {
            console.warn('Consulta pendiente de sincronizar:', error);
        } finally { flushing = false; }
    }
    window.vitalcoreTrackConsultation = ({productId = 'site', kind = 'whatsappClicks', source = 'contact'} = {}) => {
        const key = String(productId) + ':' + kind;
        if (!/^(site|1|2|3|4|6|7|8|9|10|11|12|13|14|15|20):(whatsappClicks|checkoutClicks)$/.test(key)) return;
        pending[key] = Math.min((pending[key] || 0) + 1, 1000);
        persist();
        // Optional analytics adapter; no Google script or identifier is loaded here.
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({event:'whatsapp_click', product_id:String(productId), source, page_path:location.pathname});
        flush();
    };
    document.addEventListener('click', event => {
        const anchor = event.target.closest?.('a[href]');
        if (!anchor || event.defaultPrevented) return;
        const url = new URL(anchor.href, location.href);
        if (url.hostname !== 'wa.me') return;
        window.vitalcoreTrackConsultation({productId:anchor.dataset.productId || 'site', source:anchor.dataset.consultationSource || 'contact'});
    });
    window.addEventListener('vitalcore:ready', flush);
    window.addEventListener('online', flush);
    window.vitalcorePendingInquiries = () => Object.values(pending).reduce((sum, count) => sum + count, 0);
})();
