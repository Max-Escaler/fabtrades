/**
 * Build-time SEO generator for FAB Trades.
 *
 * Vite outputs a single client-rendered index.html, which means every route
 * ships the same empty shell + generic <title>. Search engines therefore see
 * no unique content for the per-set price guides. This script runs AFTER
 * `vite build` and, using the same local data the app loads at runtime,
 * pre-renders a real, crawlable HTML document for:
 *
 *   - each set price guide      -> dist/sets/<slug>/index.html
 *   - the "browse sets" page    -> dist/sets/index.html
 *
 * Each generated page includes a unique <title>, meta description, canonical
 * URL, Open Graph/Twitter tags, JSON-LD structured data, and the full price
 * table as static HTML. The regular Vite bundle is still loaded, so the
 * interactive SPA takes over on the client (see #seo-prerender removal in
 * src/main.jsx).
 *
 * It also emits sitemap.xml and robots.txt.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildSetSlugMap } from '../src/utils/setSlug.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const PUBLIC = path.join(ROOT, 'public');

// Netlify exposes the primary site URL as `URL` during builds; allow an
// explicit override via SITE_URL. Trailing slash is stripped for consistency.
const SITE_URL = (
    process.env.SITE_URL ||
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    'https://fabtrades.netlify.app'
).replace(/\/+$/, '');

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const escapeHtml = (str = '') =>
    String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const escapeAttr = (str = '') => escapeHtml(str).replace(/\n/g, ' ');

const num = (v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
};

const formatMoney = (v) => {
    const n = num(v);
    return n > 0 ? `$${n.toFixed(2)}` : '—';
};

const formatDate = (iso) => {
    if (!iso) return 'Unknown';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return 'Unknown';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

// Mirror of isActualCard in useCardData/useSets so the generated set contents
// match exactly what the app shows.
const isActualCard = (row) => {
    const cardType = (row.extCardType || '').trim();
    const cardNumber = (row.extNumber || '').trim();
    const rarity = (row.extRarity || '').trim();
    const cardClass = (row.extClass || '').trim();
    if (cardType !== '') return true;
    if (cardNumber !== '' && (rarity !== '' || cardClass !== '')) return true;
    return false;
};

// Mirror of buildFabImageUrl in useCardData.
const FAB_CDN_BASE = 'https://d2wlb52bya4y8z.cloudfront.net/media/cards/large';
const getPrimaryExtNumber = (extNumber) => {
    if (!extNumber) return '';
    const cleaned = String(extNumber).split(/\s*\/\/\s*|\s*\/\s*/)[0];
    return cleaned ? cleaned.trim() : '';
};
const buildImageUrl = (row) => {
    const code = getPrimaryExtNumber(row.extNumber);
    if (code) {
        const sub = (row.subTypeName || '').toLowerCase();
        let suffix = '';
        if (sub.includes('cold foil')) suffix = '-CF';
        else if (sub.includes('rainbow foil')) suffix = '-RF';
        return `${FAB_CDN_BASE}/${code}${suffix}.webp`;
    }
    return row.imageUrl || '';
};

// ---------------------------------------------------------------------------
// Data loading + shaping (mirrors src/hooks/useSets.js)
// ---------------------------------------------------------------------------

const loadData = async () => {
    const groupsRaw = JSON.parse(await readFile(path.join(PUBLIC, 'productgroups.json'), 'utf8'));
    const consolidated = JSON.parse(
        await readFile(path.join(PUBLIC, 'price-guide', 'consolidated-data.json'), 'utf8')
    );
    const groups = Array.isArray(groupsRaw?.results) ? groupsRaw.results : [];
    const rows = Array.isArray(consolidated?.data) ? consolidated.data : [];
    return { groups, rows, metadata: consolidated?.metadata || {} };
};

