/**
 * Privacy policy content for FAB Trades (fabtrades.net + the FAB Trades
 * mobile app). Kept as plain data so the same text is rendered both by the
 * interactive React page (src/pages/PrivacyPolicy.jsx) and by the build-time
 * SEO prerenderer (scripts/generateSeoPages.js), which emits a static,
 * crawlable /privacy/index.html — Google Play requires the policy URL to be
 * publicly and reliably accessible.
 *
 * Body item types: { type: 'p', text } for a paragraph and
 * { type: 'ul', items: [...] } for a bulleted list.
 */

export const PRIVACY_EFFECTIVE_DATE = 'July 15, 2026';

export const PRIVACY_CONTACT_EMAIL = 'mxbloombusiness@gmail.com';

export const privacySections = [
    {
        heading: 'Overview',
        body: [
            {
                type: 'p',
                text:
                    'This Privacy Policy describes how FAB Trades ("we", "us", or "our") ' +
                    'collects, uses, and shares information when you use the fabtrades.net ' +
                    'website (the "Website") and the FAB Trades mobile application for ' +
                    'Android and iOS (the "App") — together, the "Services". FAB Trades is ' +
                    'a free, fan-made trade balancer and price guide for the Flesh and ' +
                    'Blood trading card game. We collect as little personal information as ' +
                    'possible to run the Services.'
            },
            {
                type: 'p',
                text:
                    'FAB Trades is not affiliated with, endorsed by, or sponsored by Legend ' +
                    'Story Studios or TCGplayer. Card names and images are the property of ' +
                    'their respective owners.'
            }
        ]
    },
    {
        heading: 'Information We Collect',
        body: [
            { type: 'p', text: 'On the Website (fabtrades.net):' },
            {
                type: 'ul',
                items: [
                    'Usage and analytics data. We use Google Analytics to understand how the Website is used. Google Analytics collects information such as the pages you visit, time spent on the site, approximate location (city/country level, derived from your IP address), browser and device type, and sets cookies to distinguish visitors. This data is aggregated and does not directly identify you.',
                    'Account information (optional). If you choose to sign in with Discord, we receive your Discord user ID, username, email address, and avatar from Discord through our authentication provider, Supabase. Signing in is entirely optional — all core features work without an account.',
                    'Saved trade data (optional). If you are signed in and save a trade, the trade contents (card names, quantities, prices, and totals) are stored in our database, linked to your account, so you can view them later in your trade history.',
                    'Local preferences. Settings such as light/dark theme and your current (unsaved) trade lists are stored locally in your browser (localStorage) and are not transmitted to us.'
                ]
            },
            { type: 'p', text: 'In the App:' },
            {
                type: 'ul',
                items: [
                    'Camera (card scanning). The App uses your device camera to identify physical cards you point it at. Camera frames are processed entirely on your device in real time — images are never stored, uploaded, or shared. Nothing leaves your device from the scanner. You can deny or revoke camera permission at any time; a manual search fallback is always available.',
                    'Locally stored app data. Your collection, want list, lend/borrow lists, trade drafts, trade history, and settings are stored only on your device. The App has no account system and does not upload this data to us.',
                    'Network requests. The App downloads the card catalog and current prices from our database provider (Supabase). Like any internet request, this transmits your IP address to the server, which is processed transiently to deliver the response. We do not use it to identify you.'
                ]
            },
            {
                type: 'p',
                text:
                    'We do not collect precise location, contacts, files, advertising ' +
                    'identifiers, or any special categories of personal data, and we do ' +
                    'not sell personal information.'
            }
        ]
    },
    {
        heading: 'How We Use Information',
        body: [
            {
                type: 'ul',
                items: [
                    'To provide the Services: fetching card prices, balancing trades, identifying scanned cards, and (if signed in on the Website) saving and displaying your trade history.',
                    'To understand aggregate usage of the Website (via Google Analytics) so we can improve features and performance.',
                    'To maintain the security and integrity of the Services.'
                ]
            },
            {
                type: 'p',
                text:
                    'We do not use your information for advertising, profiling, or ' +
                    'automated decision-making, and we never sell it to third parties.'
            }
        ]
    },
    {
        heading: 'Third-Party Services',
        body: [
            {
                type: 'p',
                text:
                    'The Services rely on the following third-party providers, each of ' +
                    'which processes data as described in its own privacy policy:'
            },
            {
                type: 'ul',
                items: [
                    'Google Analytics (Website only) — usage analytics. See Google\u2019s Privacy Policy at https://policies.google.com/privacy. You can opt out of Google Analytics with the browser add-on at https://tools.google.com/dlpage/gaoptout.',
                    'Supabase — database and authentication hosting (card catalog, prices, and, for signed-in Website users, accounts and saved trades). See https://supabase.com/privacy.',
                    'Discord (Website only, optional) — OAuth sign-in. See https://discord.com/privacy.',
                    'Netlify — Website hosting. Netlify may process standard server logs, including IP addresses, to serve and secure the site. See https://www.netlify.com/privacy/.',
                    'TCGplayer / card image CDNs — card images shown in the Services are loaded from third-party content delivery networks, which receive standard request data (such as your IP address) when images are fetched.'
                ]
            }
        ]
    },
    {
        heading: 'Cookies',
        body: [
            {
                type: 'p',
                text:
                    'The Website uses cookies set by Google Analytics (such as _ga) to ' +
                    'distinguish visitors, and localStorage to remember your preferences ' +
                    'and sign-in session. You can block or delete cookies in your browser ' +
                    'settings; the Website remains fully functional without them. The App ' +
                    'does not use cookies.'
            }
        ]
    },
    {
        heading: 'Data Retention and Deletion',
        body: [
            {
                type: 'ul',
                items: [
                    'Saved trades and account data (Website) are retained until you delete them. You can delete individual trades from the Trade History page at any time. To delete your account and all associated data, email us at the address below and we will remove it within 30 days.',
                    'App data lives only on your device. You can erase all of it by clearing the App\u2019s storage or uninstalling the App.',
                    'Google Analytics data is retained according to our analytics settings and then automatically deleted by Google.'
                ]
            }
        ]
    },
    {
        heading: 'Security',
        body: [
            {
                type: 'p',
                text:
                    'All data transmitted between your device and the Services is ' +
                    'encrypted in transit using HTTPS/TLS. Database access is restricted ' +
                    'with row-level security so that saved trades are only readable by ' +
                    'the account that created them. No method of transmission or storage ' +
                    'is 100% secure, but we take reasonable measures to protect your ' +
                    'information.'
            }
        ]
    },
    {
        heading: 'Children\u2019s Privacy',
        body: [
            {
                type: 'p',
                text:
                    'The Services are not directed at children under 13 (or the ' +
                    'equivalent minimum age in your jurisdiction), and we do not ' +
                    'knowingly collect personal information from children. If you ' +
                    'believe a child has provided us personal information, contact us ' +
                    'and we will delete it.'
            }
        ]
    },
    {
        heading: 'Your Rights',
        body: [
            {
                type: 'p',
                text:
                    'Depending on where you live (for example, under the GDPR in the ' +
                    'European Economic Area and the UK, or the CCPA/CPRA in California), ' +
                    'you may have the right to access, correct, export, or delete the ' +
                    'personal information we hold about you, to object to or restrict ' +
                    'certain processing, and to lodge a complaint with your local data ' +
                    'protection authority. To exercise any of these rights, email us at ' +
                    'the address below. We do not discriminate against you for ' +
                    'exercising your rights.'
            }
        ]
    },
    {
        heading: 'Changes to This Policy',
        body: [
            {
                type: 'p',
                text:
                    'We may update this Privacy Policy from time to time. Changes will ' +
                    'be posted on this page with an updated effective date. Material ' +
                    'changes will be highlighted on the Website. Continued use of the ' +
                    'Services after changes take effect constitutes acceptance of the ' +
                    'revised policy.'
            }
        ]
    },
    {
        heading: 'Contact Us',
        body: [
            {
                type: 'p',
                text:
                    'If you have questions about this Privacy Policy or want to ' +
                    'exercise your privacy rights, contact us at: ' +
                    PRIVACY_CONTACT_EMAIL
            }
        ]
    }
];
