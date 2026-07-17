/**
 * Scrape set logo URLs from fabtcg.com digital-assets / marketing-assets pages.
 * Writes public/setLogos.json keyed by TCGplayer groupId.
 * Sets without a confidently matched logo are omitted (UI falls back to name).
 */
const fs = require('fs');
const path = require('path');

const UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const ROOT = path.join(__dirname, '..');
const GROUPS_PATH = path.join(ROOT, 'public', 'productgroups.json');
const OUT_PATH = path.join(ROOT, 'public', 'setLogos.json');
const MOBILE_OUT_PATH = path.join(
    ROOT,
    'mobile',
    'app',
    'assets',
    'setLogos.json'
);
const SCRAPE_PATH = path.join(__dirname, '_set-logos-scrape.json');

const slugify = (name = '') =>
    String(name)
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/&amp;/g, 'and')
        .replace(/&#\d+;/g, '-')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

/** Manual: TCGplayer set name slug -> fab page slug(s) or absolute path under fabtcg.com */
const PAGE_ALIASES = {
    'crucible-of-war': ['crucible-war'],
    'tales-of-aria': ['tales-aria'],
    'welcome-to-rathe': ['welcome-rathe'],
    'history-pack-vol-1': ['history-pack-1'],
    'round-the-table-tccxlss': ['round-the-table-tcc-x-lss'],
    'high-seas': ['high-seas-marketing-assets'],
    'armory-deck-jarl-vetreidi': ['armory-deck-origins-jarl-vetreidi'],
    'silver-age-chapter-1': ['silver-age'],
    'silver-age-chapter-2': ['silver-age'],
    'silver-age-chapter-3': ['/silver-age-chapter-3-marketing-assets/'],
    'omens-of-the-third-age': [
        '/resources/marketing-assets/omens-of-the-third-age-marketing-assets/'
    ],
    'armory-deck-zyggy': [
        '/resources/marketing-assets/armory-deck-zyggy-marketing-assets/'
    ],
    'armory-deck-origins-hala': ['/armory-deck-origins-hala-marketing-assets/'],
    'welcome-deck-ira': ['learn-to-play-event']
};

async function get(url) {
    const r = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: 'text/html,application/xml' },
        redirect: 'follow'
    });
    if (!r.ok) throw new Error(`${r.status} ${url}`);
    return { html: await r.text(), finalUrl: r.url };
}

function extractLogos(html) {
    const logos = [];
    const re = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let m;
    while ((m = re.exec(html))) {
        const href = m[1];
        const body = m[2];
        const text = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        const imgMatch = body.match(/src="([^"]+)"/);
        if (/logo/i.test(href) || /logo/i.test(text)) {
            logos.push({
                href: href.startsWith('http')
                    ? href
                    : `https://cdn.fabtcg.com${href}`,
                text: text.slice(0, 160),
                img: imgMatch?.[1] || null
            });
        }
    }
    return logos.filter(
        (l) =>
            /cdn\.fabtcg\.com/i.test(l.href) &&
            /logo/i.test(`${l.href} ${l.text}`) &&
            !/\.pdf$/i.test(l.href)
    );
}