const buildSets = ({ groups, rows }) => {
    const cardsByGroup = new Map();
    for (const row of rows) {
        if (!isActualCard(row)) continue;
        const key = String(row.groupId || '');
        if (!key) continue;
        if (!cardsByGroup.has(key)) cardsByGroup.set(key, []);
        cardsByGroup.get(key).push(row);
    }

    const eligible = groups
        .map((g) => {
            const key = String(g.groupId);
            const cards = cardsByGroup.get(key) || [];
            if (cards.length === 0) return null;
            let topMarketPrice = 0;
            for (const c of cards) {
                const mp = num(c.marketPrice);
                if (mp > topMarketPrice) topMarketPrice = mp;
            }
            return {
                groupId: g.groupId,
                name: g.name || `Set ${g.groupId}`,
                abbreviation: g.abbreviation || '',
                publishedOn: g.publishedOn || null,
                isSupplemental: !!g.isSupplemental,
                cards,
                cardCount: cards.length,
                topMarketPrice
            };
        })
        .filter(Boolean)
        .sort((a, b) => {
            const da = a.publishedOn ? new Date(a.publishedOn).getTime() : 0;
            const db = b.publishedOn ? new Date(b.publishedOn).getTime() : 0;
            return db - da;
        });

    const slugMap = buildSetSlugMap(eligible);
    for (const s of eligible) s.slug = slugMap.get(String(s.groupId)) || String(s.groupId);
    return eligible;
};

// ---------------------------------------------------------------------------
// HTML template plumbing
// ---------------------------------------------------------------------------

/**
 * Take the built dist/index.html shell and swap in page-specific <head> tags,
 * a JSON-LD block, and pre-rendered body content (inside #seo-prerender, which
 * the app removes after mount).
 */
const renderPage = (template, { title, description, canonicalPath, image, jsonLd, bodyHtml }) => {
    const canonical = `${SITE_URL}${canonicalPath}`;
    let html = template;

    html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`);
    html = html.replace(
        /(<meta name="description" content=")[^"]*(")/,
        `$1${escapeAttr(description)}$2`
    );
    html = html.replace(
        /(<meta property="og:title" content=")[^"]*(")/,
        `$1${escapeAttr(title)}$2`
    );
    html = html.replace(
        /(<meta property="og:description" content=")[^"]*(")/,
        `$1${escapeAttr(description)}$2`
    );
    html = html.replace(
        /(<meta name="twitter:title" content=")[^"]*(")/,
        `$1${escapeAttr(title)}$2`
    );
    html = html.replace(
        /(<meta name="twitter:description" content=")[^"]*(")/,
        `$1${escapeAttr(description)}$2`
    );

    // Extra head tags (canonical, og:url, image, structured data) injected
    // before </head>. Injected here (rather than in the source shell) so Vite
    // never tries to resolve the href as a build asset.
    const headExtras = [
        `<link rel="canonical" href="${escapeAttr(canonical)}" />`,
        `<meta property="og:url" content="${escapeAttr(canonical)}" />`,
        image ? `<meta property="og:image" content="${escapeAttr(image)}" />` : '',
        image ? `<meta name="twitter:image" content="${escapeAttr(image)}" />` : '',
        jsonLd
            ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`
            : ''
    ]
        .filter(Boolean)
        .join('\n    ');

    if (image) {
        html = html.replace(
            /(<meta name="twitter:card" content=")[^"]*(")/,
            `$1summary_large_image$2`
        );
    }

    html = html.replace('</head>', `    ${headExtras}\n  </head>`);

    // Inject the crawlable content immediately after the SPA mount node.
    html = html.replace(
        /(<div id="root">\s*<\/div>)/,
        `$1\n    <div id="seo-prerender">${bodyHtml}</div>`
    );

    return html;
};

const SEO_BLOCK_STYLE = `
<style>
  #seo-prerender{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:960px;margin:0 auto;padding:24px 16px;color:#2c1810;background:#f5f1ed}
  #seo-prerender a{color:#8b4513}
  #seo-prerender h1{font-size:1.6rem;margin:0 0 4px}
  #seo-prerender .meta{color:#5d3a1a;font-size:.9rem;margin-bottom:16px}
  #seo-prerender table{width:100%;border-collapse:collapse;font-size:.9rem}
  #seo-prerender th,#seo-prerender td{text-align:left;padding:6px 8px;border-bottom:1px solid #e0d3c4}
  #seo-prerender td.num{text-align:right;font-variant-numeric:tabular-nums}
  #seo-prerender img{width:36px;height:auto;vertical-align:middle}
</style>`;

