import React, { useMemo, useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Box,
    Typography,
    IconButton,
    List,
    ListItemButton,
    Chip,
    CircularProgress,
    Snackbar,
    Alert,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import BalanceIcon from '@mui/icons-material/Balance';
import SortIcon from '@mui/icons-material/Sort';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AddIcon from '@mui/icons-material/Add';
import {
    getFillerContext,
    findFillerMatches,
    closenessLabel,
    cardToTradeOption,
} from '../../utils/findFiller.js';
import { formatCurrency } from '../../utils/helpers.js';
import { getCardGradient, formatCardType } from '../../utils/searchUtils.js';
import { usePriceType } from '../../contexts/PriceContext.jsx';
import { useThemeMode } from '../../contexts/ThemeContext.jsx';
import { CardThumbnail } from '../ui/CardImagePreview.jsx';

/**
 * Dialog that suggests catalog cards whose price closest matches the trade's
 * value gap, mirroring the mobile "Find Trade Filler" sheet.
 */
const FindFillerDialog = ({
    open,
    onClose,
    diff,
    cards = [],
    dataReady = false,
    onAddHave,
    onAddWant,
}) => {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
    const { priceType, priceSource } = usePriceType();
    const { isDark } = useThemeMode();
    const [snackbar, setSnackbar] = useState({ open: false, message: '' });

    const { target, balanced, fillSide, sideIsMine } = useMemo(
        () => getFillerContext(diff ?? 0),
        [diff]
    );

    const matches = useMemo(() => {
        if (!open || balanced || !dataReady) return [];
        return findFillerMatches(cards, target, priceType);
    }, [open, balanced, dataReady, cards, target, priceType]);

    const formatMoney = (amount) => {
        if (priceSource === 'cardmarket') {
            return new Intl.NumberFormat('de-DE', {
                style: 'currency',
                currency: 'EUR',
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
            }).format(amount);
        }
        return formatCurrency(amount);
    };

    const handleAdd = (card) => {
        const option = cardToTradeOption(card);
        if (fillSide === 'have') {
            onAddHave?.(option);
        } else {
            onAddWant?.(option);
        }
        setSnackbar({
            open: true,
            message: `Added ${option.label} to ${sideIsMine ? 'your' : 'their'} side`,
        });
    };

    const textColor = isDark ? '#f5f1ed' : '#2c1810';
    const mutedColor = isDark ? 'rgba(212, 165, 116, 0.7)' : 'rgba(93, 58, 26, 0.65)';

    return (
        <>
            <Dialog
                open={open}
                onClose={onClose}
                fullScreen={fullScreen}
                maxWidth="sm"
                fullWidth
                scroll="paper"
                sx={{
                    '& .MuiDialog-paper': {
                        backgroundColor: isDark ? '#1a0f0a' : '#fafafa',
                        maxHeight: fullScreen ? '100%' : '80vh',
                    },
                }}
            >
                <DialogTitle
                    sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 1.5,
                        pr: 6,
                        pb: 1,
                        borderBottom: `1px solid ${isDark ? 'rgba(212, 165, 116, 0.2)' : 'rgba(139, 69, 19, 0.12)'}`,
                    }}
                >
                    <Box
                        sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: isDark
                                ? 'rgba(200, 113, 55, 0.25)'
                                : 'rgba(139, 69, 19, 0.12)',
                            flexShrink: 0,
                        }}
                    >
                        <BalanceIcon
                            sx={{ color: isDark ? '#e4c09c' : '#8b4513' }}
                        />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography
                            variant="h6"
                            sx={{
                                fontWeight: 800,
                                color: textColor,
                                lineHeight: 1.2,
                            }}
                        >
                            Find Trade Filler
                        </Typography>
                        <Typography
                            variant="body2"
                            sx={{ color: mutedColor, mt: 0.25 }}
                        >
                            {balanced
                                ? 'This trade is already even.'
                                : `${sideIsMine ? 'Your' : 'Their'} side needs ${formatMoney(target)} more to balance.`}
                        </Typography>
                    </Box>
                    <IconButton
                        aria-label="close"
                        onClick={onClose}
                        sx={{
                            position: 'absolute',
                            right: 8,
                            top: 8,
                            color: mutedColor,
                        }}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>

                <DialogContent sx={{ px: 0, pt: 1.5, pb: 1 }}>
                    {balanced ? (
                        <Box
                            sx={{
                                py: 4,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 1,
                            }}
                        >
                            <CheckCircleOutlineIcon
                                sx={{ fontSize: 40, color: 'success.main' }}
                            />
                            <Typography
                                variant="body2"
                                sx={{ color: textColor, textAlign: 'center' }}
                            >
                                Nothing to fill — the trade is balanced.
                            </Typography>
                        </Box>
                    ) : !dataReady ? (
                        <Box sx={{ py: 5, display: 'flex', justifyContent: 'center' }}>
                            <CircularProgress size={32} />
                        </Box>
                    ) : (
                        <>
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.75,
                                    px: 2,
                                    mb: 1,
                                }}
                            >
                                <SortIcon sx={{ fontSize: 16, color: mutedColor }} />
                                <Typography
                                    variant="caption"
                                    sx={{ color: mutedColor }}
                                >
                                    Closest matches first
                                </Typography>
                            </Box>

                            {matches.length === 0 ? (
                                <Box sx={{ py: 4, px: 2 }}>
                                    <Typography
                                        variant="body2"
                                        sx={{ color: textColor, textAlign: 'center' }}
                                    >
                                        No priced cards available to suggest.
                                    </Typography>
                                </Box>
                            ) : (
                                <List disablePadding>
                                    {matches.map((match) => {
                                        const { card, price } = match;
                                        const gradient = getCardGradient(
                                            card.subTypeName,
                                            isDark
                                        );
                                        const cardType = formatCardType(
                                            card.subTypeName
                                        );
                                        const setName = card._setName || '';
                                        const name =
                                            card.displayName || card.name;

                                        return (
                                            <ListItemButton
                                                key={
                                                    card._uniqueId ||
                                                    card._uniqueDisplayId ||
                                                    `${card.productId}-${card.subTypeName}`
                                                }
                                                onClick={() => handleAdd(card)}
                                                sx={{
                                                    px: 2,
                                                    py: 1,
                                                    gap: 1,
                                                    background: gradient.background,
                                                    borderBottom: isDark
                                                        ? '1px solid rgba(200, 113, 55, 0.1)'
                                                        : '1px solid rgba(139, 69, 19, 0.08)',
                                                    '&:hover': {
                                                        background:
                                                            gradient.backgroundHover,
                                                    },
                                                }}
                                            >
                                                <CardThumbnail
                                                    imageUrl={card.imageUrl || ''}
                                                    fallbackUrl={
                                                        card.imageUrlFallback || ''
                                                    }
                                                    alt={name}
                                                    size={28}
                                                />
                                                <Box
                                                    sx={{
                                                        flex: 1,
                                                        minWidth: 0,
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                    }}
                                                >
                                                    <Box
                                                        sx={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 0.75,
                                                            minWidth: 0,
                                                        }}
                                                    >
                                                        <Typography
                                                            sx={{
                                                                fontSize: '0.8rem',
                                                                fontWeight: 500,
                                                                color: textColor,
                                                                whiteSpace: 'nowrap',
                                                                overflow: 'hidden',
                                                                textOverflow:
                                                                    'ellipsis',
                                                            }}
                                                        >
                                                            {name}
                                                        </Typography>
                                                        {cardType && (
                                                            <Chip
                                                                label={cardType}
                                                                size="small"
                                                                sx={{
                                                                    height: 16,
                                                                    fontSize:
                                                                        '0.55rem',
                                                                    fontWeight: 600,
                                                                    backgroundColor:
                                                                        isDark
                                                                            ? 'rgba(212, 165, 116, 0.25)'
                                                                            : 'rgba(139, 69, 19, 0.12)',
                                                                    color: isDark
                                                                        ? '#e4c09c'
                                                                        : '#8b4513',
                                                                    '& .MuiChip-label':
                                                                        {
                                                                            px: 0.5,
                                                                            py: 0,
                                                                        },
                                                                    flexShrink: 0,
                                                                }}
                                                            />
                                                        )}
                                                    </Box>
                                                    <Typography
                                                        sx={{
                                                            fontSize: '0.65rem',
                                                            color: mutedColor,
                                                            whiteSpace: 'nowrap',
                                                            overflow: 'hidden',
                                                            textOverflow:
                                                                'ellipsis',
                                                        }}
                                                    >
                                                        {closenessLabel(
                                                            match,
                                                            target,
                                                            formatMoney
                                                        )}
                                                        {setName
                                                            ? ` · ${setName}`
                                                            : ''}
                                                    </Typography>
                                                </Box>
                                                <Typography
                                                    sx={{
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600,
                                                        color: isDark
                                                            ? '#c87137'
                                                            : '#8b4513',
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    {formatMoney(price)}
                                                </Typography>
                                                <IconButton
                                                    size="small"
                                                    aria-label={`Add ${name}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleAdd(card);
                                                    }}
                                                    sx={{
                                                        color: isDark
                                                            ? '#c87137'
                                                            : '#8b4513',
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    <AddIcon fontSize="small" />
                                                </IconButton>
                                            </ListItemButton>
                                        );
                                    })}
                                </List>
                            )}
                        </>
                    )}
                </DialogContent>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={2000}
                onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    severity="success"
                    onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );
};

export default FindFillerDialog;
