import { useState, useMemo, useEffect } from 'react';
import {
    Box,
    Container,
    Paper,
    Typography,
    TextField,
    InputAdornment,
    List,
    ListItem,
    ListItemButton,
    Chip,
    CircularProgress,
    Alert
} from '@mui/material';
import {
    Search as SearchIcon,
    CalendarToday as CalendarIcon,
    Style as StyleIcon,
    ChevronRight as ChevronRightIcon
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import Header from '../components/elements/Header.jsx';
import { useSets } from '../hooks/useSets.js';
import { useThemeMode } from '../contexts/ThemeContext.jsx';
import { fetchLastUpdatedTimestamp } from '../services/api.js';

const formatDate = (iso) => {
    if (!iso) return 'Unknown';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return 'Unknown';
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatMoney = (value) => {
    const num = Number(value);
    if (!isFinite(num) || num <= 0) return '—';
    return `$${num.toFixed(2)}`;
};

const SetList = () => {
    const { sets, loading, error } = useSets();
    const { isDark } = useThemeMode();
    const [query, setQuery] = useState('');
    const [lastUpdatedTimestamp, setLastUpdatedTimestamp] = useState(null);

    useEffect(() => {
        fetchLastUpdatedTimestamp().then(setLastUpdatedTimestamp);
    }, []);

    const filteredSets = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return sets;
        return sets.filter((s) =>
            s.name.toLowerCase().includes(q) ||
            (s.abbreviation || '').toLowerCase().includes(q)
        );
    }, [sets, query]);

    const bgGradient = isDark
        ? 'linear-gradient(135deg, #0d0806 0%, #1a0f0a 50%, #2c1810 100%)'
        : 'linear-gradient(135deg, #f5f1ed 0%, #e8dfd6 50%, #f0e6dc 100%)';

    const textColor = isDark ? '#f5f1ed' : '#2c1810';
    const mutedColor = isDark ? '#d4a574' : '#5d3a1a';

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
                        sx={{
                            fontWeight: 700,
                            color: textColor,
                            mb: 0.5,
                            fontSize: { xs: '1.5rem', md: '2rem' }
                        }}
                    >
                        Browse Sets
                    </Typography>
                    <Typography variant="body2" sx={{ color: mutedColor }}>
                        Pick a set to see its cards ranked by TCGplayer market price.
                    </Typography>
                </Box>

                <TextField
                    fullWidth
                    placeholder="Search sets..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    sx={{
                        mb: 2,
                        '& .MuiOutlinedInput-root': {
                            backgroundColor: isDark ? 'rgba(44, 24, 16, 0.6)' : '#ffffff',
                            '& fieldset': {
                                borderColor: isDark ? 'rgba(212, 165, 116, 0.3)' : 'rgba(139, 69, 19, 0.3)'
                            },
                            '&:hover fieldset': {
                                borderColor: isDark ? '#d4a574' : '#8b4513'
                            }
                        },
                        '& input': { color: textColor }
                    }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon sx={{ color: mutedColor }} />
                            </InputAdornment>
                        )
                    }}
                />

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                        <CircularProgress sx={{ color: isDark ? '#d4a574' : '#8b4513' }} />
                    </Box>
                ) : (
                    <Paper
                        elevation={0}
                        sx={{
                            backgroundColor: isDark ? 'rgba(44, 24, 16, 0.6)' : '#ffffff',
                            border: `1px solid ${isDark ? 'rgba(212, 165, 116, 0.2)' : 'rgba(139, 69, 19, 0.15)'}`,
                            borderRadius: 2,
                            overflow: 'hidden'
                        }}
                    >
                        <List disablePadding>
                            {filteredSets.length === 0 && (
                                <ListItem>
                                    <Typography variant="body2" sx={{ color: mutedColor, py: 2 }}>
                                        No sets match your search.
                                    </Typography>
                                </ListItem>
                            )}
                            {filteredSets.map((set, idx) => (
                                <ListItem
                                    key={set.groupId}
                                    disablePadding
                                    sx={{
                                        borderBottom: idx === filteredSets.length - 1
                                            ? 'none'
                                            : `1px solid ${isDark ? 'rgba(212, 165, 116, 0.12)' : 'rgba(139, 69, 19, 0.08)'}`
                                    }}
                                >
                                    <ListItemButton
                                        component={Link}
                                        to={`/sets/${set.groupId}`}
                                        sx={{
                                            px: 2,
                                            py: 1.5,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 2,
                                            '&:hover': {
                                                backgroundColor: isDark ? 'rgba(200, 113, 55, 0.1)' : 'rgba(139, 69, 19, 0.06)'
                                            }
                                        }}
                                    >
                                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                            <Typography
                                                variant="subtitle1"
                                                sx={{
                                                    color: textColor,
                                                    fontWeight: 600,
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis'
                                                }}
                                            >
                                                {set.name}
                                                {set.abbreviation ? (
                                                    <Box component="span" sx={{ ml: 1, color: mutedColor, fontWeight: 500, fontSize: '0.85em' }}>
                                                        {set.abbreviation}
                                                    </Box>
                                                ) : null}
                                            </Typography>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5, flexWrap: 'wrap' }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <CalendarIcon sx={{ fontSize: 14, color: mutedColor }} />
                                                    <Typography variant="caption" sx={{ color: mutedColor }}>
                                                        {formatDate(set.publishedOn)}
                                                    </Typography>
                                                </Box>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <StyleIcon sx={{ fontSize: 14, color: mutedColor }} />
                                                    <Typography variant="caption" sx={{ color: mutedColor }}>
                                                        {set.cardCount} cards
                                                    </Typography>
                                                </Box>
                                                {set.topMarketPrice > 0 && (
                                                    <Chip
                                                        size="small"
                                                        label={`Top ${formatMoney(set.topMarketPrice)}`}
                                                        sx={{
                                                            height: 20,
                                                            fontSize: '0.7rem',
                                                            backgroundColor: isDark ? 'rgba(200, 113, 55, 0.2)' : 'rgba(139, 69, 19, 0.1)',
                                                            color: isDark ? '#e4c09c' : '#8b4513',
                                                            border: `1px solid ${isDark ? 'rgba(212, 165, 116, 0.3)' : 'rgba(139, 69, 19, 0.2)'}`
                                                        }}
                                                    />
                                                )}
                                            </Box>
                                        </Box>
                                        <ChevronRightIcon sx={{ color: mutedColor, flexShrink: 0 }} />
                                    </ListItemButton>
                                </ListItem>
                            ))}
                        </List>
                    </Paper>
                )}
            </Container>
        </Box>
    );
};

export default SetList;
