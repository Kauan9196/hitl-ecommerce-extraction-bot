// ==UserScript==
// @name         🤖 LATAM Offers Extractor
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Extracts offers from LATAM and exports to CSV
// @match        https://www.latamairlines.com/*
// @grant        none
// ==/UserScript==

function iniciarExtratorLATAM() {
    const btnExtrair = document.createElement('button');
    btnExtrair.innerHTML = '📥 Extract LATAM Offers';
    btnExtrair.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:999999;padding:15px 20px;background:#E8114B;color:white;border:none;border-radius:8px;font-size:14px;font-weight:bold;cursor:pointer;box-shadow:0px 6px 16px rgba(0,0,0,0.4);font-family:sans-serif;transition:0.2s;';
    btnExtrair.onmouseover = () => btnExtrair.style.transform = 'scale(1.05)';
    btnExtrair.onmouseleave = () => btnExtrair.style.transform = 'scale(1)';
    document.body.appendChild(btnExtrair);

    btnExtrair.onclick = () => {
        const textoOriginal = btnExtrair.innerHTML;
        btnExtrair.innerHTML = '⏳ Extracting...';
        btnExtrair.disabled = true;

        const cards = Array.from(document.querySelectorAll('a[data-testid*="-id"]'));

        if (cards.length === 0) {
            alert('❌ No LATAM offers found on screen.');
            btnExtrair.innerHTML = textoOriginal;
            btnExtrair.disabled = false;
            return;
        }

        const resultados = [];
        const codigosVistos = new Set();

        for (const card of cards) {
            const q = s => card.querySelector(s);
            
            const rawId = card.getAttribute('data-testid') || '';
            const parts = rawId.replace(/-id$/, '').split('-');
            let destino = parts[0] ? parts[0].trim() : 'LATAM Offer';
            let cabine = parts[1] ? parts[1].trim() : '';
            
            let tipoViagem = 'Flight';
            if ((card.innerText || '').toLowerCase().includes('ida e volta')) tipoViagem = 'Round Trip';
            else if ((card.innerText || '').toLowerCase().includes('somente ida')) tipoViagem = 'One Way';
            
            let titulo = `Flight to ${destino} - (${tipoViagem}) ${cabine}`.trim();
            
            let dateEl = q('[id^="deal-card-from-date"]');
            const dataViagem = dateEl ? dateEl.innerText.trim() : '-';
            
            let priceEl = q('strong');
            let desconto = priceEl ? priceEl.innerText.replace(/&nbsp;/g, '').trim() : '';
            if (desconto && !desconto.includes('R$')) desconto = 'BRL ' + desconto;
            else desconto = desconto.replace('R$', 'BRL');
            
            const imgEl = q('img');
            let img = imgEl ? imgEl.getAttribute('src') : '';
            if (img && img.startsWith('/')) img = window.location.origin + img;

            let url = card.getAttribute('href') || window.location.href;
            if (url.startsWith('/')) url = window.location.origin + url;

            const condicoes = (card.innerText || '').replace(/\s+/g, ' ').trim();

            const chave = titulo + '_' + desconto;
            if (codigosVistos.has(chave)) continue;
            codigosVistos.add(chave);

            resultados.push({
                titulo: titulo,
                desconto: desconto || '-',
                compraMinima: '-',
                limite: '-',
                validade: dataViagem,
                codigo: '',
                tipoAcao: 'Flight Offer',
                url: url,
                img: img,
                textoFix: condicoes
            });
        }

        if (resultados.length === 0) {
            alert('⚠️ No data extracted.');
        } else {
            const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
            const cabecalho = ['#', 'Offer Title', 'Final Price / Savings', 'Old Price', 'Limit', 'Travel Date', 'Code', 'Action Type', 'URL', 'Image', 'Full Text'];
            
            const linhas = resultados.map((r, i) => [
                i + 1, r.titulo, r.desconto, r.compraMinima, r.limite,
                r.validade, r.codigo, r.tipoAcao, r.url, r.img, r.textoFix
            ].map(esc).join(','));
            
            const csv = [cabecalho.map(esc).join(','), ...linhas].join('\r\n');
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
            alert(`✅ ${resultados.length} offers extracted from LATAM!`);
        }

        btnExtrair.innerHTML = textoOriginal;
        btnExtrair.disabled = false;
    };
}

if (!window.__extrator_latam_iniciado) {
    window.__extrator_latam_iniciado = true;
    iniciarExtratorLATAM();
}
