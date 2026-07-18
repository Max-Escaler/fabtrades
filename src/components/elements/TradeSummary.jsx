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
    Alert
} from '@mui/material';
import { 
    Warning as WarningIcon,
    Clear as ClearIcon,
    ContentCopy as ContentCopyIcon,
    Forum as ForumIcon
} from '@mui/icons-material';
import {formatCurrency} from "../../utils/helpers.js";
import { generateTradeOffer } from "../../utils/tradeOffer.js";
import { useThemeMode } from "../../contexts/ThemeContext.jsx";

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
    urlTradeData,
    hasLoadedFromURL,
}) => {
    const { isDark } = useThemeMode();
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [showTradeOffer, setShowTradeOffer] = useState(false);
    const [tradeOfferText, setTradeOfferText] = useState('');
    const [copyFeedback, setCopyFeedback] = useState(false);

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
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(tradeOfferText);
            } else {
                const textarea = document.createElement('textarea');
                textarea.value = tradeOfferText;
                textarea.setAttribute('readonly', '');
                textarea.style.position = 'absolute';
                textarea.style.left = '-9999px';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
            }
            setCopyFeedback(true);
        } catch (err) {
            console.error('Failed to copy trade offer:', err);
        }
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

    const chipSize = isLandscape ? 'small' : 'medium';
    const marketDiffLabel = diff > 0
        ? `+${formatCurrency(diff.toFixed(2))}`
        : formatCurrency(diff.toFixed(2));
    const lowDiffLabel = lowDiff > 0
        ? `+${formatCurrency(lowDiff.toFixed(2))}`
        : formatCurrency(lowDiff.toFixed(2));
    const showLowDiff = Math.abs(lowDiff) >= 0.01 || haveLowTotal > 0 || wantLowTotal > 0;

    return (
        <>
        <Box sx={{
            display: 'flex',
            flexDirection: isLandscape ? 'column' : 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 0,
            p: isLandscape ? 2.5 : 0,
            background: bgGradient,
            borderTop: isLandscape ? 'none' : `3px solid #d4a574`,
            borderBottom: isLandscape ? 'none' : `3px solid #d4a574`,
            borderRadius: isLandscape ? 3 : 0,
            border: isLandscape ? `2px solid ${isDark ? 'rgba(212, 165, 116, 0.3)' : 'rgba(139, 69, 19, 0.15)'}` : 'none',
            width: isLandscape ? '280px' : '100%',
            minWidth: isLandscape ? '280px' : 'auto',
            maxWidth: isLandscape ? '320px' : '100%',
            boxSizing: 'border-box',
            boxShadow: isLandscape 
                ? (isDark ? '0 8px 24px rgba(0, 0, 0, 0.3)' : '0 8px 24px rgba(139, 69, 19, 0.15)')
                : (isDark ? '0 4px 12px rgba(0, 0, 0, 0.2)' : '0 4px 12px rgba(139, 69, 19, 0.08)')
        }}>
            <Box sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: isLandscape ? 1 : 2,
                px: isLandscape ? 1 : { xs: 0.5, sm: 0.75, md: 1 },
                py: isLandscape ? 1 : { xs: 0.25, sm: 0.5, md: 0.75 },
                flexDirection: isLandscape ? 'column' : 'row'
            }}>
                <Typography variant="h6" sx={{ 
                    fontWeight: 'medium', 
                    color: textColor, 
                    fontSize: isLandscape ? '0.75rem' : { xs: '0.8rem', sm: '0.9rem' },
                    textAlign: 'center'
                }}>
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

            <Box sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: isLandscape ? 1 : 1,
                px: isLandscape ? 2 : { xs: 1 },
                py: isLandscape ? 2 : { xs: 0.75 },
                background: isDark 
                    ? 'linear-gradient(135deg, #1a0f0a 0%, #2c1810 100%)' 
                    : 'linear-gradient(135deg, #ffffff 0%, #fafafa 100%)',
                borderTop: isLandscape ? 'none' : `2px solid ${isDark ? 'rgba(212, 165, 116, 0.2)' : 'rgba(139, 69, 19, 0.1)'}`,
                borderBottom: isLandscape ? 'none' : `2px solid ${isDark ? 'rgba(212, 165, 116, 0.2)' : 'rgba(139, 69, 19, 0.1)'}`,
                borderRadius: isLandscape ? 2 : 0,
                mx: isLandscape ? 0 : 0,
                my: isLandscape ? 1 : 0,
                flexDirection: isLandscape ? 'column' : 'row',
                flexWrap: 'wrap',
                boxShadow: isLandscape ? (isDark ? '0 2px 8px rgba(0, 0, 0, 0.2)' : '0 2px 8px rgba(139, 69, 19, 0.08)') : 'none'
            }}>
                {/* Difference section - centered */}
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: isLandscape ? 1 : 2,
                    flexDirection: isLandscape ? 'column' : 'row',
                    justifyContent: 'center',
                    flexGrow: !isLandscape ? 1 : 'none',
                    flexWrap: 'wrap'
                }}>
                    <Typography variant="h6" sx={{ 
                        fontWeight: 'bold', 
                        color: textColor, 
                        fontSize: isLandscape ? '0.75rem' : { xs: '0.8rem' },
                        textAlign: 'center'
                    }}>
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
                </Box>

                {/* Clear Button - on the right side for portrait mode */}
                {!isLandscape && hasLoadedFromURL && urlTradeData && (
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        ml: 1
                    }}>
                        <Tooltip title="Clear loaded trade data from URL">
                            <IconButton
                                size="small"
                                onClick={() => setShowClearConfirm(true)}
                                sx={{ color: 'warning.main', p: 0.5 }}
                            >
                                <ClearIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Box>
                )}

                {/* Clear Button for landscape mode */}
                {isLandscape && hasLoadedFromURL && urlTradeData && (
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        mt: 1
                    }}>
                        <Tooltip title="Clear loaded trade data from URL">
                            <IconButton
                                size="small"
                                onClick={() => setShowClearConfirm(true)}
                                sx={{ color: 'warning.main', p: 0.5 }}
                            >
                                <ClearIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Box>
                )}
            </Box>

            {/* Their Cards Summary */}
            <Box sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: isLandscape ? 1 : 2,
                px: isLandscape ? 1 : { xs: 0.5, sm: 0.75, md: 1 },
                py: isLandscape ? 1 : { xs: 0.25, sm: 0.5, md: 0.75 },
                flexDirection: isLandscape ? 'column' : 'row'
            }}>
                <Typography variant="h6" sx={{ 
                    fontWeight: 'medium', 
                    color: textColor, 
                    fontSize: isLandscape ? '0.75rem' : { xs: '0.8rem', sm: '0.9rem' },
                    textAlign: 'center'
                }}>
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

            {/* Purple Discord trade offer */}
            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0.5,
                px: isLandscape ? 1.5 : { xs: 1, sm: 1.5 },
                py: isLandscape ? 1.5 : { xs: 1, sm: 1.25 },
                width: '100%',
                boxSizing: 'border-box',
                borderTop: `1px solid ${isDark ? 'rgba(212, 165, 116, 0.2)' : 'rgba(139, 69, 19, 0.12)'}`
            }}>
                <Typography
                    variant="caption"
                    sx={{
                        color: mutedColor,
                        fontSize: isLandscape ? '0.7rem' : { xs: '0.7rem', sm: '0.75rem' },
                        textAlign: 'center',
                        lineHeight: 1.3
                    }}
                >
                    Replying to a Purple Discord trade?
                </Typography>
                <Button
                    variant="contained"
                    size={isLandscape ? 'small' : 'medium'}
                    startIcon={<ForumIcon />}
                    onClick={handleGenerateTradeOffer}
                    disabled={!canGenerateTradeOffer}
                    sx={{
                        textTransform: 'none',
                        fontWeight: 600,
                        px: isLandscape ? 1.5 : 2,
                        background: 'linear-gradient(135deg, #8b4513 0%, #a0522d 100%)',
                        boxShadow: isDark
                            ? '0 2px 8px rgba(0, 0, 0, 0.35)'
                            : '0 2px 8px rgba(139, 69, 19, 0.25)',
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

        <Snackbar
            open={copyFeedback}
            autoHideDuration={2500}
            onClose={() => setCopyFeedback(false)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
            <Alert
                onClose={() => setCopyFeedback(false)}
                severity="success"
                variant="filled"
                sx={{ width: '100%' }}
            >
                Copied — send it to the trade poster
            </Alert>
        </Snackbar>
        </>
    );
};

export default TradeSummary;
