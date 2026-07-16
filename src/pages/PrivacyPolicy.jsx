import { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Paper,
    Typography,
    Link as MuiLink
} from '@mui/material';
import Header from '../components/elements/Header.jsx';
import { useThemeMode } from '../contexts/ThemeContext.jsx';
import { fetchLastUpdatedTimestamp } from '../services/api.js';
import { useDocumentHead } from '../utils/seo.js';
import {
    privacySections,
    PRIVACY_EFFECTIVE_DATE,
    PRIVACY_CONTACT_EMAIL
} from '../content/privacyPolicy.js';

// Renders URLs and the contact email inside policy text as real links.
// Exported for unit testing of the parsing/link-building edge cases.
// eslint-disable-next-line react-refresh/only-export-components
export const linkify = (text, linkColor) => {
    const pattern = /(https?:\/\/[^\s.,)]+(?:\.[^\s.,)]+)*|[\w.+-]+@[\w-]+\.[\w.]+)/g;
    const parts = text.split(pattern);
    return parts.map((part, i) => {
        if (/^https?:\/\//.test(part)) {
            return (
                <MuiLink key={i} href={part} target="_blank" rel="noopener noreferrer" sx={{ color: linkColor }}>
                    {part}
                </MuiLink>
            );
        }
        if (part === PRIVACY_CONTACT_EMAIL) {
            return (
                <MuiLink key={i} href={`mailto:${part}`} sx={{ color: linkColor }}>
                    {part}
                </MuiLink>
            );
        }
        return part;
    });
};

const PrivacyPolicy = () => {
    const { isDark } = useThemeMode();
    const [lastUpdatedTimestamp, setLastUpdatedTimestamp] = useState(null);

    useDocumentHead({
        title: 'Privacy Policy',
        description:
            'Privacy policy for FAB Trades: what information the fabtrades.net ' +
            'website and the FAB Trades mobile app collect, how it is used, and ' +
            'your rights.',
        canonicalPath: '/privacy'
    });

    useEffect(() => {
        fetchLastUpdatedTimestamp().then(setLastUpdatedTimestamp);
    }, []);

    const bgGradient = isDark
        ? 'linear-gradient(135deg, #0d0806 0%, #1a0f0a 50%, #2c1810 100%)'
        : 'linear-gradient(135deg, #f5f1ed 0%, #e8dfd6 50%, #f0e6dc 100%)';
    const textColor = isDark ? '#f5f1ed' : '#2c1810';
    const mutedColor = isDark ? '#d4a574' : '#5d3a1a';
    const linkColor = isDark ? '#e4c09c' : '#8b4513';

    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh',
            background: bgGradient,
            backgroundAttachment: 'fixed'
        }}>
            <Header lastUpdatedTimestamp={lastUpdatedTimestamp} />

            <Container maxWidth="md" sx={{ py: { xs: 2, md: 4 } }}>
                <Box sx={{ mb: 3 }}>
                    <Typography
                        variant="h4"
                        component="h1"
                        sx={{
                            fontWeight: 700,
                            color: textColor,
                            mb: 0.5,
                            fontSize: { xs: '1.5rem', md: '2rem' }
                        }}
                    >
                        Privacy Policy
                    </Typography>
                    <Typography variant="body2" sx={{ color: mutedColor }}>
                        Effective date: {PRIVACY_EFFECTIVE_DATE}
                    </Typography>
                </Box>

                <Paper
                    elevation={0}
                    sx={{
                        backgroundColor: isDark ? 'rgba(44, 24, 16, 0.6)' : '#ffffff',
                        border: `1px solid ${isDark ? 'rgba(212, 165, 116, 0.2)' : 'rgba(139, 69, 19, 0.15)'}`,
                        borderRadius: 2,
                        p: { xs: 2.5, md: 4 }
                    }}
                >
                    {privacySections.map((section) => (
                        <Box key={section.heading} sx={{ mb: 3.5, '&:last-child': { mb: 0 } }}>
                            <Typography
                                variant="h6"
                                component="h2"
                                sx={{ color: textColor, fontWeight: 700, mb: 1 }}
                            >
                                {section.heading}
                            </Typography>
                            {section.body.map((item, idx) =>
                                item.type === 'ul' ? (
                                    <Box component="ul" key={idx} sx={{ pl: 3, my: 1 }}>
                                        {item.items.map((li, liIdx) => (
                                            <Typography
                                                component="li"
                                                variant="body2"
                                                key={liIdx}
                                                sx={{ color: textColor, mb: 1, lineHeight: 1.7 }}
                                            >
                                                {linkify(li, linkColor)}
                                            </Typography>
                                        ))}
                                    </Box>
                                ) : (
                                    <Typography
                                        variant="body2"
                                        key={idx}
                                        sx={{ color: textColor, mb: 1.5, lineHeight: 1.7 }}
                                    >
                                        {linkify(item.text, linkColor)}
                                    </Typography>
                                )
                            )}
                        </Box>
                    ))}
                </Paper>
            </Container>
        </Box>
    );
};

export default PrivacyPolicy;
