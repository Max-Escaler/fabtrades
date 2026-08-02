import React, { useState } from 'react';
import { 
    Box, 
    Typography, 
    Chip, 
    Button, 
    Tooltip,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Snackbar,
    Alert,
    FormControlLabel,
    Checkbox,
} from '@mui/material';
import { 
    Warning as WarningIcon,
    Clear as ClearIcon,
    ContentCopy as ContentCopyIcon,
    Forum as ForumIcon,
    BookmarkAdd as BookmarkAddIcon,
    CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import {formatCurrency} from "../../utils/helpers.js";
import { generateTradeOffer } from "../../utils/tradeOffer.js";
import { saveTradeToHistory } from "../../services/tradeHistory.js";
import { confirmTrade } from "../../services/confirmTrade.js";
import { FreeLimits } from "../../utils/freeLimits.js";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { useThemeMode } from "../../contexts/ThemeContext.jsx";

// Copy text to the clipboard with a fallback for non-secure contexts.
const copyTextToClipboard = async (text) => {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
};

const TotalStack = ({ market, low, color, size, isDark, isLandscape }) => {
    const muted = isDark ? 'rgba(212, 165, 116, 0.7)' : 'rgba(93, 58, 26, 0.55)';
    const showLow = low != null && Number(low) > 0;
    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 0.15
        }}>
            <Chip
                label={formatCurrency(Number(market || 0).toFixed(2))}
                color={color}
                variant="filled"
                size={size}
            />
            {showLow && (
                <Typography
                    component="span"
                    sx={{
                        fontSize: isLandscape ? '0.6rem' : { xs: '0.55rem', sm: '0.65rem' },
                        color: muted,
                        lineHeight: 1.1,
                        whiteSpace: 'nowrap'
                    }}
                >
                    Low {formatCurrency(Number(low).toFixed(2))}
                </Typography>
            )}
        </Box>
    );
};

