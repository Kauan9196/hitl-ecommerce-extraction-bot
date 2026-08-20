// ==UserScript==
// @name         🤖 OTA Offers Extractor (Decolar)
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Extracts offers from Decolar and exports to CSV
// @match        https://www.decolar.com/*
// @grant        none
// ==/UserScript==

function initDecolarExtractor() {
    const btnExtract = document.createElement('button');
    btnExtract.innerHTML = '📥 Extract Decolar Offers';
    btnExtract.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:999999;padding:15px 20px;background:#4a2278;color:white;border:none;border-radius:8px;font-size:14px;font-weight:bold;cursor:pointer;box-shadow:0px 6px 16px rgba(0,0,0,0.4);font-family:sans-serif;transition:0.2s;';
    btnExtract.onmouseover = () => btnExtract.style.transform = 'scale(1.05)';
    btnExtract.onmouseleave = () => btnExtract.style.transform = 'scale(1)';
    document.body.appendChild(btnExtract);

    function extractHiddenUrl(el) {
        let a = el.querySelector('a') || el.closest('a');
        if (a && a.href) return a.href;

        let props = Object.keys(el).find(k => k.startsWith('__reactProps$') || k.startsWith('__ngContext__'));
        if (props && el[props]) {
            try {
                let str = JSON.stringify(el[props]);
                let match = str.match(/(https?:\/\/[^"]+)/);
                if (match) return match[1];
            } catch(e) {}
        }
        return '';
    }

    btnExtract.onclick = () => {
        const originalText = btnExtract.innerHTML;
        btnExtract.innerHTML = '⏳ Extracting...';
        btnExtract.disabled = true;

        const cards = Array.from(document.querySelectorAll('.offer-card, .offer-card-container, .eva-3-card, .cluster-container'));

        if (cards.length === 0) {
            alert('❌ No Decolar offers found on screen.');
            btnExtract.innerHTML = originalText;
            btnExtract.disabled = false;
            return;
        }

        const urlMap = new Map();
        try {
            const scriptsLd = document.querySelectorAll('script[type="application/ld+json"]');
            for (let script of scriptsLd) {
                const data = JSON.parse(script.innerHTML);
                if (data && data.itemListElement) {
                    for (let item of data.itemListElement) {
                        if (item.item && item.item.name && item.item.url) {
                            urlMap.set(item.item.name.trim(), item.item.url);
                        }
                    }
                }
            }
        } catch(e) {}

        const results = [];
        const seenCodes = new Set();

        for (const card of cards) {
            const q = s => card.querySelector(s);
            
            const titleEl = q('.offer-card-title, .title, .eva-3-h3, h3, .offer-card-title-text, [class*="title"]');
            let offerTitle = titleEl ? titleEl.innerText.trim() : '';
            if (!offerTitle && card.innerText) {
                const match = card.innerText.match(/([^\n]*Pacote para[^\n]*|[^\n]*Voo para[^\n]*|[^\n]*Hospedagem em[^\n]*|[^\n]*Ingressos para[^\n]*)/i);
                if (match) offerTitle = match[1].trim();
            }
            if (!offerTitle) offerTitle = 'Offer';
            
            let url = urlMap.get(offerTitle);
            if (!url) {
                url = extractHiddenUrl(card) || window.location.href;
            }

            const conditionsEl = q('.offer-card-main-driver, .driver-text, .offer-card-content');
            const travelDate = conditionsEl ? conditionsEl.innerText.replace(/\n/g, ' ').trim() : '-';
            
            // Busca pelo preço com tolerância
            let priceEl = q('.amount');
            if (!priceEl) priceEl = q('.price-amount, [class*="price"], .eva-3-p');
            
            let priceDesc = priceEl ? priceEl.innerText.replace(/&nbsp;/g, '').trim() : '';
            
            if (priceDesc.toLowerCase().includes('coment')) {
                priceDesc = ''; // Descarta se for o texto de comentários
            }

            const conditions = (card.innerText || '').replace(/\s+/g, ' ').trim();

            if (!priceDesc || priceDesc === '-') {
                const matchRs = conditions.match(/(?:R\$|BRL)\s*[\d.,]+/i);
                if (matchRs) {
                    priceDesc = matchRs[0];
                }
            }
            
            if (!priceDesc) continue; // Pula os cards que realmente não têm preço (FAQ)
            
            if (priceDesc && !priceDesc.includes('R$') && !priceDesc.includes('BRL')) priceDesc = 'BRL ' + priceDesc;
            else priceDesc = priceDesc.replace('R$', 'BRL');
            
            // Busca ampla pelo preço antigo (tachado)
            const oldPriceEl = q('s, del, strike, [class*="strike"], [class*="old-price"], .eva-3-p.-strike, [style*="line-through"]');
            let oldPrice = oldPriceEl ? oldPriceEl.innerText.replace(/&nbsp;/g, '').trim() : '-';
            
            if (oldPrice !== '-') {
                // Força extrair apenas os números se houver lixo em volta
                const numMatch = oldPrice.match(/[\d.,]+/);
                if (numMatch) oldPrice = 'BRL ' + numMatch[0];
                else oldPrice = '-';
            }

            const imgEl = q('img');
            let img = imgEl ? (imgEl.getAttribute('data-src') || imgEl.getAttribute('src') || '') : '';
            if (img && img.startsWith('//')) img = 'https:' + img;
            
            let actionType = 'Travel Offer';
            const textLower = conditions.toLowerCase() + ' ' + offerTitle.toLowerCase();
            if (textLower.includes('pacote') || textLower.includes('hotel + aéreo')) actionType = 'Travel Package';
            else if (textLower.includes('voo para') || textLower.includes('voo a ')) actionType = 'Flight Ticket';
            else if (textLower.includes('hospedagem') || textLower.includes('noite')) actionType = 'Hotel';
            else if (textLower.includes('ingresso')) actionType = 'Tickets';

            const hashKey = offerTitle + '_' + priceDesc;
            if (seenCodes.has(hashKey)) continue;
            seenCodes.add(hashKey);

            results.push({
                offerTitle: offerTitle,
                discountVal: priceDesc || '-',
                oldPriceVal: oldPrice,
                limitVal: '-',
                validity: travelDate,
                codigo: '',
                actionType: actionType,
                url: url,
                img: img,
                fullText: conditions
            });
        }

        if (results.length === 0) {
            alert('⚠️ No data extracted.');
        } else {
            const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
            const csvHeader = ['#', 'Offer Title', 'Final Price / Savings', 'Old Price', 'Limit', 'Travel Date', 'Code', 'Action Type', 'URL', 'Image', 'Full Text'];
            
            const csvRows = results.map((r, i) => [
                i + 1, r.offerTitle, r.discountVal, r.oldPriceVal, r.limitVal,
                r.validity, r.codigo, r.actionType, r.url, r.img, r.fullText
            ].map(esc).join(','));
            
            const csv = [csvHeader.map(esc).join(','), ...csvRows].join('\r\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const a = Object.assign(document.createElement('a'), {
                href: URL.createObjectURL(blob),
                download: `offers_decolar_${new Date().toISOString().slice(0, 10)}.csv`,
                style: 'display:none'
            });
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(a.href);
            alert(`✅ ${results.length} offers extracted from Decolar!`);
        }

        btnExtract.innerHTML = originalText;
        btnExtract.disabled = false;
    };
}

if (!window.__decolar_extractor_started) {
    window.__decolar_extractor_started = true;
    initDecolarExtractor();
}
