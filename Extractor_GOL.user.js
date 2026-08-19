// ==UserScript==
// @name         🤖 GOL Offers Extractor
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Extracts offers from GOL and exports to CSV
// @match        https://www.voegol.com.br/*
// @grant        none
// ==/UserScript==

function iniciarExtratorGOL() {
    const btnExtrair = document.createElement('button');
    btnExtrair.innerHTML = '📥 Extract GOL Offers';
    btnExtrair.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:999999;padding:15px 20px;background:#FF7A00;color:white;border:none;border-radius:8px;font-size:14px;font-weight:bold;cursor:pointer;box-shadow:0px 6px 16px rgba(0,0,0,0.4);font-family:sans-serif;transition:0.2s;';
    btnExtrair.onmouseover = () => btnExtrair.style.transform = 'scale(1.05)';
    btnExtrair.onmouseleave = () => btnExtrair.style.transform = 'scale(1)';
    document.body.appendChild(btnExtrair);

    btnExtrair.onclick = () => {
        const textoOriginal = btnExtrair.innerHTML;
        btnExtrair.innerHTML = '⏳ Extracting...';
        btnExtrair.disabled = true;

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
            btnExtrair.innerHTML = textoOriginal;
            btnExtrair.disabled = false;
            return;
        }

        const resultados = [];
        const codigosVistos = new Set();

        for (const card of cards) {
            const q = s => card.querySelector(s);
            
            const destinoEl = q('[data-test="destination-text"]');
            const origemEl = q('[data-test="origin-text"]');
            const tipoVooEl = q('[data-test="flight-type"]');
            
            let tipoVoo = tipoVooEl ? tipoVooEl.innerText.trim() : 'Flight';
            if (tipoVoo.toLowerCase() === 'ida e volta') tipoVoo = 'Round Trip';
            else if (tipoVoo.toLowerCase() === 'somente ida') tipoVoo = 'One Way';
            
            let titulo = '';
            if (destinoEl && origemEl) {
                titulo = `Flight to ${destinoEl.innerText.trim()} - (${tipoVoo}) from ${origemEl.innerText.trim()}`;
            } else if (destinoEl) {
                titulo = `Flight to ${destinoEl.innerText.trim()} - (${tipoVoo})`;
            } else {
                titulo = 'GOL Flight Offer';
            }
            
            const dateEl = q('[data-test="departing-text"]');
            const dataViagem = dateEl ? dateEl.innerText.trim() : '-';
            
            const priceEl = q('[data-test="price"]');
            let desconto = priceEl ? priceEl.innerText.split('*')[0].replace(/&nbsp;/g, ' ').trim() : '-';
            if (desconto && !desconto.includes('R$')) desconto = 'BRL ' + desconto;
            else desconto = desconto.replace('R$', 'BRL');
            
            const imgEl = q('img[data-test="destination-img"]');
            let img = imgEl ? imgEl.getAttribute('src') : '';

            let url = window.location.href;
            const condicoes = (card.innerText || '').replace(/\s+/g, ' ').trim();

            const chave = titulo + '_' + desconto;
            if (codigosVistos.has(chave)) continue;
            codigosVistos.add(chave);

            resultados.push({
                titulo: titulo,
                desconto: desconto,
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
                download: `offers_gol_${new Date().toISOString().slice(0, 10)}.csv`,
                style: 'display:none'
            });
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(a.href);
            alert(`✅ ${resultados.length} offers extracted from GOL!`);
        }

        btnExtrair.innerHTML = textoOriginal;
        btnExtrair.disabled = false;
    };
}

if (!window.__extrator_gol_iniciado) {
    window.__extrator_gol_iniciado = true;
    iniciarExtratorGOL();
}
