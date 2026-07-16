import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { ThemeModeProvider } from '../../src/contexts/ThemeContext.jsx';
import { PRIVACY_CONTACT_EMAIL, PRIVACY_EFFECTIVE_DATE, privacySections } from '../../src/content/privacyPolicy.js';
import PrivacyPolicy, { linkify } from '../../src/pages/PrivacyPolicy.jsx';

// Header transitively imports the auth/supabase boundary (import.meta), which
// jest cannot transform, and is unrelated to what this page test verifies.
jest.mock('../../src/components/elements/Header.jsx', () => () => <div data-testid="header" />);

// services/api.js uses import.meta.env; stub the single function this page calls.
const mockFetchLastUpdated = jest.fn();
jest.mock('../../src/services/api.js', () => ({
    fetchLastUpdatedTimestamp: (...args) => mockFetchLastUpdated(...args),
}));

const LINK_COLOR = '#8b4513';

const renderLinkify = (text) => render(<div data-testid="wrap">{linkify(text, LINK_COLOR)}</div>);

describe('linkify', () => {
    test('turns an http(s) URL into an external link with safe rel/target', () => {
        const { getByTestId } = renderLinkify('See https://supabase.com/privacy for details');
        const anchors = getByTestId('wrap').querySelectorAll('a');
        expect(anchors).toHaveLength(1);
        const [link] = anchors;
        expect(link).toHaveAttribute('href', 'https://supabase.com/privacy');
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
        expect(link).toHaveAttribute('rel', expect.stringContaining('noreferrer'));
        // Surrounding plain text is preserved.
        expect(getByTestId('wrap')).toHaveTextContent('See https://supabase.com/privacy for details');
    });

    test('excludes trailing sentence punctuation from the URL', () => {
        const { getByTestId } = renderLinkify('Visit https://example.com/page. Done');
        const link = getByTestId('wrap').querySelector('a');
        expect(link).toHaveAttribute('href', 'https://example.com/page');
        // The period stays as text, not part of the link.
        expect(getByTestId('wrap')).toHaveTextContent('Visit https://example.com/page. Done');
    });

    test('renders multiple URLs in one string as separate links', () => {
        const { getByTestId } = renderLinkify('a https://x.com/a and https://y.com/b end');
        const anchors = getByTestId('wrap').querySelectorAll('a');
        expect(anchors).toHaveLength(2);
        expect(anchors[0]).toHaveAttribute('href', 'https://x.com/a');
        expect(anchors[1]).toHaveAttribute('href', 'https://y.com/b');
    });

    test('turns the configured contact email into a mailto link (no target)', () => {
        const { getByTestId } = renderLinkify(`Email us at ${PRIVACY_CONTACT_EMAIL} today`);
        const anchors = getByTestId('wrap').querySelectorAll('a');
        expect(anchors).toHaveLength(1);
        const [link] = anchors;
        expect(link).toHaveAttribute('href', `mailto:${PRIVACY_CONTACT_EMAIL}`);
        expect(link).not.toHaveAttribute('target');
    });

    test('leaves an email that is not the contact address as plain text', () => {
        const { getByTestId } = renderLinkify('write someone@other.com here');
        expect(getByTestId('wrap').querySelectorAll('a')).toHaveLength(0);
        expect(getByTestId('wrap')).toHaveTextContent('write someone@other.com here');
    });

    test('returns plain text unchanged when there is nothing to link', () => {
        const { getByTestId } = renderLinkify('Just some ordinary policy text.');
        expect(getByTestId('wrap').querySelectorAll('a')).toHaveLength(0);
        expect(getByTestId('wrap')).toHaveTextContent('Just some ordinary policy text.');
    });
});

describe('PrivacyPolicy page', () => {
    beforeEach(() => {
        mockFetchLastUpdated.mockResolvedValue(null);
    });

    const renderPage = () =>
        render(
            <ThemeProvider theme={createTheme()}>
                <ThemeModeProvider>
                    <PrivacyPolicy />
                </ThemeModeProvider>
            </ThemeProvider>
        );

    test('renders the page title and effective date', async () => {
        renderPage();
        expect(await screen.findByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeInTheDocument();
        expect(screen.getByText(`Effective date: ${PRIVACY_EFFECTIVE_DATE}`)).toBeInTheDocument();
    });

    test('renders every policy section heading as an h2', async () => {
        renderPage();
        await screen.findByRole('heading', { level: 1, name: 'Privacy Policy' });
        for (const section of privacySections) {
            expect(
                screen.getByRole('heading', { level: 2, name: section.heading })
            ).toBeInTheDocument();
        }
    });

    test('renders bulleted list items from ul sections', async () => {
        renderPage();
        await screen.findByRole('heading', { level: 1, name: 'Privacy Policy' });
        // At least one section uses a <ul>; ensure list items are emitted.
        const totalListItems = privacySections.reduce(
            (sum, s) => sum + s.body.filter((b) => b.type === 'ul').reduce((n, b) => n + b.items.length, 0),
            0
        );
        expect(totalListItems).toBeGreaterThan(0);
        expect(screen.getAllByRole('listitem').length).toBe(totalListItems);
    });

    test('linkifies the contact email inside rendered policy text', async () => {
        renderPage();
        await screen.findByRole('heading', { level: 1, name: 'Privacy Policy' });
        const mailto = document.querySelector(`a[href="mailto:${PRIVACY_CONTACT_EMAIL}"]`);
        expect(mailto).not.toBeNull();
    });

    test('renders external provider URLs as real links', async () => {
        renderPage();
        await screen.findByRole('heading', { level: 1, name: 'Privacy Policy' });
        const supabaseLink = document.querySelector('a[href="https://supabase.com/privacy"]');
        expect(supabaseLink).not.toBeNull();
        expect(supabaseLink).toHaveAttribute('target', '_blank');
    });

    test('syncs the document head for SEO/social crawlers', async () => {
        renderPage();
        await waitFor(() => expect(document.title).toBe('Privacy Policy | FAB Trades'));
        const canonical = document.head.querySelector('link[rel="canonical"]');
        expect(canonical).not.toBeNull();
        expect(canonical.getAttribute('href')).toBe(`${window.location.origin}/privacy`);
    });
});