function pickBestLogo(logos, { preferNameHint = '' } = {}) {
    if (!logos.length) return null;
    const hint = slugify(preferNameHint);
    // For "Armory Deck: Ira", the distinctive token is the hero name after the colon.
    const distinctive = preferNameHint.includes(':')
        ? slugify(preferNameHint.split(':').slice(1).join(':'))
        : '';

    const scored = logos.map((l) => {
        let score = 0;
        const h = `${l.href} ${l.text}`.toLowerCase();
        const file = (l.href.split('/').pop() || '').toLowerCase();
        const textSlug = slugify(l.text);

        // Prefer English / primary logos
        if (/\b(jp|japanese|fr|french|de|german|es|spanish|it|italian)\b/i.test(h))
            score -= 8;
        if (/_jp|jp_|-jp|\/jp_/i.test(file)) score -= 8;
        if (/\benglish\b/i.test(h)) score += 4;
        if (/horizontal/i.test(h)) score -= 2;
        if (/stroke/i.test(h)) score -= 3;
        if (
            /\b(black|white|gold)\b/i.test(h) &&
            /organised|organized|event|skirmish|calling|pro /i.test(h)
        ) {
            score -= 5;
        }

        // Full-res PNG preferred over resized WordPress derivatives
        if (/\.png$/i.test(l.href) && !/\d+x\d+\.png$/i.test(l.href)) score += 6;
        if (/\.svg$/i.test(l.href)) score += 4;
        if (/logo/i.test(file)) score += 3;

        // Prefer logos whose filename/text mentions the set
        if (hint) {
            const tokens = hint.split('-').filter((t) => t.length > 2);
            let hits = 0;
            for (const t of tokens) {
                if (file.includes(t) || textSlug.includes(t)) hits += 1;
            }
            score += hits * 2;
        }

        // Prefer set logos that mention the hero/product, but not bare "name" marks
        // (e.g. malice_name.png) when a fuller set logo exists.
        if (distinctive) {
            const dTokens = distinctive.split('-').filter((t) => t.length > 2);
            for (const t of dTokens) {
                if (file.includes(t) || textSlug.includes(t)) score += 6;
            }
        }
        if (/_name(?:[-_.]|$)/i.test(file) || /\bname logo\b/i.test(h)) score -= 6;

        // Generic shared product-line marks lose to set-specific logos
        if (
            /^armory[-_ ]?deck([-_ ]logo)?$/i.test(l.text.trim()) ||
            /armory_deck\.original/i.test(file) ||
            /armoury_deck_origins_logo/i.test(file)
        ) {
            score -= 10;
        }

        return { l, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0].l.href;
}

function pageUrlFromSlug(slugOrPath) {
    if (slugOrPath.startsWith('http')) return slugOrPath;
    if (slugOrPath.startsWith('/')) return `https://fabtcg.com${slugOrPath}`;
    return `https://fabtcg.com/digital-assets/${slugOrPath}/`;
}

(async () => {
    const groups = JSON.parse(fs.readFileSync(GROUPS_PATH, 'utf8')).results || [];

    const xml = await get('https://fabtcg.com/digital-assets-sitemap.xml');
    const sitemapSlugs = new Set(
        [...xml.html.matchAll(/<loc>([^<]+)<\/loc>/g)]
            .map((m) => m[1])
            .filter(
                (u) =>
                    u.includes('/digital-assets/') &&
                    !u.includes('/fr/') &&
                    !u.includes('/ja/')
            )
            .map((u) => u.replace(/.*\/digital-assets\//, '').replace(/\/$/, ''))
    );

    // Build candidate page URLs for each group
    const groupPageMap = new Map(); // groupId -> [urls]
    for (const g of groups) {
        const nameSlug = slugify(g.name);
        const aliases = PAGE_ALIASES[nameSlug] || [];
        const candidates = new Set();

        // Primary: digital-assets/{slug}/
        if (sitemapSlugs.has(nameSlug)) {
            candidates.add(pageUrlFromSlug(nameSlug));
        }
        for (const a of aliases) {
            if (a.startsWith('/') || a.startsWith('http')) {
                candidates.add(pageUrlFromSlug(a));
            } else if (sitemapSlugs.has(a)) {
                candidates.add(pageUrlFromSlug(a));
            }
        }

        // Also try common naming variants present in sitemap
        for (const s of sitemapSlugs) {
            if (
                s === nameSlug ||
                s === `${nameSlug}-marketing-assets` ||
                (nameSlug.length > 10 && s.startsWith(nameSlug))
            ) {
                candidates.add(pageUrlFromSlug(s));
            }
        }

        groupPageMap.set(String(g.groupId), {
            name: g.name,
            abbreviation: g.abbreviation || '',
            nameSlug,
            urls: [...candidates]
        });
    }

    // Also scrape central Product Set logos page into a name->url map
    const centralLogos = new Map();
    try {
        const { html } = await get('https://fabtcg.com/digital-assets/logos/');
        for (const l of extractLogos(html)) {
            const name = l.text
                .replace(/\s*logo.*$/i, '')
                .replace(/\s*\(horizontal\)\s*/i, '')
                .trim();
            const key = slugify(name);
            // Skip brand / OP logos
            if (
                !key ||
                /^(lss|fab|fabulous|armory-events|skirmish|calling|road|national|pro-|world|battle|play-anywhere|upf)/.test(
                    key
                )
            ) {
                continue;
            }
            // Prefer non-horizontal marks when the same set appears twice
            const prev = centralLogos.get(key);
            if (
                !prev ||
                (/horizontal/i.test(prev) && !/horizontal/i.test(l.href + l.text))
            ) {
                centralLogos.set(key, l.href);
            }
        }
        console.log(`Central logos page: ${centralLogos.size} product logos`);
    } catch (e) {
        console.warn('Failed to scrape central logos page:', e.message);
    }

    const pageCache = new Map(); // url -> { best, logos, title }
    async function scrapePage(url, nameHint) {
        if (pageCache.has(url)) return pageCache.get(url);
        try {
            const { html, finalUrl } = await get(url);
            // Detect soft-404
            if (/404:\s*Page Not Found/i.test(html) || /page not found/i.test(
                (html.match(/<title[^>]*>([^<]+)<\/title>/i) || [])[1] || ''
            )) {
                const miss = { best: null, logos: [], title: null, error: '404' };
                pageCache.set(url, miss);
                return miss;
            }
            const logos = extractLogos(html);
            const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
            const title = (titleMatch?.[1] || '')
                .replace(/&#\d+;/g, ' ')
                .replace(/&amp;/g, '&')
                .trim();
            const best = pickBestLogo(logos, { preferNameHint: nameHint || title });
            const result = { best, logos: logos.slice(0, 12), title, finalUrl };
            pageCache.set(url, result);
            process.stdout.write('.');
            return result;
        } catch (e) {
            const miss = { best: null, logos: [], title: null, error: String(e.message) };
            pageCache.set(url, miss);
            process.stdout.write('x');
            return miss;
        }
    }

    const byGroupId = {};
    const unmatched = [];
    const debug = [];

    for (const g of groups) {
        const meta = groupPageMap.get(String(g.groupId));
        let logoUrl = null;
        let source = null;

        // 1) Dedicated marketing / digital-assets pages first (most accurate set logo)
        for (const url of meta.urls) {
            const page = await scrapePage(url, g.name);
            if (page.best) {
                logoUrl = page.best;
                source = url;
                break;
            }
        }

        // 2) Central Product Set logos page
        if (!logoUrl) {
            const centralKey = slugify(g.name);
            if (centralLogos.has(centralKey)) {
                logoUrl = centralLogos.get(centralKey);
                source = 'central-logos';
            }
        }

        // 3) For Silver Age variants, reuse silver-age logo when dedicated page lacks one
        if (!logoUrl && /silver age/i.test(g.name) && sitemapSlugs.has('silver-age')) {
            const page = await scrapePage(pageUrlFromSlug('silver-age'), 'Silver Age');
            if (page.best) {
                logoUrl = page.best;
                source = 'silver-age-fallback';
            }
        }

        debug.push({
            groupId: g.groupId,
            name: g.name,
            urls: meta.urls,
            logoUrl,
            source
        });

        if (logoUrl) {
            byGroupId[String(g.groupId)] = {
                name: g.name,
                abbreviation: g.abbreviation || '',
                logoUrl
            };
        } else {
            unmatched.push({ groupId: g.groupId, name: g.name });
        }
        // Keep source only in the debug scrape file via `debug` below.
    }

    console.log('\n');

    const output = {
        source: 'https://fabtcg.com/resources/marketing-assets/',
        scrapedAt: new Date().toISOString(),
        logos: byGroupId
    };

    const json = JSON.stringify(output, null, 2);
    fs.writeFileSync(OUT_PATH, json);
    fs.mkdirSync(path.dirname(MOBILE_OUT_PATH), { recursive: true });
    fs.writeFileSync(MOBILE_OUT_PATH, json);
    fs.writeFileSync(
        SCRAPE_PATH,
        JSON.stringify({ pages: [...pageCache.entries()], debug, unmatched }, null, 2)
    );

    console.log(`Matched ${Object.keys(byGroupId).length}/${groups.length} sets`);
    console.log(`Wrote ${OUT_PATH}`);
    console.log(`Wrote ${MOBILE_OUT_PATH}`);
    console.log('Unmatched (will show set name in UI):');
    for (const u of unmatched) console.log(`  ${u.groupId} ${u.name}`);

    // Show unique logos
    const byUrl = {};
    for (const v of Object.values(byGroupId)) {
        byUrl[v.logoUrl] = byUrl[v.logoUrl] || [];
        byUrl[v.logoUrl].push(v.name);
    }
    console.log('\nShared logos (ok if intentional):');
    for (const [url, names] of Object.entries(byUrl)) {
        if (names.length > 1) {
            console.log(`  ${names.length}x ${url.split('/').pop()}`);
            names.forEach((n) => console.log(`     - ${n}`));
        }
    }
})().catch((e) => {
    console.error(e);
    process.exit(1);
});
