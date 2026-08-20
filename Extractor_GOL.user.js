// ==UserScript==
// @name         🤖 GOL Offers Extractor
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Extracts offers from GOL and exports to CSV
// @match        https://www.voegol.com.br/*
// @grant        none
// ==/UserScript==

function initGOLExtractor() {
    const btnExtract = document.createElement('button');
    btnExtract.innerHTML = '📥 Extract GOL Offers';
    btnExtract.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:999999;padding:15px 20px;background:#FF7A00;color:white;border:none;border-radius:8px;font-size:14px;font-weight:bold;cursor:pointer;box-shadow:0px 6px 16px rgba(0,0,0,0.4);font-family:sans-serif;transition:0.2s;';
    btnExtract.onmouseover = () => btnExtract.style.transform = 'scale(1.05)';
    btnExtract.onmouseleave = () => btnExtract.style.transform = 'scale(1)';
    document.body.appendChild(btnExtract);

    btnExtract.onclick = () => {
        const originalText = btnExtract.innerHTML;
        btnExtract.innerHTML = '⏳ Extracting...';
        btnExtract.disabled = true;

        const priceEls = Array.from(document.querySelectorAll('[data-test="price"]'));
        const rawCards = priceEls.map(p => {
            let card = p.parentElement;
            while(card && card !== document.body) {
                if (card.querySelector('[data-test="destination-text"]') && card.querySelector('img')) return card;
                card = card.parentElement;
            }
            return null;
        }).filter(Boolean);
        const cards = [...new Set(rawCards)];

        if (cards.length === 0) {
            alert('❌ No GOL offers found on screen.');
            btnExtract.innerHTML = originalText;
            btnExtract.disabled = false;
            return;
        }

        const results = [];
        const seenCodes = new Set();

        for (const card of cards) {
            const q = s => card.querySelector(s);
            
            const destinoEl = q('[data-test="destination-text"]');
            const origemEl = q('[data-test="origin-text"]');
            const tipoVooEl = q('[data-test="flight-type"]');
            
            let tipoVoo = tipoVooEl ? tipoVooEl.innerText.trim() : 'Flight';
            if (tipoVoo.toLowerCase() === 'ida e volta') tipoVoo = 'Round Trip';
            else if (tipoVoo.toLowerCase() === 'somente ida') tipoVoo = 'One Way';
            
            let offerTitle = '';
            if (destinoEl && origemEl) {
                offerTitle = `Flight to ${destinoEl.innerText.trim()} - (${tipoVoo}) from ${origemEl.innerText.trim()}`;
            } else if (destinoEl) {
                offerTitle = `Flight to ${destinoEl.innerText.trim()} - (${tipoVoo})`;
            } else {
                offerTitle = 'GOL Flight Offer';
            }
            
            const dateEl = q('[data-test="departing-text"]');
            const travelDate = dateEl ? dateEl.innerText.trim() : '-';
            
            const priceEl = q('[data-test="price"]');
            let discountVal = priceEl ? priceEl.innerText.split('*')[0].replace(/&nbsp;/g, ' ').trim() : '-';
            if (discountVal && !discountVal.includes('R$')) discountVal = 'BRL ' + discountVal;
            else discountVal = discountVal.replace('R$', 'BRL');
            
            const imgEl = q('img[data-test="destination-img"]');
            let img = imgEl ? imgEl.getAttribute('src') : '';

            let url = window.location.href;
            const conditions = (card.innerText || '').replace(/\s+/g, ' ').trim();

            const hashKey = offerTitle + '_' + discountVal;
            if (seenCodes.has(hashKey)) continue;
            seenCodes.add(hashKey);

            results.push({
                offerTitle: offerTitle,
                discountVal: discountVal,
                oldPriceVal: '-',
                limitVal: '-',
                validity: travelDate,
                codigo: '',
                actionType: 'Flight Offer',
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
                download: `offers_gol_${new Date().toISOString().slice(0, 10)}.csv`,
                style: 'display:none'
            });
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(a.href);
            alert(`✅ ${results.length} offers extracted from GOL!`);
        }

        btnExtract.innerHTML = originalText;
        btnExtract.disabled = false;
    };
}

if (!window.__gol_extractor_started) {
    window.__gol_extractor_started = true;
    initGOLExtractor();
}
