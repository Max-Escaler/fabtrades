/**
 * Discord trade-post composer for the purple FaB trading Discord.
 * Produces plain text that matches community WTT conventions.
 */

const ART_VARIANT_RULES = [
    { test: /extended\s*art/i, abbr: 'EA' },
    { test: /alternate\s*art|alt\s*art/i, abbr: 'AA' },
    { test: /full\s*art/i, abbr: 'FA' },
    { test: /marvel/i, abbr: 'Marvel' },
    { test: /fabled/i, abbr: 'Fabled' },
    { test: /promo/i, abbr: 'Promo' },
    { test: /nexus\s*night/i, abbr: 'NN' },
    { test: /jpn\s*exclusive/i, abbr: 'JPN' },
    { test: /cc\s*tag/i, abbr: 'CC' },
];

/** Set codes like MST001, DYN234, WTR001 — not pitch colors or art variants. */
const SET_CODE_RE = /^[A-Z]{1,5}\d{1,4}[A-Za-z]?$/;

/**
 * Map foil subtype to Discord shorthand (CF / RF / NF / …).
 * @param {string} [subTypeName]
 * @returns {string|null}
 */
export const foilAbbrev = (subTypeName) => {
    const type = (subTypeName || '').toLowerCase().trim();
    if (!type || type.includes('normal')) return 'NF';
    if (type.includes('cold foil')) return 'CF';
    if (type.includes('rainbow foil')) return 'RF';
    if (type.includes('gold foil')) return 'GF';
    if (type.includes('foil') || type.includes('holo')) return 'Foil';
    return null;
};

/**
 * Split a catalog display name into base name + art-variant abbrev.
 * Strips trailing set codes; keeps pitch colors like (Red).
 * @param {string} [rawName]
 * @returns {{ baseName: string, artAbbrev: string|null }}
 */
export const parseDiscordCardName = (rawName = '') => {
    let name = String(rawName || '').trim();
    let artAbbrev = null;

    // Peel trailing parentheticals from the end so we can classify each.
    // e.g. "Fleeing Starbreeze (Extended Art) (MST040)" or "Bolt (Red)"
    while (true) {
        const match = name.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
        if (!match) break;

        const inner = match[2].trim();
        const base = match[1].trim();

        if (SET_CODE_RE.test(inner)) {
            name = base;
            continue;
        }

        const rule = ART_VARIANT_RULES.find((r) => r.test.test(inner));
        if (rule) {
            artAbbrev = artAbbrev || rule.abbr;
            name = base;
            continue;
        }

        // Pitch color or unknown tag — leave attached.
        break;
    }

    return { baseName: name, artAbbrev };
};

/**
 * Format a single card line: "2x CF EA Fleeing Starbreeze 40"
 * @param {{ name?: string, subTypeName?: string, price?: number, quantity?: number }} card
 * @returns {string}
 */
export const formatTradePostCardLine = (card) => {
    const qty = card.quantity || 1;
    const { baseName, artAbbrev } = parseDiscordCardName(card.name);
    const foil = foilAbbrev(card.subTypeName);
    const price = Math.round(Number(card.price) || 0);

    const parts = [];
    if (qty > 1) parts.push(`${qty}x`);
    if (foil) parts.push(foil);
    if (artAbbrev) parts.push(artAbbrev);
    parts.push(baseName);
    if (price > 0) parts.push(String(price));

    return parts.join(' ');
};

/**
 * Format a whole-dollar cash amount for Discord posts.
 * @param {number} amount
 * @returns {string}
 */
export const formatCashAmount = (amount) => {
    const rounded = Math.round(Math.abs(Number(amount) || 0));
    return `$${rounded}`;
};

/**
 * Build a pastable WTT Discord post from Have / Want lists.
 *
 * @param {object} options
 * @param {Array} options.haveList - Cards I have (offering)
 * @param {Array} options.wantList - Cards I want
 * @param {number} [options.haveTotal]
 * @param {number} [options.wantTotal]
 * @param {number} [options.diff] - haveTotal - wantTotal
 * @param {string|Date} [options.pricedAsOf] - ISO date or Date for credibility line
 * @param {string} [options.siteUrl='https://fabtrades.net']
 * @returns {string}
 */
export const generateTradePost = ({
    haveList = [],
    wantList = [],
    haveTotal,
    wantTotal,
    diff,
    pricedAsOf = new Date(),
    siteUrl = 'https://fabtrades.net',
} = {}) => {
    const have = Array.isArray(haveList) ? haveList : [];
    const want = Array.isArray(wantList) ? wantList : [];

    if (have.length === 0 && want.length === 0) {
        return '';
    }

    const resolvedHaveTotal =
        haveTotal != null ? Number(haveTotal) : have.reduce((s, c) => s + (c.price || 0) * (c.quantity || 1), 0);
    const resolvedWantTotal =
        wantTotal != null ? Number(wantTotal) : want.reduce((s, c) => s + (c.price || 0) * (c.quantity || 1), 0);
    const resolvedDiff =
        diff != null ? Number(diff) : resolvedHaveTotal - resolvedWantTotal;

    const lines = [];

    if (have.length > 0) {
        lines.push('**WTT My**');
        for (const card of have) {
            lines.push(formatTradePostCardLine(card));
        }
        // My side is light → I'm adding cash
        if (resolvedDiff < -0.5) {
            lines.push(`+ ${formatCashAmount(resolvedDiff)} cash`);
        }
        lines.push('');
    } else {
        lines.push('**Looking for**');
    }

    if (want.length > 0) {
        lines.push(have.length > 0 ? '**For your**' : '**Want**');
        for (const card of want) {
            lines.push(formatTradePostCardLine(card));
        }
        // Their side is light → asking for cash from them
        if (resolvedDiff > 0.5) {
            lines.push(`+ ${formatCashAmount(resolvedDiff)} cash`);
        }
    } else if (have.length > 0) {
        lines.push('**For your**');
        lines.push('offers / $$$');
    }

    const date = pricedAsOf instanceof Date ? pricedAsOf : new Date(pricedAsOf);
    const dateLabel = Number.isNaN(date.getTime())
        ? ''
        : date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

    lines.push('');
    if (dateLabel) {
        lines.push(`Priced via TCGPlayer, ${dateLabel}`);
    } else {
        lines.push('Priced via TCGPlayer');
    }
    lines.push(`Built with ${siteUrl.replace(/^https?:\/\//, '')}`);

    return lines.join('\n').trim() + '\n';
};
