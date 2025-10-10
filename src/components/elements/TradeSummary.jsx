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
    TextField,
    ToggleButtonGroup,
    ToggleButton
} from '@mui/material';
import { 
    Share as ShareIcon, 
    ContentCopy as CopyIcon,
    Warning as WarningIcon,
    Clear as ClearIcon
} from '@mui/icons-material';
import {formatCurrency} from "../../utils/helpers.js";
import { usePriceType } from "../../contexts/PriceContext.jsx";

const TradeSummary = ({ 
    haveList, 
    wantList, 
    haveTotal, 
    wantTotal, 
    diff, 
    isLandscape = false,
    generateShareURL,
    clearURLTradeData,
    getURLSizeInfo,
    testURLRoundTrip,
    urlTradeData,
    hasLoadedFromURL
}) => {
    const { priceType, setPriceType } = usePriceType();
    const [showShareDialog, setShowShareDialog] = useState(false);
    const [shareURL, setShareURL] = useState('');
    const [copySuccess, setCopySuccess] = useState(false);
    const [shareError, setShareError] = useState('');
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    const hasCards = haveList.length > 0 || wantList.length > 0;

    const handlePriceTypeChange = (event, newPriceType) => {
        if (newPriceType !== null) {
            setPriceType(newPriceType);
        }
    };

    const handleShare = async () => {
        try {
            // First, test the round-trip encoding
            const testResult = testURLRoundTrip();
            console.log('URL round-trip test result:', testResult);
            
            if (!testResult.success) {
                setShareError(`URL encoding test failed: ${testResult.error}`);
                return;
            }

            const url = generateShareURL();
            if (!url) {
                setShareError('Failed to generate share URL');
                return;
            }

            const sizeInfo = getURLSizeInfo();
            
            setShareURL(url);
            setShowShareDialog(true);
            
            if (sizeInfo.isTooLarge) {
                setShareError('Trade is too complex for URL sharing (>2000 characters)');
            } else if (sizeInfo.isLarge) {
                setShareError('Trade URL is long (>1500 characters), may not work in all browsers');
            } else {
                setShareError('');
            }
        } catch (error) {
            setShareError('Failed to generate share URL: ' + error.message);
        }
    };

    const handleCopyURL = async () => {
        try {
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(shareURL);
                setCopySuccess(true);
                setTimeout(() => setCopySuccess(false), 3000);
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = shareURL;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                setCopySuccess(true);
                setTimeout(() => setCopySuccess(false), 3000);
            }
        } catch (error) {
            setShareError('Failed to copy URL to clipboard');
        }
    };

    const handleNativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'FAB Trade Proposal',
                    text: `Trade proposal: ${haveList.length} cards (${formatCurrency(haveTotal.toFixed(2))}) for ${wantList.length} cards (${formatCurrency(wantTotal.toFixed(2))})`,
                    url: shareURL
                });
                setShowShareDialog(false);
            } catch (error) {
                if (error.name !== 'AbortError') {
                    setShareError('Failed to share: ' + error.message);
                }
            }
        }
    };

    const handleClearTradeData = () => {
        clearURLTradeData();
        setShowClearConfirm(false);
    };

    const formatAge = (ageInDays) => {
        if (ageInDays < 1) return 'less than a day';
        if (ageInDays < 7) return `${Math.round(ageInDays)} day${Math.round(ageInDays) !== 1 ? 's' : ''}`;
        if (ageInDays < 30) return `${Math.round(ageInDays / 7)} week${Math.round(ageInDays / 7) !== 1 ? 's' : ''}`;
        return `${Math.round(ageInDays / 30)} month${Math.round(ageInDays / 30) !== 1 ? 's' : ''}`;
    };
    return (
        <>
        <Box sx={{
            display: 'flex',
            flexDirection: isLandscape ? 'column' : 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 0,
            p: isLandscape ? 2.5 : 0,
            background: isLandscape 
              ? 'linear-gradient(180deg, #ffffff 0%, #f5f1ed 100%)'
              : 'linear-gradient(90deg, #f5f1ed 0%, #ffffff 50%, #f5f1ed 100%)',
            borderTop: isLandscape ? 'none' : '3px solid #d4a574',
            borderBottom: isLandscape ? 'none' : '3px solid #d4a574',
            borderRadius: isLandscape ? 3 : 0,
            border: isLandscape ? '2px solid rgba(139, 69, 19, 0.15)' : 'none',
            width: isLandscape ? '280px' : '100%',
            minWidth: isLandscape ? '280px' : 'auto',
            maxWidth: isLandscape ? '320px' : '100%',
            boxSizing: 'border-box',
            boxShadow: isLandscape ? '0 8px 24px rgba(139, 69, 19, 0.15)' : '0 4px 12px rgba(139, 69, 19, 0.08)'
        }}>
            {/* Price Type Selector - Only show at top for landscape mode */}
            {isLandscape && (
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    px: 1,
                    py: 1.5,
                    borderBottom: '2px solid rgba(139, 69, 19, 0.1)'
                }}>
                    <ToggleButtonGroup
                        value={priceType}
                        exclusive
                        onChange={handlePriceTypeChange}
                        size="small"
                        sx={{
                            '& .MuiToggleButton-root': {
                                px: 1,
                                py: 0.5,
                                fontSize: '0.65rem',
                                textTransform: 'none',
                                border: '1px solid rgba(139, 69, 19, 0.3)',
                                color: '#5d2f0d',
                                '&.Mui-selected': {
                                    backgroundColor: '#8b4513',
                                    color: '#ffffff',
                                    '&:hover': {
                                        backgroundColor: '#a0643f'
                                    }
                                },
                                '&:hover': {
                                    backgroundColor: 'rgba(139, 69, 19, 0.08)'
                                }
                            }
                        }}
                    >
                        <ToggleButton value="market" aria-label="tcgplayer market price">
                            TCGMarket
                        </ToggleButton>
                        <ToggleButton value="low" aria-label="tcgplayer low price">
                            TCGLow
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
                    color: 'black', 
                    fontSize: isLandscape ? '0.75rem' : { xs: '0.8rem', sm: '0.9rem' },
                    textAlign: 'center'
                }}>
                    My {haveList.length} cards
                </Typography>
                <Chip 
                    label={`${formatCurrency(haveTotal.toFixed(2))}`} 
                    color="primary" 
                    variant="filled" 
                    size={isLandscape ? 'small' : 'medium'}
                />
            </Box>

            <Box sx={{
                display: 'flex',
                justifyContent: (!isLandscape && hasLoadedFromURL && urlTradeData) ? 'space-between' : 'center',
                alignItems: 'center',
                gap: isLandscape ? 1 : 2,
                px: isLandscape ? 2 : { xs: 1 },
                py: isLandscape ? 2 : { xs: 0.75 },
                background: 'linear-gradient(135deg, #ffffff 0%, #fafafa 100%)',
                borderTop: isLandscape ? 'none' : '2px solid rgba(139, 69, 19, 0.1)',
                borderBottom: isLandscape ? 'none' : '2px solid rgba(139, 69, 19, 0.1)',
                borderRadius: isLandscape ? 2 : 0,
                mx: isLandscape ? 0 : 0,
                my: isLandscape ? 1 : 0,
                flexDirection: isLandscape ? 'column' : 'row',
                boxShadow: isLandscape ? '0 2px 8px rgba(139, 69, 19, 0.08)' : 'none'
            }}>
                {/* Price Type Selector - Only show on left for portrait mode */}
                {!isLandscape && (
                    <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        minWidth: { xs: 80, sm: 100 },
                        justifyContent: 'flex-start'
                    }}>
                        <ToggleButtonGroup
                            value={priceType}
                            exclusive
                            onChange={handlePriceTypeChange}
                            size="small"
                            sx={{
                                '& .MuiToggleButton-root': {
                                    px: { xs: 1, sm: 1.5 },
                                    py: { xs: 0.25, sm: 0.5 },
                                    fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                    textTransform: 'none',
                                    border: '1px solid rgba(139, 69, 19, 0.3)',
                                    color: '#5d2f0d',
                                    '&.Mui-selected': {
                                        backgroundColor: '#8b4513',
                                        color: '#ffffff',
                                        '&:hover': {
                                            backgroundColor: '#a0643f'
                                        }
                                    },
                                    '&:hover': {
                                        backgroundColor: 'rgba(139, 69, 19, 0.08)'
                                    }
                                }
                            }}
                        >
                            <ToggleButton value="market" aria-label="tcgplayer market price">
                                TCGMarket
                            </ToggleButton>
                            <ToggleButton value="low" aria-label="tcgplayer low price">
                                TCGLow
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
                        color: 'black', 
                        fontSize: isLandscape ? '0.75rem' : { xs: '0.8rem' },
                        textAlign: 'center'
                    }}>
                        Difference
                    </Typography>
                    <Chip
                        label={diff > 0 ? `+${formatCurrency(diff.toFixed(2))}` : `${formatCurrency(diff.toFixed(2))}`}
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
                        minWidth: { xs: 80, sm: 100 },
                        justifyContent: 'flex-end'
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

                {/* Clear Button for landscape mode - below difference */}
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
                    color: 'black', 
                    fontSize: isLandscape ? '0.75rem' : { xs: '0.8rem', sm: '0.9rem' },
                    textAlign: 'center'
                }}>
                    Their {wantList.length} cards
                </Typography>
                <Chip 
                    label={`${formatCurrency(wantTotal.toFixed(2))}`} 
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
                    backgroundColor: '#fff3cd',
                    borderTop: '1px solid #ffeaa7',
                    borderBottom: '1px solid #ffeaa7'
                }}>
                    <WarningIcon fontSize="small" sx={{ color: '#856404' }} />
                    <Typography variant="caption" sx={{ color: '#856404', fontSize: '0.7rem' }}>
                        Trade data is {formatAge(urlTradeData.ageInDays)} old
                    </Typography>
                </Box>
            )}
        </Box>

        {/* Share Dialog */}
        <Dialog open={showShareDialog} onClose={() => setShowShareDialog(false)} maxWidth="md" fullWidth>
            <DialogTitle>Share Trade</DialogTitle>
            <DialogContent>
                <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        Share this URL to send your trade proposal to others:
                    </Typography>
                </Box>
                
                {shareError && (
                    <Alert severity={shareError.includes('too complex') ? 'error' : 'warning'} sx={{ mb: 2 }}>
                        {shareError}
                    </Alert>
                )}
                
                <TextField
                    fullWidth
                    multiline
                    rows={3}
                    value={shareURL}
                    variant="outlined"
                    sx={{ mb: 2 }}
                    InputProps={{
                        readOnly: true,
                        endAdornment: (
                            <Tooltip title="Copy to clipboard">
                                <IconButton onClick={handleCopyURL} edge="end">
                                    <CopyIcon />
                                </IconButton>
                            </Tooltip>
                        )
                    }}
                />
                
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                        URL Length: {shareURL.length} characters
                    </Typography>
                    {shareURL.length > 1500 && (
                        <Chip size="small" label="Long URL" color="warning" />
                    )}
                </Box>
                
                <Typography variant="caption" color="text.secondary" display="block">
                    Trade includes {haveList.length} cards you have ({formatCurrency(haveTotal.toFixed(2))}) 
                    and {wantList.length} cards you want ({formatCurrency(wantTotal.toFixed(2))})
                </Typography>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setShowShareDialog(false)}>
                    Close
                </Button>
                <Button onClick={handleCopyURL} startIcon={<CopyIcon />}>
                    Copy URL
                </Button>
                {navigator.share && (
                    <Button onClick={handleNativeShare} startIcon={<ShareIcon />} variant="contained">
                        Share
                    </Button>
                )}
            </DialogActions>
        </Dialog>

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
            open={copySuccess}
            autoHideDuration={3000}
            onClose={() => setCopySuccess(false)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
            <Alert severity="success" onClose={() => setCopySuccess(false)}>
                Trade URL copied to clipboard!
            </Alert>
        </Snackbar>
        </>
    );
};

export default TradeSummary;
