import { useState } from 'react';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Container,
    Link as MuiLink,
    Paper,
    TextField,
    Typography
} from '@mui/material';
import Header from '../components/elements/Header.jsx';
import { useThemeMode } from '../contexts/ThemeContext.jsx';
import { useCardData } from '../hooks/useCardData.jsx';
import { useDocumentHead } from '../utils/seo.js';
import {
    SUPPORT_CONTACT_EMAIL,
    SUPPORT_FORM_NAME
} from '../content/support.js';

const encode = (data) =>
    Object.keys(data)
        .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(data[key] ?? '')}`)
        .join('&');

const Support = () => {
    const { isDark } = useThemeMode();
    const { pricesUpdatedAt: lastUpdatedTimestamp } = useCardData();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [botField, setBotField] = useState('');
    const [status, setStatus] = useState('idle'); // idle | submitting | success | error
    const [errorMessage, setErrorMessage] = useState('');

    useDocumentHead({
        title: 'Support',
        description:
            'Contact FAB Trades support. Send a message with your name, email, ' +
            'and issue description — we typically reply within a few business days.',
        canonicalPath: '/support'
    });

    const bgGradient = isDark
        ? 'linear-gradient(135deg, #0d0806 0%, #1a0f0a 50%, #2c1810 100%)'
        : 'linear-gradient(135deg, #f5f1ed 0%, #e8dfd6 50%, #f0e6dc 100%)';
    const textColor = isDark ? '#f5f1ed' : '#2c1810';
    const mutedColor = isDark ? '#d4a574' : '#5d3a1a';
    const linkColor = isDark ? '#e4c09c' : '#8b4513';
    const fieldSx = {
        '& .MuiOutlinedInput-root': {
            backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.9)',
            '& fieldset': {
                borderColor: isDark ? 'rgba(212, 165, 116, 0.35)' : 'rgba(139, 69, 19, 0.25)'
            },
            '&:hover fieldset': {
                borderColor: isDark ? 'rgba(212, 165, 116, 0.55)' : 'rgba(139, 69, 19, 0.4)'
            },
            '&.Mui-focused fieldset': {
                borderColor: linkColor
            }
        },
        '& .MuiInputLabel-root': { color: mutedColor },
        '& .MuiInputLabel-root.Mui-focused': { color: linkColor },
        '& .MuiOutlinedInput-input, & .MuiInputBase-inputMultiline': { color: textColor }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setStatus('submitting');
        setErrorMessage('');

        try {
            const response = await fetch('/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: encode({
                    'form-name': SUPPORT_FORM_NAME,
                    'bot-field': botField,
                    name: name.trim(),
                    email: email.trim(),
                    message: message.trim()
                })
            });

            if (!response.ok) {
                throw new Error(`Submission failed (${response.status})`);
            }

            setStatus('success');
            setName('');
            setEmail('');
            setMessage('');
        } catch (err) {
            setStatus('error');
            setErrorMessage(
                err?.message ||
                    'Something went wrong. Please try again or email us directly.'
            );
        }
    };

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                minHeight: '100vh',
                background: bgGradient,
                backgroundAttachment: 'fixed'
            }}
        >
            <Header lastUpdatedTimestamp={lastUpdatedTimestamp} />

            <Container maxWidth="sm" sx={{ py: { xs: 2, md: 4 }, pb: { xs: 8, md: 10 } }}>
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
                        Support
                    </Typography>
                    <Typography variant="body2" sx={{ color: mutedColor, lineHeight: 1.6 }}>
                        Tell us what&apos;s going on and we&apos;ll get back to you at the
                        email you provide. You can also reach us directly at{' '}
                        <MuiLink
                            href={`mailto:${SUPPORT_CONTACT_EMAIL}`}
                            sx={{ color: linkColor }}
                        >
                            {SUPPORT_CONTACT_EMAIL}
                        </MuiLink>
                        .
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
                    {status === 'success' ? (
                        <Alert
                            severity="success"
                            sx={{
                                backgroundColor: isDark
                                    ? 'rgba(46, 125, 50, 0.2)'
                                    : undefined,
                                color: textColor
                            }}
                        >
                            Thanks — your message was sent. We&apos;ll reply as soon as we can.
                        </Alert>
                    ) : (
                        <Box
                            component="form"
                            name={SUPPORT_FORM_NAME}
                            method="POST"
                            data-netlify="true"
                            data-netlify-honeypot="bot-field"
                            onSubmit={handleSubmit}
                            noValidate
                        >
                            <input type="hidden" name="form-name" value={SUPPORT_FORM_NAME} />
                            {/* Honeypot — leave empty; bots fill it. */}
                            <Box
                                sx={{
                                    position: 'absolute',
                                    left: '-10000px',
                                    height: 0,
                                    overflow: 'hidden'
                                }}
                                aria-hidden="true"
                            >
                                <label>
                                    Don&apos;t fill this out if you&apos;re human:
                                    <input
                                        name="bot-field"
                                        tabIndex={-1}
                                        autoComplete="off"
                                        value={botField}
                                        onChange={(e) => setBotField(e.target.value)}
                                    />
                                </label>
                            </Box>

                            <TextField
                                required
                                fullWidth
                                id="support-name"
                                name="name"
                                label="Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                margin="normal"
                                autoComplete="name"
                                disabled={status === 'submitting'}
                                sx={fieldSx}
                            />
                            <TextField
                                required
                                fullWidth
                                id="support-email"
                                name="email"
                                type="email"
                                label="E-mail"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                margin="normal"
                                autoComplete="email"
                                disabled={status === 'submitting'}
                                sx={fieldSx}
                            />
                            <TextField
                                required
                                fullWidth
                                id="support-message"
                                name="message"
                                label="Issue description"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                margin="normal"
                                multiline
                                minRows={5}
                                disabled={status === 'submitting'}
                                sx={fieldSx}
                            />

                            {status === 'error' && (
                                <Alert
                                    severity="error"
                                    sx={{ mt: 2, mb: 1, color: textColor }}
                                >
                                    {errorMessage}{' '}
                                    <MuiLink
                                        href={`mailto:${SUPPORT_CONTACT_EMAIL}`}
                                        sx={{ color: linkColor }}
                                    >
                                        {SUPPORT_CONTACT_EMAIL}
                                    </MuiLink>
                                </Alert>
                            )}

                            <Button
                                type="submit"
                                variant="contained"
                                fullWidth
                                disabled={
                                    status === 'submitting' ||
                                    !name.trim() ||
                                    !email.trim() ||
                                    !message.trim()
                                }
                                sx={{
                                    mt: 2.5,
                                    py: 1.25,
                                    fontWeight: 700,
                                    textTransform: 'none',
                                    fontSize: '1rem',
                                    backgroundColor: isDark ? '#c87137' : '#8b4513',
                                    color: '#fff',
                                    '&:hover': {
                                        backgroundColor: isDark ? '#d4844a' : '#5d2f0d'
                                    },
                                    '&.Mui-disabled': {
                                        backgroundColor: isDark
                                            ? 'rgba(200, 113, 55, 0.35)'
                                            : 'rgba(139, 69, 19, 0.35)',
                                        color: 'rgba(255,255,255,0.7)'
                                    }
                                }}
                            >
                                {status === 'submitting' ? (
                                    <CircularProgress size={22} sx={{ color: '#fff' }} />
                                ) : (
                                    'Send message'
                                )}
                            </Button>
                        </Box>
                    )}
                </Paper>
            </Container>
        </Box>
    );
};

export default Support;
