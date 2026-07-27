import { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Container,
    Paper,
    List,
    ListItem,
    IconButton,
    Chip,
    CircularProgress,
    Alert,
    TextField,
    InputAdornment,
    Tooltip,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Snackbar
} from '@mui/material';
import {
    Delete as DeleteIcon,
    Download as LoadIcon,
    Search as SearchIcon,
    ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEntitlement } from '../contexts/EntitlementContext.jsx';
import { useThemeMode } from '../contexts/ThemeContext.jsx';
import { getUserTrades, deleteTrade } from '../services/tradeHistory';
import { useCardData } from '../hooks/useCardData.jsx';
import { FreeLimits } from '../utils/freeLimits.js';
import { formatCurrency } from '../utils/helpers.js';
import { normalizeTradeList, tradeDisplayName } from '../utils/tradeItems.js';
import { CardThumbnail } from '../components/ui/CardImagePreview.jsx';
import Header from '../components/elements/Header.jsx';

const TradeHistory = () => {
    const navigate = useNavigate();
    const { user, signInWithDiscord } = useAuth();
    const { isPro, loading: entitlementLoading } = useEntitlement();
    const { pricesUpdatedAt: lastUpdatedTimestamp } = useCardData();
    const { isDark } = useThemeMode();
    const [trades, setTrades] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [deletingId, setDeletingId] = useState(null);
    const [confirmDeleteTrade, setConfirmDeleteTrade] = useState(null);
    const [deleteError, setDeleteError] = useState('');

    useEffect(() => {
        if (user) {
            loadTrades();
        }
    }, [user]);

    const loadTrades = async () => {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await getUserTrades();

        if (fetchError) {
            setError(fetchError.message || 'Failed to load trade history');
        } else {
            setTrades(data || []);
        }

        setLoading(false);
    };

    const handleConfirmDelete = async () => {
        const trade = confirmDeleteTrade;
        setConfirmDeleteTrade(null);
        if (!trade) return;

        setDeletingId(trade.id);
        const { error: delError } = await deleteTrade(trade.id);

        if (delError) {
            setDeleteError(delError.message || 'Failed to delete trade');
        } else {
            setTrades(prev => prev.filter(t => t.id !== trade.id));
        }

        setDeletingId(null);
    };

    const handleLoadTrade = (trade) => {
        // Navigate to home with trade data in state
        navigate('/', { state: { loadTrade: trade } });
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            if (diffHours === 0) {
                const diffMinutes = Math.floor(diffMs / (1000 * 60));
                return diffMinutes <= 1 ? 'Just now' : `${diffMinutes} minutes ago`;
            }
            return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
        }
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
        }
        return date.toLocaleDateString();
    };

    const filteredTrades = trades.filter(trade =>
        tradeDisplayName(trade).toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Theme-aware colors matching the rest of the app
    const bgGradient = isDark
        ? 'linear-gradient(135deg, #0d0806 0%, #1a0f0a 50%, #2c1810 100%)'
        : 'linear-gradient(135deg, #f5f1ed 0%, #e8dfd6 50%, #f0e6dc 100%)';
    const textColor = isDark ? '#f5f1ed' : '#2c1810';
    const mutedColor = isDark ? '#d4a574' : '#5d3a1a';
    const accentColor = isDark ? '#e4c09c' : '#8b4513';
    const paperBg = isDark ? 'rgba(44, 24, 16, 0.6)' : '#ffffff';
    const paperBorder = isDark ? 'rgba(212, 165, 116, 0.2)' : 'rgba(139, 69, 19, 0.15)';

    // Not signed in: explain and offer the sign-in action right here
    if (!user) {
        return (
            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                minHeight: '100vh',
                background: bgGradient,
                backgroundAttachment: 'fixed'
            }}>
                <Header lastUpdatedTimestamp={lastUpdatedTimestamp} />
                <Container maxWidth="sm" sx={{ mt: 8 }}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 4,
                            textAlign: 'center',
                            backgroundColor: paperBg,
                            border: `1px solid ${paperBorder}`,
                            borderRadius: 3
                        }}
                    >
                        <Typography variant="h5" sx={{ mb: 2, color: accentColor, fontWeight: 700 }}>
                            Sign In Required
                        </Typography>
                        <Typography variant="body1" sx={{ mb: 3, color: mutedColor }}>
                            Sign in with Discord to save trades and view your trade history.
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
                            <Button
                                variant="contained"
                                onClick={signInWithDiscord}
                                sx={{
                                    background: '#5865F2',
                                    '&:hover': { background: '#4752C4' }
                                }}
                            >
                                Sign in with Discord
                            </Button>
                            <Button
                                variant="outlined"
                                startIcon={<ArrowBackIcon />}
                                onClick={() => navigate('/')}
                                sx={{
                                    color: accentColor,
                                    borderColor: paperBorder,
                                    '&:hover': {
                                        borderColor: accentColor,
                                        backgroundColor: isDark ? 'rgba(200, 113, 55, 0.12)' : 'rgba(139, 69, 19, 0.06)'
                                    }
                                }}
                            >
                                Back to Trading
                            </Button>
                        </Box>
                    </Paper>
                </Container>
            </Box>
        );
    }

    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh',
            background: bgGradient,
            backgroundAttachment: 'fixed'
        }}>
            <Header lastUpdatedTimestamp={lastUpdatedTimestamp} />

            <Container maxWidth="lg" sx={{ flexGrow: 1, py: 4 }}>
                <Paper
                    elevation={0}
                    sx={{
                        p: { xs: 2, sm: 3, md: 4 },
                        borderRadius: 3,
                        backgroundColor: paperBg,
                        border: `1px solid ${paperBorder}`,
                        minHeight: '60vh'
                    }}
                >
                    {/* Header */}
                    <Box sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 3,
                        pb: 2,
                        borderBottom: '2px solid #d4a574'
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: accentColor }}>
                                Trade History
                            </Typography>
                            {isPro && (
                                <Chip
                                    size="small"
                                    label="PRO"
                                    sx={{
                                        fontWeight: 700,
                                        letterSpacing: 0.5,
                                        color: isDark ? '#1a0f0a' : '#ffffff',
                                        backgroundColor: accentColor,
                                    }}
                                />
                            )}
                        </Box>
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<ArrowBackIcon />}
                            onClick={() => navigate('/')}
                            sx={{
                                borderColor: paperBorder,
                                color: accentColor,
                                '&:hover': {
                                    borderColor: accentColor,
                                    backgroundColor: isDark ? 'rgba(200, 113, 55, 0.12)' : 'rgba(139, 69, 19, 0.08)'
                                }
                            }}
                        >
                            Back to Trading
                        </Button>
                    </Box>

                    {/* Where the free window stands. Only once it is actually in
                        sight — same 70% pressure rule as mobile's FreeUsage.
                        Web cannot sell Pro (purchases live in the apps), so this
                        says where to buy rather than offering a checkout. */}
                    {!entitlementLoading && !isPro &&
                        trades.length / FreeLimits.savedTrades >= 0.7 && (
                        <Alert severity="info" icon={false} sx={{ mb: 3 }}>
                            Free plan — your {FreeLimits.savedTrades} most recent trades are kept.
                            Subscribe in the FABTrades app to keep every trade.
                        </Alert>
                    )}

                    {/* Search Bar */}
                    <TextField
                        fullWidth
                        placeholder="Search trades by name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        size="medium"
                        sx={{
                            mb: 3,
                            '& .MuiOutlinedInput-root': {
                                backgroundColor: isDark ? 'rgba(26, 15, 10, 0.6)' : 'rgba(255, 255, 255, 0.6)',
                                '& fieldset': { borderColor: paperBorder },
                                '&:hover fieldset': { borderColor: accentColor }
                            },
                            '& input': { color: textColor }
                        }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon sx={{ color: mutedColor }} />
                                </InputAdornment>
                            ),
                        }}
                    />

                    {/* Loading State */}
                    {loading && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                            <CircularProgress sx={{ color: accentColor }} />
                        </Box>
                    )}

                    {/* Error State */}
                    {error && !loading && (
                        <Alert severity="error" sx={{ mb: 3 }}>
                            {error}
                        </Alert>
                    )}

                    {/* Empty State */}
                    {!loading && !error && filteredTrades.length === 0 && (
                        <Box sx={{ textAlign: 'center', py: 8 }}>
                            {searchQuery ? (
                                <>
                                    <Typography variant="h6" sx={{ color: textColor, mb: 1 }}>
                                        No trades found
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: mutedColor }}>
                                        Try a different search term
                                    </Typography>
                                </>
                            ) : (
                                <>
                                    <Typography variant="h6" sx={{ color: textColor, mb: 1 }}>
                                        No saved trades yet
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: mutedColor, mb: 3 }}>
                                        Build a trade and click Save to add it to your history
                                    </Typography>
                                    <Button
                                        variant="contained"
                                        onClick={() => navigate('/')}
                                    >
                                        Start Trading
                                    </Button>
                                </>
                            )}
                        </Box>
                    )}

                    {/* Trades List */}
                    {!loading && filteredTrades.length > 0 && (
                        <List sx={{ py: 0 }}>
                            {filteredTrades.map((trade) => (
                                <ListItem key={trade.id} sx={{ px: 0, py: 1 }}>
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            width: '100%',
                                            p: 3,
                                            backgroundColor: isDark ? 'rgba(26, 15, 10, 0.5)' : '#ffffff',
                                            border: `1px solid ${paperBorder}`,
                                            borderRadius: 2,
                                            transition: 'all 0.2s',
                                            '&:hover': {
                                                borderColor: accentColor,
                                                boxShadow: isDark
                                                    ? '0 4px 12px rgba(0, 0, 0, 0.3)'
                                                    : '0 4px 12px rgba(139, 69, 19, 0.15)'
                                            }
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                                <Typography
                                                    variant="h6"
                                                    sx={{
                                                        fontWeight: 600,
                                                        color: textColor,
                                                        mb: 1,
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                >
                                                    {tradeDisplayName(trade)}
                                                </Typography>

                                                <Typography variant="caption" sx={{ color: mutedColor, display: 'block', mb: 2 }}>
                                                    {formatDate(trade.created_at)}
                                                </Typography>

                                                <TradeCardLists
                                                    haveList={trade.have_list}
                                                    wantList={trade.want_list}
                                                    haveCash={trade.have_cash}
                                                    wantCash={trade.want_cash}
                                                    textColor={textColor}
                                                    mutedColor={mutedColor}
                                                />

                                                {/* Diff colors match the trade calculator:
                                                    positive = your side is worth more (primary),
                                                    negative = their side is worth more (success) */}
                                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1.5 }}>
                                                    <Chip
                                                        size="small"
                                                        label={`Diff: ${parseFloat(trade.diff) > 0 ? '+' : ''}${formatCurrency(parseFloat(trade.diff).toFixed(2))}`}
                                                        color={parseFloat(trade.diff) > 0 ? 'primary' : parseFloat(trade.diff) < 0 ? 'success' : 'default'}
                                                        sx={{ fontWeight: 600 }}
                                                    />
                                                </Box>
                                            </Box>

                                            <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
                                                <Tooltip title="Load this trade">
                                                    <IconButton
                                                        onClick={() => handleLoadTrade(trade)}
                                                        sx={{
                                                            color: accentColor,
                                                            '&:hover': {
                                                                backgroundColor: isDark
                                                                    ? 'rgba(200, 113, 55, 0.15)'
                                                                    : 'rgba(139, 69, 19, 0.08)'
                                                            }
                                                        }}
                                                    >
                                                        <LoadIcon />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Delete this trade">
                                                    <IconButton
                                                        onClick={() => setConfirmDeleteTrade(trade)}
                                                        disabled={deletingId === trade.id}
                                                        sx={{
                                                            color: 'error.main',
                                                            '&:hover': {
                                                                backgroundColor: 'rgba(211, 47, 47, 0.08)',
                                                            }
                                                        }}
                                                    >
                                                        {deletingId === trade.id ? (
                                                            <CircularProgress size={24} />
                                                        ) : (
                                                            <DeleteIcon />
                                                        )}
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>
                                        </Box>
                                    </Paper>
                                </ListItem>
                            ))}
                        </List>
                    )}
                </Paper>
            </Container>

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={Boolean(confirmDeleteTrade)}
                onClose={() => setConfirmDeleteTrade(null)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>Delete Trade?</DialogTitle>
                <DialogContent>
                    <Typography>
                        "{confirmDeleteTrade?.name}" will be permanently removed from your history.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setConfirmDeleteTrade(null)}>Cancel</Button>
                    <Button onClick={handleConfirmDelete} color="error" variant="contained">
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete error feedback */}
            <Snackbar
                open={Boolean(deleteError)}
                autoHideDuration={4000}
                onClose={() => setDeleteError('')}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={() => setDeleteError('')}
                    severity="error"
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    {deleteError}
                </Alert>
            </Snackbar>
        </Box>
    );
};

