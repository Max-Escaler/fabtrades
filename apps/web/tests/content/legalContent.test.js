// Structural tests for the legal content documents (Privacy Policy + Terms of
// Use / EULA).
//
// These modules are plain data shared by two very different consumers:
//   1. The React pages (src/pages/PrivacyPolicy.jsx, src/pages/TermsOfUse.jsx),
//      which map over `section.body` and branch on `item.type === 'ul'`.
//   2. The build-time SEO prerenderer (scripts/generateSeoPages.js →
//      buildLegalPage), which does the same branch to emit static
//      /privacy/index.html and /terms/index.html.
//
// Both consumers assume an exact shape: every section has a string `heading`
// and an array `body`; every body item is either { type: 'ul', items: [...] }
// or { type: 'p', text }. A malformed entry (a `ul` with no `items`, a `p`
// with no `text`, an unknown `type`) either throws in the SEO build — which
// calls process.exit(1) and fails the deploy — or renders `undefined`/crashes
// on the page. Because App Store Connect and Google Play require these URLs to
// be reliably reachable, that is a meaningful regression to guard against here,
// in fast unit CI, rather than at deploy time.

import {
    privacySections,
    PRIVACY_EFFECTIVE_DATE,
    PRIVACY_CONTACT_EMAIL,
} from '../../src/content/privacyPolicy.js';
import {
    termsSections,
    TERMS_EFFECTIVE_DATE,
    TERMS_CONTACT_EMAIL,
} from '../../src/content/termsOfUse.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const documents = [
    {
        name: 'Privacy Policy',
        sections: privacySections,
        effectiveDate: PRIVACY_EFFECTIVE_DATE,
        contactEmail: PRIVACY_CONTACT_EMAIL,
    },
    {
        name: 'Terms of Use',
        sections: termsSections,
        effectiveDate: TERMS_EFFECTIVE_DATE,
        contactEmail: TERMS_CONTACT_EMAIL,
    },
];

describe.each(documents)('$name content', ({ sections, effectiveDate, contactEmail }) => {
    it('exposes a non-empty effective date string', () => {
        expect(typeof effectiveDate).toBe('string');
        expect(effectiveDate.trim().length).toBeGreaterThan(0);
    });

    it('exposes a valid contact email', () => {
        expect(contactEmail).toMatch(EMAIL_RE);
    });

    it('is a non-empty array of sections', () => {
        expect(Array.isArray(sections)).toBe(true);
        expect(sections.length).toBeGreaterThan(0);
    });

    it('has a unique heading per section (React uses it as the list key)', () => {
        const headings = sections.map((s) => s.heading);
        expect(new Set(headings).size).toBe(headings.length);
    });

    it('surfaces the contact email in a Contact Us paragraph so it can be linkified', () => {
        const paragraphs = sections
            .flatMap((s) => s.body)
            .filter((item) => item.type === 'p')
            .map((item) => item.text);
        expect(paragraphs.some((text) => text.includes(contactEmail))).toBe(true);
    });

    describe.each(sections.map((section, index) => ({ section, index })))(
        'section $index ($section.heading)',
        ({ section }) => {
            it('has a non-empty string heading', () => {
                expect(typeof section.heading).toBe('string');
                expect(section.heading.trim().length).toBeGreaterThan(0);
            });

            it('has a non-empty body array', () => {
                expect(Array.isArray(section.body)).toBe(true);
                expect(section.body.length).toBeGreaterThan(0);
            });

            it('only contains "p" or "ul" body items', () => {
                for (const item of section.body) {
                    expect(['p', 'ul']).toContain(item.type);
                }
            });

            it('gives every paragraph item a non-empty text string', () => {
                for (const item of section.body.filter((i) => i.type === 'p')) {
                    expect(typeof item.text).toBe('string');
                    expect(item.text.trim().length).toBeGreaterThan(0);
                }
            });

            it('gives every list item a non-empty array of non-empty strings', () => {
                for (const item of section.body.filter((i) => i.type === 'ul')) {
                    expect(Array.isArray(item.items)).toBe(true);
                    expect(item.items.length).toBeGreaterThan(0);
                    for (const li of item.items) {
                        expect(typeof li).toBe('string');
                        expect(li.trim().length).toBeGreaterThan(0);
                    }
                }
            });
        }
    );
});