const TradeSummary = ({ 
    haveList, 
    wantList, 
    haveTotal, 
    wantTotal,
    haveLowTotal = 0,
    wantLowTotal = 0,
    diff,
    lowDiff = 0,
    isLandscape = false,
    clearURLTradeData,
    clearTrade,
    urlTradeData,
    hasLoadedFromURL,
}) => {
    const { isDark } = useThemeMode();
    const { user } = useAuth();
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [showTradeOffer, setShowTradeOffer] = useState(false);
    const [tradeOfferText, setTradeOfferText] = useState('');
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [tradeName, setTradeName] = useState('');
    const [saving, setSaving] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [removeGiven, setRemoveGiven] = useState(true);
    const [addReceived, setAddReceived] = useState(true);
    const [confirming, setConfirming] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    // Calculate total card count including quantities
    const getTotalCardCount = (cardList) => {
        return cardList.reduce((sum, card) => sum + (card.quantity || 1), 0);
    };

    const haveCardCount = getTotalCardCount(haveList);
    const wantCardCount = getTotalCardCount(wantList);
    const canGenerateTradeOffer = haveList.length > 0 || wantList.length > 0;

    const handleClearTradeData = () => {
        clearURLTradeData();
        setShowClearConfirm(false);
    };

    const handleGenerateTradeOffer = () => {
        const text = generateTradeOffer({
            haveList,
            wantList,
            haveTotal,
            wantTotal,
            diff,
            pricedAsOf: new Date(),
        });
        setTradeOfferText(text);
        setShowTradeOffer(true);
    };

    const handleCopyTradeOffer = async () => {
        try {
            await copyTextToClipboard(tradeOfferText);
            setSnackbar({ open: true, message: 'Copied — send it to the trade poster', severity: 'success' });
        } catch (err) {
            console.error('Failed to copy trade offer:', err);
            setSnackbar({ open: true, message: 'Could not copy — select the text and copy it manually', severity: 'error' });
        }
    };

    const handleOpenSaveDialog = () => {
        const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        setTradeName(`Trade ${today}`);
        setShowSaveDialog(true);
    };

    const handleSaveTrade = async () => {
        setSaving(true);
        const { error, trimmed } = await saveTradeToHistory(tradeName, haveList, wantList, {
            haveTotal,
            wantTotal,
            diff
        });
        setSaving(false);
        if (error) {
            setSnackbar({ open: true, message: error.message || 'Failed to save trade', severity: 'error' });
            return;
        }
        setShowSaveDialog(false);
        // Say so when older trades rolled off. A history that silently shortens is
        // indistinguishable from a bug.
        setSnackbar(
            trimmed > 0
                ? {
                    open: true,
                    message: `Trade saved — your ${trimmed === 1 ? 'oldest trade' : `${trimmed} oldest trades`} `
                        + `rolled off the free ${FreeLimits.savedTrades}-trade history`,
                    severity: 'info',
                }
                : { open: true, message: 'Trade saved — find it under Trade History', severity: 'success' },
        );
    };

    const handleOpenConfirmDialog = () => {
        setRemoveGiven(haveCardCount > 0);
        setAddReceived(wantCardCount > 0);
        setShowConfirmDialog(true);
    };

    const handleConfirmTrade = async () => {
        setConfirming(true);
        const { data, error, trimmed } = await confirmTrade({
            haveList,
            wantList,
            totals: { haveTotal, wantTotal, diff },
            removeGivenFromBinder: removeGiven && haveCardCount > 0,
            addReceivedToBinder: addReceived && wantCardCount > 0,
        });
        setConfirming(false);

        // History is written before binder reconcile. If that succeeded, always
        // clear the calculator so a retry cannot create a duplicate history row.
        if (data) {
            setShowConfirmDialog(false);
            if (typeof clearTrade === 'function') {
                clearTrade();
            }
        }

        if (error) {
            setSnackbar({
                open: true,
                message:
                    error.message
                    || (data
                        ? 'Trade saved, but binder could not be updated'
                        : 'Failed to confirm trade'),
                severity: data ? 'warning' : 'error',
            });
            return;
        }

        setSnackbar(
            trimmed > 0
                ? {
                    open: true,
                    message: `Trade confirmed. The free plan keeps your last ${FreeLimits.savedTrades} trades.`,
                    severity: 'info',
                }
                : { open: true, message: 'Trade confirmed', severity: 'success' },
        );
    };

    const formatAge = (ageInDays) => {
        if (ageInDays < 1) return 'less than a day';
        if (ageInDays < 7) return `${Math.round(ageInDays)} day${Math.round(ageInDays) !== 1 ? 's' : ''}`;
        if (ageInDays < 30) return `${Math.round(ageInDays / 7)} week${Math.round(ageInDays / 7) !== 1 ? 's' : ''}`;
        return `${Math.round(ageInDays / 30)} month${Math.round(ageInDays / 30) !== 1 ? 's' : ''}`;
    };

    // Theme-aware colors
    const textColor = isDark ? '#f5f1ed' : '#2c1810';
    const mutedColor = isDark ? 'rgba(212, 165, 116, 0.7)' : 'rgba(93, 58, 26, 0.55)';
    const bgGradient = isLandscape 
        ? (isDark ? 'linear-gradient(180deg, #2c1810 0%, #1a0f0a 100%)' : 'linear-gradient(180deg, #ffffff 0%, #f5f1ed 100%)')
        : (isDark ? 'linear-gradient(90deg, #1a0f0a 0%, #2c1810 50%, #1a0f0a 100%)' : 'linear-gradient(90deg, #f5f1ed 0%, #ffffff 50%, #f5f1ed 100%)');

    const chipSize = 'small';
    const marketDiffLabel = diff > 0
        ? `+${formatCurrency(diff.toFixed(2))}`
        : formatCurrency(diff.toFixed(2));
    const lowDiffLabel = lowDiff > 0
        ? `+${formatCurrency(lowDiff.toFixed(2))}`
        : formatCurrency(lowDiff.toFixed(2));
    const showLowDiff = Math.abs(lowDiff) >= 0.01 || haveLowTotal > 0 || wantLowTotal > 0;

    const labelSx = {
        fontWeight: 'medium',
        color: textColor,
        fontSize: isLandscape ? '0.75rem' : { xs: '0.65rem', sm: '0.75rem' },
        textAlign: 'center',
        lineHeight: 1.2,
        whiteSpace: 'nowrap'
    };

    const totalColumnSx = {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.35,
        flex: isLandscape ? 'none' : 1,
        minWidth: 0,
        px: isLandscape ? 0 : 0.25
    };

    const haveColumn = (
        <Box sx={totalColumnSx}>
            <Typography variant="h6" sx={labelSx}>
                My {haveCardCount} cards
            </Typography>
            <TotalStack
                market={haveTotal}
                low={haveLowTotal}
                color="primary"
                size={chipSize}
                isDark={isDark}
                isLandscape={isLandscape}
            />
        </Box>
    );

    const differenceColumn = (
        <Box
            sx={{
                ...totalColumnSx,
                ...(isLandscape ? {
                    py: 0.75,
                    px: 0.75,
                    my: 0.25,
                    background: isDark
                        ? 'linear-gradient(135deg, #1a0f0a 0%, #2c1810 100%)'
                        : 'linear-gradient(135deg, #ffffff 0%, #fafafa 100%)',
                    borderRadius: 1.5,
                    boxShadow: isDark
                        ? '0 1px 4px rgba(0, 0, 0, 0.2)'
                        : '0 1px 4px rgba(139, 69, 19, 0.08)'
                } : {}),
                position: 'relative'
            }}
        >
            <Typography variant="h6" sx={{ ...labelSx, fontWeight: 'bold' }}>
                Difference
            </Typography>
            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0.15
            }}>
                <Chip
                    label={marketDiffLabel}
                    color={diff > 0 ? 'primary' : diff < 0 ? 'success' : 'default'}
                    variant="filled"
                    size={chipSize}
                />
                {showLowDiff && (
                    <Typography
                        component="span"
                        sx={{
                            fontSize: isLandscape ? '0.6rem' : { xs: '0.55rem', sm: '0.65rem' },
                            color: mutedColor,
                            lineHeight: 1.1,
                            whiteSpace: 'nowrap'
                        }}
                    >
                        Low {lowDiffLabel}
                    </Typography>
                )}
            </Box>
            {hasLoadedFromURL && urlTradeData && (
                <Tooltip title="Clear loaded trade data from URL">
                    <IconButton
                        size="small"
                        onClick={() => setShowClearConfirm(true)}
                        sx={{
                            color: 'warning.main',
                            p: 0.25,
                            position: isLandscape ? 'static' : 'absolute',
                            top: isLandscape ? 'auto' : -2,
                            right: isLandscape ? 'auto' : -4,
                            mt: isLandscape ? 0.5 : 0
                        }}
                    >
                        <ClearIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            )}
        </Box>
    );

    const wantColumn = (
        <Box sx={totalColumnSx}>
            <Typography variant="h6" sx={labelSx}>
                Their {wantCardCount} cards
            </Typography>
            <TotalStack
                market={wantTotal}
                low={wantLowTotal}
                color="success"
                size={chipSize}
                isDark={isDark}
                isLandscape={isLandscape}
            />
        </Box>
    );

    return (
        <>
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: isLandscape ? 'flex-start' : 'center',
            alignItems: 'center',
            alignSelf: isLandscape ? 'flex-start' : 'stretch',
            gap: 0,
            p: isLandscape ? 1.25 : 0,
            background: bgGradient,
            borderTop: isLandscape ? 'none' : `3px solid #d4a574`,
            borderBottom: isLandscape ? 'none' : `3px solid #d4a574`,
            borderRadius: isLandscape ? 2 : 0,
            border: isLandscape ? `1px solid ${isDark ? 'rgba(212, 165, 116, 0.28)' : 'rgba(139, 69, 19, 0.15)'}` : 'none',
            width: isLandscape ? '200px' : '100%',
            minWidth: isLandscape ? '200px' : 'auto',
            maxWidth: isLandscape ? '220px' : '100%',
            flexShrink: 0,
            boxSizing: 'border-box',
            boxShadow: isLandscape 
                ? (isDark ? '0 4px 14px rgba(0, 0, 0, 0.25)' : '0 4px 14px rgba(139, 69, 19, 0.1)')
                : (isDark ? '0 4px 12px rgba(0, 0, 0, 0.2)' : '0 4px 12px rgba(139, 69, 19, 0.08)')
        }}>
            {/* Totals: horizontal on mobile, stacked in landscape sidebar */}
            <Box sx={{
                display: 'flex',
                flexDirection: isLandscape ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: isLandscape ? 'stretch' : 'center',
                width: '100%',
                gap: isLandscape ? 0.75 : 0.5,
                px: isLandscape ? 0.5 : { xs: 0.75, sm: 1 },
                py: isLandscape ? 0.25 : { xs: 0.5, sm: 0.65 }
            }}>
                {haveColumn}
                {differenceColumn}
                {wantColumn}
            </Box>

            {/* URL Age Warning */}
            {urlTradeData && urlTradeData.ageInDays > 7 && (
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    px: isLandscape ? 1 : { xs: 0.5, sm: 0.75, md: 1 },
                    py: 0.5,
                    backgroundColor: isDark ? 'rgba(212, 165, 116, 0.2)' : '#fff3cd',
                    borderTop: `1px solid ${isDark ? 'rgba(212, 165, 116, 0.3)' : '#ffeaa7'}`,
                    borderBottom: `1px solid ${isDark ? 'rgba(212, 165, 116, 0.3)' : '#ffeaa7'}`
                }}>
                    <WarningIcon fontSize="small" sx={{ color: isDark ? '#e4c09c' : '#856404' }} />
                    <Typography variant="caption" sx={{ color: isDark ? '#e4c09c' : '#856404', fontSize: '0.7rem' }}>
                        Trade data is {formatAge(urlTradeData.ageInDays)} old
                    </Typography>
                </Box>
            )}

            {/* Confirm / Save (logged-in only) */}
            {user && (
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 0.75,
                    px: isLandscape ? 0.75 : { xs: 1, sm: 1.5 },
                    py: isLandscape ? 0.75 : { xs: 0.4, sm: 0.6 },
                    width: '100%',
                    boxSizing: 'border-box',
                    borderTop: `1px solid ${isDark ? 'rgba(212, 165, 116, 0.2)' : 'rgba(139, 69, 19, 0.12)'}`
                }}>
                    <Tooltip title="Record the trade and update your Binder">
                        <span>
                            <Button
                                variant="contained"
                                size="small"
                                startIcon={<CheckCircleIcon />}
                                onClick={handleOpenConfirmDialog}
                                disabled={!canGenerateTradeOffer}
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    px: 1.5,
                                    py: 0.25,
                                    minHeight: 28,
                                    background: 'linear-gradient(135deg, #8b4513 0%, #a0522d 100%)',
                                    boxShadow: isDark
                                        ? '0 1px 4px rgba(0, 0, 0, 0.35)'
                                        : '0 1px 4px rgba(139, 69, 19, 0.25)',
                                    '&:hover': {
                                        background: 'linear-gradient(135deg, #7a3b10 0%, #8b4513 100%)',
                                    },
                                    '&.Mui-disabled': {
                                        background: isDark ? 'rgba(212, 165, 116, 0.15)' : 'rgba(139, 69, 19, 0.12)',
                                        color: mutedColor,
                                    },
                                }}
                            >
                                Confirm Trade
                            </Button>
                        </span>
                    </Tooltip>
                    <Tooltip title="Save this trade to your history without changing your Binder">
                        <span>
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<BookmarkAddIcon />}
                                onClick={handleOpenSaveDialog}
                                disabled={!canGenerateTradeOffer}
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    px: 1.5,
                                    py: 0.25,
                                    minHeight: 28,
                                    color: isDark ? '#e4c09c' : '#8b4513',
                                    borderColor: isDark ? 'rgba(212, 165, 116, 0.4)' : 'rgba(139, 69, 19, 0.35)',
                                    '&:hover': {
                                        borderColor: isDark ? '#d4a574' : '#8b4513',
                                        backgroundColor: isDark ? 'rgba(200, 113, 55, 0.12)' : 'rgba(139, 69, 19, 0.06)'
                                    }
                                }}
                            >
                                Save
                            </Button>
                        </span>
                    </Tooltip>
                </Box>
            )}

            {/* Purple Discord trade offer — desktop/landscape only */}
            {isLandscape && (
                <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.4,
                    px: 0.75,
                    py: 0.75,
                    width: '100%',
                    boxSizing: 'border-box',
                    borderTop: `1px solid ${isDark ? 'rgba(212, 165, 116, 0.2)' : 'rgba(139, 69, 19, 0.12)'}`
                }}>
                    <Typography
                        variant="caption"
                        sx={{
                            color: mutedColor,
                            fontSize: '0.65rem',
                            textAlign: 'center',
                            lineHeight: 1.2,
                            flexShrink: 1
                        }}
                    >
                        Replying to a Purple Discord trade?
                    </Typography>
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<ForumIcon sx={{ fontSize: '1rem !important' }} />}
                        onClick={handleGenerateTradeOffer}
                        disabled={!canGenerateTradeOffer}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            px: 1.25,
                            py: 0.25,
                            minHeight: 28,
                            flexShrink: 0,
                            background: 'linear-gradient(135deg, #8b4513 0%, #a0522d 100%)',
                            boxShadow: isDark
                                ? '0 1px 4px rgba(0, 0, 0, 0.35)'
                                : '0 1px 4px rgba(139, 69, 19, 0.25)',
                            '&:hover': {
                                background: 'linear-gradient(135deg, #7a3b10 0%, #8b4513 100%)',
                            },
                            '&.Mui-disabled': {
                                background: isDark ? 'rgba(212, 165, 116, 0.15)' : 'rgba(139, 69, 19, 0.12)',
                                color: mutedColor
                            }
                        }}
                    >
                        Generate Trade Offer
                    </Button>
                </Box>
            )}
        </Box>

        {/* Clear Confirmation Dialog */}
        <Dialog open={showClearConfirm} onClose={() => setShowClearConfirm(false)}>
            <DialogTitle>Clear Loaded Trade Data?</DialogTitle>
            <DialogContent>
                <Typography>
                    This will clear the trade data that was loaded from the URL and remove the URL parameters.
                    Your current trade will remain but won't be linked to the shared URL anymore.
                </Typography>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setShowClearConfirm(false)}>Cancel</Button>
                <Button onClick={handleClearTradeData} color="warning" variant="contained">
                    Clear
                </Button>
            </DialogActions>
        </Dialog>

        {/* Generated Trade Offer Dialog */}
        <Dialog
            open={showTradeOffer}
            onClose={() => setShowTradeOffer(false)}
            fullWidth
            maxWidth="sm"
        >
            <DialogTitle sx={{ pb: 1 }}>Trade Offer</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    Copy this and send it to the trade poster on Purple Discord.
                </Typography>
                <TextField
                    value={tradeOfferText}
                    multiline
                    fullWidth
                    minRows={8}
                    maxRows={18}
                    InputProps={{
                        readOnly: true,
                        sx: {
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                            fontSize: '0.85rem',
                            lineHeight: 1.45
                        }
                    }}
                    onFocus={(e) => e.target.select()}
                />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                <Button onClick={() => setShowTradeOffer(false)}>Close</Button>
                <Button
                    variant="contained"
                    startIcon={<ContentCopyIcon />}
                    onClick={handleCopyTradeOffer}
                    sx={{
                        textTransform: 'none',
                        background: 'linear-gradient(135deg, #8b4513 0%, #a0522d 100%)',
                        '&:hover': {
                            background: 'linear-gradient(135deg, #7a3b10 0%, #8b4513 100%)',
                        }
                    }}
                >
                    Copy to Clipboard
                </Button>
            </DialogActions>
        </Dialog>

        {/* Save Trade Dialog */}
        <Dialog
            open={showSaveDialog}
            onClose={() => !saving && setShowSaveDialog(false)}
            fullWidth
            maxWidth="xs"
        >
            <DialogTitle>Save Trade</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Name this trade so you can find it in your history.
                </Typography>
                <TextField
                    autoFocus
                    fullWidth
                    label="Trade name"
                    value={tradeName}
                    onChange={(e) => setTradeName(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && tradeName.trim() && !saving) {
                            handleSaveTrade();
                        }
                    }}
                    disabled={saving}
                />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={() => setShowSaveDialog(false)} disabled={saving}>
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSaveTrade}
                    disabled={saving || !tradeName.trim()}
                    startIcon={<BookmarkAddIcon />}
                >
                    {saving ? 'Saving…' : 'Save Trade'}
                </Button>
            </DialogActions>
        </Dialog>

        {/* Confirm Trade Dialog */}
        <Dialog
            open={showConfirmDialog}
            onClose={() => !confirming && setShowConfirmDialog(false)}
            fullWidth
            maxWidth="xs"
        >
            <DialogTitle>Confirm Trade</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    Giving {haveCardCount} {haveCardCount === 1 ? 'card' : 'cards'} ·
                    {' '}Receiving {wantCardCount} {wantCardCount === 1 ? 'card' : 'cards'}
                </Typography>
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={removeGiven}
                            onChange={(e) => setRemoveGiven(e.target.checked)}
                            disabled={haveCardCount === 0 || confirming}
                        />
                    }
                    label={`Remove my ${haveCardCount} given ${haveCardCount === 1 ? 'card' : 'cards'} from Binder`}
                />
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={addReceived}
                            onChange={(e) => setAddReceived(e.target.checked)}
                            disabled={wantCardCount === 0 || confirming}
                        />
                    }
                    label={
                        <Box>
                            <Typography component="span" variant="body1">
                                Add their {wantCardCount} {wantCardCount === 1 ? 'card' : 'cards'} to my Binder
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block">
                                Uncheck for deck-bound pulls
                            </Typography>
                        </Box>
                    }
                />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={() => setShowConfirmDialog(false)} disabled={confirming}>
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    onClick={handleConfirmTrade}
                    disabled={confirming}
                    startIcon={<CheckCircleIcon />}
                >
                    {confirming ? 'Confirming…' : 'Confirm'}
                </Button>
            </DialogActions>
        </Dialog>

        <Snackbar
            open={snackbar.open}
            autoHideDuration={3000}
            onClose={() => setSnackbar(s => ({ ...s, open: false }))}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
            <Alert
                onClose={() => setSnackbar(s => ({ ...s, open: false }))}
                severity={snackbar.severity}
                variant="filled"
                sx={{ width: '100%' }}
            >
                {snackbar.message}
            </Alert>
        </Snackbar>
        </>
    );
};

export default TradeSummary;
