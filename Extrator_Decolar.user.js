// ==UserScript==
// @name         🤖 OTA Offers Extractor (Decolar)
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Extracts offers from Decolar and exports to CSV
// @match        https://www.decolar.com/*
// @grant        none
// ==/UserScript==

function iniciarExtratorDecolar() {
    const btnExtrair = document.createElement('button');
    btnExtrair.innerHTML = '📥 Extract Decolar Offers';
    btnExtrair.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:999999;padding:15px 20px;background:#4a2278;color:white;border:none;border-radius:8px;font-size:14px;font-weight:bold;cursor:pointer;box-shadow:0px 6px 16px rgba(0,0,0,0.4);font-family:sans-serif;transition:0.2s;';
    btnExtrair.onmouseover = () => btnExtrair.style.transform = 'scale(1.05)';
    btnExtrair.onmouseleave = () => btnExtrair.style.transform = 'scale(1)';
    document.body.appendChild(btnExtrair);

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

    btnExtrair.onclick = () => {
        const textoOriginal = btnExtrair.innerHTML;
        btnExtrair.innerHTML = '⏳ Extracting...';
        btnExtrair.disabled = true;

        const cards = Array.from(document.querySelectorAll('.offer-card, .offer-card-container, .eva-3-card, .cluster-container'));

        if (cards.length === 0) {
            alert('❌ No Decolar offers found on screen.');
            btnExtrair.innerHTML = textoOriginal;
            btnExtrair.disabled = false;
            return;
        }

        const mapUrls = new Map();
        try {
            const scriptsLd = document.querySelectorAll('script[type="application/ld+json"]');
            for (let script of scriptsLd) {
                const data = JSON.parse(script.innerHTML);
                if (data && data.itemListElement) {
                    for (let item of data.itemListElement) {
                        if (item.item && item.item.name && item.item.url) {
                            mapUrls.set(item.item.name.trim(), item.item.url);
                        }
                    }
                }
            }
        } catch(e) {}

        const resultados = [];
        const codigosVistos = new Set();

        for (const card of cards) {
            const q = s => card.querySelector(s);
            
            const titleEl = q('.offer-card-title, .title, .eva-3-h3, h3, .offer-card-title-text, [class*="title"]');
            let titulo = titleEl ? titleEl.innerText.trim() : '';
            if (!titulo && card.innerText) {
                const match = card.innerText.match(/([^\n]*Pacote para[^\n]*|[^\n]*Voo para[^\n]*|[^\n]*Hospedagem em[^\n]*|[^\n]*Ingressos para[^\n]*)/i);
                if (match) titulo = match[1].trim();
            }
            if (!titulo) titulo = 'Offer';
            
            let url = mapUrls.get(titulo);
            if (!url) {
                url = extractHiddenUrl(card) || window.location.href;
            }

            const condicoesEl = q('.offer-card-main-driver, .driver-text, .offer-card-content');
            const dataViagem = condicoesEl ? condicoesEl.innerText.replace(/\n/g, ' ').trim() : '-';
            
            // Busca pelo preço com tolerância
            let priceEl = q('.amount');
            if (!priceEl) priceEl = q('.price-amount, [class*="price"], .eva-3-p');
            
            let precoDesc = priceEl ? priceEl.innerText.replace(/&nbsp;/g, '').trim() : '';
            
            if (precoDesc.toLowerCase().includes('coment')) {
                precoDesc = ''; // Descarta se for o texto de comentários
            }

            const condicoes = (card.innerText || '').replace(/\s+/g, ' ').trim();

            if (!precoDesc || precoDesc === '-') {
                const matchRs = condicoes.match(/(?:R\$|BRL)\s*[\d.,]+/i);
                if (matchRs) {
                    precoDesc = matchRs[0];
                }
            }
            
            if (!precoDesc) continue; // Pula os cards que realmente não têm preço (FAQ)
            
            if (precoDesc && !precoDesc.includes('R$') && !precoDesc.includes('BRL')) precoDesc = 'BRL ' + precoDesc;
            else precoDesc = precoDesc.replace('R$', 'BRL');
            
            // Busca ampla pelo preço antigo (tachado)
            const oldPriceEl = q('s, del, strike, [class*="strike"], [class*="old-price"], .eva-3-p.-strike, [style*="line-through"]');
            let precoAntigo = oldPriceEl ? oldPriceEl.innerText.replace(/&nbsp;/g, '').trim() : '-';
            
            if (precoAntigo !== '-') {
                // Força extrair apenas os números se houver lixo em volta
                const numMatch = precoAntigo.match(/[\d.,]+/);
                if (numMatch) precoAntigo = 'BRL ' + numMatch[0];
                else precoAntigo = '-';
            }

            const imgEl = q('img');
            let img = imgEl ? (imgEl.getAttribute('data-src') || imgEl.getAttribute('src') || '') : '';
            if (img && img.startsWith('//')) img = 'https:' + img;
            
            let tipoAcao = 'Travel Offer';
            const textLower = condicoes.toLowerCase() + ' ' + titulo.toLowerCase();
            if (textLower.includes('pacote') || textLower.includes('hotel + aéreo')) tipoAcao = 'Travel Package';
            else if (textLower.includes('voo para') || textLower.includes('voo a ')) tipoAcao = 'Flight Ticket';
            else if (textLower.includes('hospedagem') || textLower.includes('noite')) tipoAcao = 'Hotel';
            else if (textLower.includes('ingresso')) tipoAcao = 'Tickets';

            const chave = titulo + '_' + precoDesc;
            if (codigosVistos.has(chave)) continue;
            codigosVistos.add(chave);

            resultados.push({
                titulo: titulo,
                desconto: precoDesc || '-',
                compraMinima: precoAntigo,
                limite: '-',
                validade: dataViagem,
                codigo: '',
                tipoAcao: tipoAcao,
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
                download: `offers_decolar_${new Date().toISOString().slice(0, 10)}.csv`,
                style: 'display:none'
            });
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(a.href);
            alert(`✅ ${resultados.length} offers extracted from Decolar!`);
        }

        btnExtrair.innerHTML = textoOriginal;
        btnExtrair.disabled = false;
    };
}

if (!window.__extrator_decolar_iniciado) {
    window.__extrator_decolar_iniciado = true;
    iniciarExtratorDecolar();
}