// ---------------------------------------------------------------------------
// Page builders
// ---------------------------------------------------------------------------

const buildSetPage = (template, set) => {
    const sorted = [...set.cards].sort((a, b) => num(b.marketPrice) - num(a.marketPrice));
    const top = sorted[0];
    const topImage = top ? buildImageUrl(top) : '';
    const abbr = set.abbreviation ? ` (${set.abbreviation})` : '';
    const title = `${set.name}${abbr} Card Price Guide | FAB Trades`;
    const description =
        `Up-to-date TCGplayer market, low, and high prices for all ${set.cardCount} ` +
        `Flesh and Blood cards in ${set.name}${top ? `, including ${top.name}` : ''}. ` +
        `Sort by value and balance trades with FAB Trades.`;
    const canonicalPath = `/sets/${set.slug}`;

    const rows = sorted
        .map((c, i) => {
            const img = buildImageUrl(c);
            const nameCell = `${escapeHtml(c.name)}`;
            const printing = c.subTypeName && c.subTypeName.toLowerCase() !== 'normal'
                ? ` <em>(${escapeHtml(c.subTypeName)})</em>`
                : '';
            return `<tr>
        <td class="num">${i + 1}</td>
        <td>${img ? `<img loading="lazy" src="${escapeAttr(img)}" alt="${escapeAttr(`${c.name} - ${set.name}`)}" />` : ''}</td>
        <td>${nameCell}${printing}</td>
        <td>${escapeHtml(c.extNumber || '')}</td>
        <td>${escapeHtml(c.extRarity || '')}</td>
        <td class="num">${formatMoney(c.lowPrice)}</td>
        <td class="num">${formatMoney(c.marketPrice)}</td>
        <td class="num">${formatMoney(c.highPrice)}</td>
      </tr>`;
        })
        .join('\n');

    const bodyHtml = `${SEO_BLOCK_STYLE}
    <nav><a href="/sets">Flesh and Blood Sets</a> / ${escapeHtml(set.name)}</nav>
    <h1>${escapeHtml(set.name)}${escapeHtml(abbr)} Card Price Guide</h1>
    <p class="meta">${set.cardCount} printings · Released ${formatDate(set.publishedOn)} · Prices from TCGplayer</p>
    <table>
      <thead><tr><th>#</th><th></th><th>Card</th><th>No.</th><th>Rarity</th><th>Low</th><th>Market</th><th>High</th></tr></thead>
      <tbody>
${rows}
      </tbody>
    </table>`;

    const jsonLd = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'BreadcrumbList',
                itemListElement: [
                    { '@type': 'ListItem', position: 1, name: 'Sets', item: `${SITE_URL}/sets` },
                    { '@type': 'ListItem', position: 2, name: set.name, item: `${SITE_URL}${canonicalPath}` }
                ]
            },
            {
                '@type': 'ItemList',
                name: `${set.name} Card Price Guide`,
                numberOfItems: sorted.length,
                itemListElement: sorted.slice(0, 100).map((c, i) => ({
                    '@type': 'ListItem',
                    position: i + 1,
                    item: {
                        '@type': 'Product',
                        name: c.subTypeName && c.subTypeName.toLowerCase() !== 'normal'
                            ? `${c.name} (${c.subTypeName})`
                            : c.name,
                        image: buildImageUrl(c) || undefined,
                        category: 'Flesh and Blood TCG',
                        offers: num(c.marketPrice) > 0
                            ? {
                                '@type': 'Offer',
                                priceCurrency: 'USD',
                                price: num(c.marketPrice).toFixed(2),
                                availability: 'https://schema.org/InStock'
                            }
                            : undefined
                    }
                }))
            }
        ]
    };

    return renderPage(template, {
        title,
        description,
        canonicalPath,
        image: topImage,
        jsonLd,
        bodyHtml
    });
};