function TradeCardLists({ haveList, wantList, haveCash, wantCash, textColor, mutedColor }) {
    const haveCards = normalizeTradeList(haveList);
    const wantCards = normalizeTradeList(wantList);
    const cashHave = Number(haveCash) || 0;
    const cashWant = Number(wantCash) || 0;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 0.5 }}>
            {(haveCards.length > 0 || cashHave > 0) && (
                <TradeSideList
                    label="Gave"
                    cards={haveCards}
                    cash={cashHave}
                    textColor={textColor}
                    mutedColor={mutedColor}
                />
            )}
            {(wantCards.length > 0 || cashWant > 0) && (
                <TradeSideList
                    label="Got"
                    cards={wantCards}
                    cash={cashWant}
                    textColor={textColor}
                    mutedColor={mutedColor}
                />
            )}
        </Box>
    );
}

function TradeSideList({ label, cards, cash, textColor, mutedColor }) {
    return (
        <Box>
            <Typography
                variant="caption"
                sx={{
                    color: mutedColor,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: 0.4,
                    display: 'block',
                    mb: 0.75,
                }}
            >
                {label}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                {cards.map((card, index) => (
                    <Box
                        key={`${card.uniqueId || card.name}-${index}`}
                        sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}
                    >
                        <CardThumbnail
                            imageUrl={card.imageUrl}
                            fallbackUrl={card.imageUrlFallback}
                            alt={card.name}
                            size={28}
                        />
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                            <Typography
                                variant="body2"
                                sx={{
                                    color: textColor,
                                    fontWeight: 600,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    lineHeight: 1.3,
                                }}
                            >
                                {card.quantity}× {card.name}
                                {card.subTypeName ? ` (${card.subTypeName})` : ''}
                            </Typography>
                            <Typography variant="caption" sx={{ color: mutedColor }}>
                                {formatCurrency(Number(card.price || 0).toFixed(2))} ea
                            </Typography>
                        </Box>
                        <Typography
                            variant="body2"
                            sx={{ color: textColor, fontWeight: 700, flexShrink: 0 }}
                        >
                            {formatCurrency((Number(card.price || 0) * Number(card.quantity || 1)).toFixed(2))}
                        </Typography>
                    </Box>
                ))}
                {cash > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                        <Typography variant="body2" sx={{ color: textColor, fontWeight: 600, flexGrow: 1 }}>
                            Cash
                        </Typography>
                        <Typography variant="body2" sx={{ color: textColor, fontWeight: 700 }}>
                            {formatCurrency(cash.toFixed(2))}
                        </Typography>
                    </Box>
                )}
            </Box>
        </Box>
    );
}

export default TradeHistory;
