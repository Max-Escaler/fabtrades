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
    Button
} from '@mui/material';
import {
    Delete as DeleteIcon,
    Download as LoadIcon,
    Search as SearchIcon,
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
    ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUserTrades, deleteTrade } from '../services/tradeHistory';
import { fetchLastUpdatedTimestamp } from '../services/api';
import Header from '../components/elements/Header.jsx';

const TradeHistory = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [trades, setTrades] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [deletingId, setDeletingId] = useState(null);
    const [lastUpdatedTimestamp, setLastUpdatedTimestamp] = useState(null);

    useEffect(() => {
        if (user) {
            loadTrades();
        }
    }, [user]);

    // Fetch last updated timestamp
    useEffect(() => {
        const fetchTimestamp = async () => {
            const timestamp = await fetchLastUpdatedTimestamp();
            setLastUpdatedTimestamp(timestamp);
        };
        fetchTimestamp();
    }, []);

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

    const handleDelete = async (tradeId) => {
        if (!confirm('Are you sure you want to delete this trade from your history?')) {
            return;
        }

        setDeletingId(tradeId);
        const { error: deleteError } = await deleteTrade(tradeId);
        
        if (deleteError) {
            alert('Failed to delete trade: ' + (deleteError.message || 'Unknown error'));
        } else {
            setTrades(trades.filter(t => t.id !== tradeId));
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

    const formatCurrency = (value) => {
        return `$${parseFloat(value).toFixed(2)}`;
    };

    const formatTradeSummary = (haveList, wantList) => {
        const maxCards = 5; // Show up to 5 total cards
        const allCards = [];
        
        // Add have cards with - prefix
        haveList.forEach(card => {
            allCards.push(`-${card.quantity} ${card.name || 'Unknown'}`);
        });
        
        // Add want cards with + prefix
        wantList.forEach(card => {
            allCards.push(`+${card.quantity} ${card.name || 'Unknown'}`);
        });
        
        // Show first maxCards, then indicate if there are more
        const displayCards = allCards.slice(0, maxCards);
        const remaining = allCards.length - maxCards;
        
        if (remaining > 0) {
            return displayCards.join('  ') + `  ... (+${remaining} more)`;
        }
        
        return displayCards.join('  ');
    };

    const filteredTrades = trades.filter(trade =>
        trade.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Redirect to home if not authenticated
    if (!user) {
        return (
            <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                height: '100vh',
                background: 'linear-gradient(135deg, #f5f1ed 0%, #e8dfd6 100%)',
            }}>
                <Header lastUpdatedTimestamp={lastUpdatedTimestamp} />
                <Container maxWidth="md" sx={{ mt: 8 }}>
                    <Paper sx={{ p: 4, textAlign: 'center' }}>
                        <Typography variant="h5" sx={{ mb: 2, color: '#8b4513' }}>
                            Sign In Required
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                            Please sign in with Discord to view your trade history.
                        </Typography>
                        <Button
                            variant="contained"
                            onClick={() => navigate('/')}
                            sx={{
                                backgroundColor: '#8b4513',
                                '&:hover': { backgroundColor: '#5d2f0d' }
                            }}
                        >
                            <ArrowBackIcon sx={{ mr: 1 }} />
                            Back to Home
                        </Button>
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
            background: 'linear-gradient(135deg, #f5f1ed 0%, #e8dfd6 100%)',
            backgroundAttachment: 'fixed'
        }}>
            <Header lastUpdatedTimestamp={lastUpdatedTimestamp} />
            
            <Container maxWidth="lg" sx={{ flexGrow: 1, py: 4 }}>
                <Paper sx={{ 
                    p: { xs: 2, sm: 3, md: 4 },
                    borderRadius: 3,
                    border: '2px solid rgba(139, 69, 19, 0.15)',
                    boxShadow: '0 8px 24px rgba(139, 69, 19, 0.12)',
                    minHeight: '60vh'
                }}>
                    {/* Header */}
                    <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        mb: 3,
                        pb: 2,
                        borderBottom: '2px solid #d4a574'
                    }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#8b4513' }}>
                            Trade History
                        </Typography>
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<ArrowBackIcon />}
                            onClick={() => navigate('/')}
                            sx={{
                                borderColor: '#8b4513',
                                color: '#8b4513',
                                '&:hover': {
                                    borderColor: '#5d2f0d',
                                    backgroundColor: 'rgba(139, 69, 19, 0.08)',
                                }
                            }}
                        >
                            Back to Trading
                        </Button>
                    </Box>

                    {/* Search Bar */}
                    <TextField
                        fullWidth
                        placeholder="Search trades by name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        size="medium"
                        sx={{ mb: 3 }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon sx={{ color: 'text.secondary' }} />
                                </InputAdornment>
                            ),
                        }}
                    />

                    {/* Loading State */}
                    {loading && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                            <CircularProgress sx={{ color: '#8b4513' }} />
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
                                    <Typography variant="h6" sx={{ color: 'text.secondary', mb: 1 }}>
                                        No trades found
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                        Try a different search term
                                    </Typography>
                                </>
                            ) : (
                                <>
                                    <Typography variant="h6" sx={{ color: 'text.secondary', mb: 1 }}>
                                        No saved trades yet
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                                        Build a trade and click the Save button to add it to your history
                                    </Typography>
                                    <Button
                                        variant="contained"
                                        onClick={() => navigate('/')}
                                        sx={{
                                            backgroundColor: '#8b4513',
                                            '&:hover': { backgroundColor: '#5d2f0d' }
                                        }}
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
                                        sx={{
                                            width: '100%',
                                            p: 3,
                                            border: '1px solid',
                                            borderColor: 'divider',
                                            borderRadius: 2,
                                            transition: 'all 0.2s',
                                            '&:hover': {
                                                borderColor: '#8b4513',
                                                boxShadow: '0 4px 12px rgba(139, 69, 19, 0.15)',
                                            }
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                                <Typography
                                                    variant="h6"
                                                    sx={{
                                                        fontWeight: 600,
                                                        color: '#2c1810',
                                                        mb: 1,
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                >
                                                    {trade.name}
                                                </Typography>
                                                
                                                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 2 }}>
                                                    {formatDate(trade.created_at)}
                                                </Typography>

                                                {/* Trade Summary */}
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        color: 'text.secondary',
                                                        mb: 1.5,
                                                        fontStyle: 'italic',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient: 'vertical',
                                                    }}
                                                >
                                                    {formatTradeSummary(trade.have_list, trade.want_list)}
                                                </Typography>

                                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                                    <Chip
                                                        size="medium"
                                                        icon={parseFloat(trade.diff) >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
                                                        label={`Diff: ${formatCurrency(trade.diff)}`}
                                                        sx={{
                                                            backgroundColor: parseFloat(trade.diff) >= 0 
                                                                ? 'rgba(46, 125, 50, 0.1)' 
                                                                : 'rgba(211, 47, 47, 0.1)',
                                                            color: parseFloat(trade.diff) >= 0 ? '#2e7d32' : '#d32f2f',
                                                            fontWeight: 600,
                                                        }}
                                                    />
                                                </Box>
                                            </Box>

                                            <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
                                                <Tooltip title="Load this trade">
                                                    <IconButton
                                                        onClick={() => handleLoadTrade(trade)}
                                                        sx={{
                                                            color: '#8b4513',
                                                            '&:hover': {
                                                                backgroundColor: 'rgba(139, 69, 19, 0.08)',
                                                            }
                                                        }}
                                                    >
                                                        <LoadIcon />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Delete this trade">
                                                    <IconButton
                                                        onClick={() => handleDelete(trade.id)}
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
        </Box>
    );
};

export default TradeHistory;