const buildSetsIndexPage = (template, sets) => {
    const title = 'Flesh and Blood Card Price Guides by Set | FAB Trades';
    const description =
        'Browse every Flesh and Blood TCG set and see up-to-date TCGplayer market ' +
        'prices for each card. Pick a set for its full price guide.';
    const canonicalPath = '/sets';

    const items = sets
        .map(
            (s) => `<tr>
        <td><a href="/sets/${escapeAttr(s.slug)}">${escapeHtml(s.name)}</a>${s.abbreviation ? ` <span class="meta">${escapeHtml(s.abbreviation)}</span>` : ''}</td>
        <td>${escapeHtml(formatDate(s.publishedOn))}</td>
        <td class="num">${s.cardCount}</td>
        <td class="num">${formatMoney(s.topMarketPrice)}</td>
      </tr>`
        )
        .join('\n');

    const bodyHtml = `${SEO_BLOCK_STYLE}
    <h1>Flesh and Blood Card Price Guides by Set</h1>
    <p class="meta">Up-to-date TCGplayer prices for every Flesh and Blood set.</p>
    <table>
      <thead><tr><th>Set</th><th>Released</th><th>Cards</th><th>Top price</th></tr></thead>
      <tbody>
${items}
      </tbody>
    </table>`;

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Flesh and Blood Card Price Guides by Set',
        url: `${SITE_URL}${canonicalPath}`,
        hasPart: sets.map((s) => ({
            '@type': 'WebPage',
            name: `${s.name} Card Price Guide`,
            url: `${SITE_URL}/sets/${s.slug}`
        }))
    };

    return renderPage(template, { title, description, canonicalPath, jsonLd, bodyHtml });
};

// ---------------------------------------------------------------------------
// Sitemap + robots
// ---------------------------------------------------------------------------

const buildSitemap = (sets, metadata) => {
    const lastmod = (metadata?.generatedAt || new Date().toISOString()).slice(0, 10);
    const urls = [
        { loc: `${SITE_URL}/`, priority: '1.0' },
        { loc: `${SITE_URL}/sets`, priority: '0.9' },
        ...sets.map((s) => ({ loc: `${SITE_URL}/sets/${s.slug}`, priority: '0.8' }))
    ];
    const body = urls
        .map(
            (u) =>
                `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
        )
        .join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
};

const buildRobots = () =>
    `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;

// Inject absolute canonical + og:url into the home page shell (kept out of the
// source index.html so Vite doesn't try to resolve the href as an asset).
const fixHomePage = async () => {
    const file = path.join(DIST, 'index.html');
    let html = await readFile(file, 'utf8');
    if (!/<link rel="canonical"/.test(html)) {
        html = html.replace(
            '</head>',
            `    <link rel="canonical" href="${SITE_URL}/" />\n    <meta property="og:url" content="${SITE_URL}/" />\n  </head>`
        );
    }
    await writeFile(file, html, 'utf8');
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const main = async () => {
    if (!existsSync(DIST)) {
        console.error('[seo] dist/ not found. Run `vite build` first.');
        process.exit(1);
    }

    const template = await readFile(path.join(DIST, 'index.html'), 'utf8');
    const data = await loadData();
    const sets = buildSets(data);

    console.log(`[seo] Using SITE_URL=${SITE_URL}`);
    console.log(`[seo] Generating pages for ${sets.length} sets...`);

    // Per-set price guide pages.
    for (const set of sets) {
        const dir = path.join(DIST, 'sets', set.slug);
        await mkdir(dir, { recursive: true });
        await writeFile(path.join(dir, 'index.html'), buildSetPage(template, set), 'utf8');
    }

    // Browse-sets landing page.
    await mkdir(path.join(DIST, 'sets'), { recursive: true });
    await writeFile(
        path.join(DIST, 'sets', 'index.html'),
        buildSetsIndexPage(template, sets),
        'utf8'
    );

    // Sitemap + robots.
    await writeFile(path.join(DIST, 'sitemap.xml'), buildSitemap(sets, data.metadata), 'utf8');
    await writeFile(path.join(DIST, 'robots.txt'), buildRobots(), 'utf8');

    await fixHomePage();

    console.log(
        `[seo] Done. ${sets.length} set pages + sets index, sitemap.xml, robots.txt written to dist/.`
    );
};

main().catch((err) => {
    console.error('[seo] Generation failed:', err);
    process.exit(1);
});
