// ==UserScript==
// @name         🤖 LATAM Offers Extractor
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Extracts offers from LATAM and exports to CSV
// @match        https://www.latamairlines.com/*
// @grant        none
// ==/UserScript==

function initLATAMExtractor() {
    const btnExtract = document.createElement('button');
    btnExtract.innerHTML = '📥 Extract LATAM Offers';
    btnExtract.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:999999;padding:15px 20px;background:#E8114B;color:white;border:none;border-radius:8px;font-size:14px;font-weight:bold;cursor:pointer;box-shadow:0px 6px 16px rgba(0,0,0,0.4);font-family:sans-serif;transition:0.2s;';
    btnExtract.onmouseover = () => btnExtract.style.transform = 'scale(1.05)';
    btnExtract.onmouseleave = () => btnExtract.style.transform = 'scale(1)';
    document.body.appendChild(btnExtract);

    btnExtract.onclick = () => {
        const originalText = btnExtract.innerHTML;
        btnExtract.innerHTML = '⏳ Extracting...';
        btnExtract.disabled = true;

        const cards = Array.from(document.querySelectorAll('a[data-testid*="-id"]'));

        if (cards.length === 0) {
            alert('❌ No LATAM offers found on screen.');
            btnExtract.innerHTML = originalText;
            btnExtract.disabled = false;
            return;
        }

        const results = [];
        const seenCodes = new Set();

        for (const card of cards) {
            const q = s => card.querySelector(s);
            
            const rawId = card.getAttribute('data-testid') || '';
            const parts = rawId.replace(/-id$/, '').split('-');
            let destino = parts[0] ? parts[0].trim() : 'LATAM Offer';
            let cabine = parts[1] ? parts[1].trim() : '';
            
            let tipoViagem = 'Flight';
            if ((card.innerText || '').toLowerCase().includes('ida e volta')) tipoViagem = 'Round Trip';
            else if ((card.innerText || '').toLowerCase().includes('somente ida')) tipoViagem = 'One Way';
            
            let offerTitle = `Flight to ${destino} - (${tipoViagem}) ${cabine}`.trim();
            
            let dateEl = q('[id^="deal-card-from-date"]');
            const travelDate = dateEl ? dateEl.innerText.trim() : '-';
            
            let priceEl = q('strong');
            let discountVal = priceEl ? priceEl.innerText.replace(/&nbsp;/g, '').trim() : '';
            if (discountVal && !discountVal.includes('R$')) discountVal = 'BRL ' + discountVal;
            else discountVal = discountVal.replace('R$', 'BRL');
            
            const imgEl = q('img');
            let img = imgEl ? imgEl.getAttribute('src') : '';
            if (img && img.startsWith('/')) img = window.location.origin + img;

            let url = card.getAttribute('href') || window.location.href;
            if (url.startsWith('/')) url = window.location.origin + url;

            const conditions = (card.innerText || '').replace(/\s+/g, ' ').trim();

            const hashKey = offerTitle + '_' + discountVal;
            if (seenCodes.has(hashKey)) continue;
            seenCodes.add(hashKey);

            results.push({
                offerTitle: offerTitle,
                discountVal: discountVal || '-',
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
                download: `offers_latam_${new Date().toISOString().slice(0, 10)}.csv`,
                style: 'display:none'
            });
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(a.href);
            alert(`✅ ${results.length} offers extracted from LATAM!`);
        }

        btnExtract.innerHTML = originalText;
        btnExtract.disabled = false;
    };
}

if (!window.__latam_extractor_started) {
    window.__latam_extractor_started = true;
    initLATAMExtractor();
}
