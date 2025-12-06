import React, { useState } from 'react';
import { 
    Box, 
    Typography, 
    Chip, 
    Button, 
    Snackbar, 
    Alert, 
    Tooltip,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    ToggleButtonGroup,
    ToggleButton
} from '@mui/material';
import { 
    Warning as WarningIcon,
    Clear as ClearIcon,
    Save as SaveIcon
} from '@mui/icons-material';
import {formatCurrency} from "../../utils/helpers.js";
import { usePriceType } from "../../contexts/PriceContext.jsx";
import { useThemeMode } from "../../contexts/ThemeContext.jsx";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { saveTradeToHistory } from "../../services/tradeHistory.js";

const TradeSummary = ({ 
    haveList, 
    wantList, 
    haveTotal, 
    wantTotal, 
    diff, 
    isLandscape = false,
    clearURLTradeData,
    urlTradeData,
    hasLoadedFromURL
}) => {
    const { priceType, setPriceType } = usePriceType();
    const { isDark } = useThemeMode();
    const { user } = useAuth();
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const hasCards = haveList.length > 0 || wantList.length > 0;

    // Calculate total card count including quantities
    const getTotalCardCount = (cardList) => {
        return cardList.reduce((sum, card) => sum + (card.quantity || 1), 0);
    };

    const haveCardCount = getTotalCardCount(haveList);
    const wantCardCount = getTotalCardCount(wantList);

    const handlePriceTypeChange = (event, newPriceType) => {
        if (newPriceType !== null) {
            setPriceType(newPriceType);
        }
    };

    const handleClearTradeData = () => {
        clearURLTradeData();
        setShowClearConfirm(false);
    };

    const handleSaveTrade = async () => {
        setSaving(true);
        
        const haveCount = haveList.length;
        const wantCount = wantList.length;
        const tradeName = `traded +${wantCount}, -${haveCount} cards`;
        
        const { error } = await saveTradeToHistory(
            tradeName,
            haveList,
            wantList,
            { haveTotal, wantTotal, diff }
        );

        setSaving(false);

        if (error) {
            alert('Failed to save trade: ' + (error.message || 'Unknown error'));
        } else {
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        }
    };

    const formatAge = (ageInDays) => {
        if (ageInDays < 1) return 'less than a day';
        if (ageInDays < 7) return `${Math.round(ageInDays)} day${Math.round(ageInDays) !== 1 ? 's' : ''}`;
        if (ageInDays < 30) return `${Math.round(ageInDays / 7)} week${Math.round(ageInDays / 7) !== 1 ? 's' : ''}`;
        return `${Math.round(ageInDays / 30)} month${Math.round(ageInDays / 30) !== 1 ? 's' : ''}`;
    };

    // Common toggle button styles - FAB brown theme
    const toggleButtonSx = {
        '& .MuiToggleButton-root': {
            px: { xs: 0.75, sm: 1 },
            py: { xs: 0.25, sm: 0.5 },
            fontSize: { xs: '0.65rem', sm: '0.7rem' },
            textTransform: 'none',
            border: isDark ? '1px solid rgba(200, 113, 55, 0.4)' : '1px solid rgba(139, 69, 19, 0.3)',
            color: isDark ? '#c87137' : '#8b4513',
            '&.Mui-selected': {
                backgroundColor: isDark ? '#c87137' : '#8b4513',
                color: isDark ? '#1a0f0a' : '#ffffff',
                '&:hover': {
                    backgroundColor: isDark ? '#e09050' : '#5d2f0d'
                }
            },
            '&:hover': {
                backgroundColor: isDark ? 'rgba(200, 113, 55, 0.15)' : 'rgba(139, 69, 19, 0.08)'
            }
        }
    };

    // Theme-aware colors
    const textColor = isDark ? '#f5f1ed' : '#2c1810';
    const bgGradient = isLandscape 
        ? (isDark ? 'linear-gradient(180deg, #2c1810 0%, #1a0f0a 100%)' : 'linear-gradient(180deg, #ffffff 0%, #f5f1ed 100%)')
        : (isDark ? 'linear-gradient(90deg, #1a0f0a 0%, #2c1810 50%, #1a0f0a 100%)' : 'linear-gradient(90deg, #f5f1ed 0%, #ffffff 50%, #f5f1ed 100%)');

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
            {/* Price Type Selector - Landscape mode (stacked) */}
            {isLandscape && (
                <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 1,
                    px: 1,
                    py: 1.5,
                    borderBottom: `2px solid ${isDark ? 'rgba(212, 165, 116, 0.2)' : 'rgba(139, 69, 19, 0.1)'}`,
                    width: '100%'
                }}>
                    <ToggleButtonGroup
                        value={priceType}
                        exclusive
                        onChange={handlePriceTypeChange}
                        size="small"
                        sx={toggleButtonSx}
                    >
                        <ToggleButton value="market" aria-label="market price">
                            Market
                        </ToggleButton>
                        <ToggleButton value="low" aria-label="low price">
                            Low
                        </ToggleButton>
                    </ToggleButtonGroup>
                </Box>
            )}

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
                <Chip 
                    label={formatCurrency(haveTotal.toFixed(2))} 
                    color="primary" 
                    variant="filled" 
                    size={isLandscape ? 'small' : 'medium'}
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
                {/* Price Type Selector - Portrait mode */}
                {!isLandscape && (
                    <Box sx={{ 
                        display: 'flex', 
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 0.5,
                        mr: 1
                    }}>
                        <ToggleButtonGroup
                            value={priceType}
                            exclusive
                            onChange={handlePriceTypeChange}
                            size="small"
                            sx={toggleButtonSx}
                        >
                            <ToggleButton value="market" aria-label="market price">
                                Market
                            </ToggleButton>
                            <ToggleButton value="low" aria-label="low price">
                                Low
                            </ToggleButton>
                        </ToggleButtonGroup>
                    </Box>
                )}

                {/* Difference section - centered */}
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: isLandscape ? 1 : 2,
                    flexDirection: isLandscape ? 'column' : 'row',
                    justifyContent: 'center',
                    flexGrow: !isLandscape ? 1 : 'none'
                }}>
                    <Typography variant="h6" sx={{ 
                        fontWeight: 'bold', 
                        color: textColor, 
                        fontSize: isLandscape ? '0.75rem' : { xs: '0.8rem' },
                        textAlign: 'center'
                    }}>
                        Difference
                    </Typography>
                    <Chip
                        label={diff > 0 ? `+${formatCurrency(diff.toFixed(2))}` : formatCurrency(diff.toFixed(2))}
                        color={diff > 0 ? 'primary' : diff < 0 ? 'success' : 'default'}
                        variant="filled"
                        size={isLandscape ? 'small' : 'medium'}
                    />
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
                <Chip 
                    label={formatCurrency(wantTotal.toFixed(2))} 
                    color="success" 
                    variant="filled" 
                    size={isLandscape ? 'small' : 'medium'}
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

            {/* Save Trade Button */}
            <Box sx={{
                display: 'flex',
                gap: 1,
                px: isLandscape ? 1 : { xs: 0.5, sm: 0.75, md: 1 },
                py: isLandscape ? 1.5 : 1,
                borderTop: `1px solid ${isDark ? 'rgba(212, 165, 116, 0.2)' : 'rgba(139, 69, 19, 0.1)'}`,
                flexDirection: isLandscape ? 'column' : 'row',
                justifyContent: 'center'
            }}>
                <Tooltip title={user ? "Save this trade to your history" : "Sign in to save trades"}>
                    <span>
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<SaveIcon />}
                            onClick={handleSaveTrade}
                            disabled={!user || !hasCards || saving}
                            sx={{
                                borderColor: isDark ? '#c87137' : '#8b4513',
                                color: isDark ? '#c87137' : '#8b4513',
                                fontSize: isLandscape ? '0.7rem' : '0.75rem',
                                px: isLandscape ? 1.5 : 2,
                                '&:hover': {
                                    borderColor: isDark ? '#e09050' : '#5d2f0d',
                                    backgroundColor: isDark ? 'rgba(200, 113, 55, 0.15)' : 'rgba(139, 69, 19, 0.08)',
                                },
                                '&:disabled': {
                                    borderColor: isDark ? 'rgba(200, 113, 55, 0.3)' : 'rgba(139, 69, 19, 0.3)',
                                    color: isDark ? 'rgba(200, 113, 55, 0.3)' : 'rgba(139, 69, 19, 0.3)',
                                }
                            }}
                        >
                            {saving ? 'Saving...' : 'Save Trade'}
                        </Button>
                    </span>
                </Tooltip>
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

        {/* Success Snackbar */}
        <Snackbar
            open={saveSuccess}
            autoHideDuration={3000}
            onClose={() => setSaveSuccess(false)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
            <Alert severity="success" onClose={() => setSaveSuccess(false)}>
                Trade saved to your history!
            </Alert>
        </Snackbar>
        </>
    );
};

export default TradeSummary;
