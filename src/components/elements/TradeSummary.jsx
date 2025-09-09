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
    TextField
} from '@mui/material';
import { 
    Share as ShareIcon, 
    ContentCopy as CopyIcon,
    Warning as WarningIcon,
    Clear as ClearIcon
} from '@mui/icons-material';
import {formatCurrency} from "../../utils/helpers.js";

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
    urlTradeData,
    hasLoadedFromURL
}) => {
    const [showShareDialog, setShowShareDialog] = useState(false);
    const [shareURL, setShareURL] = useState('');
    const [copySuccess, setCopySuccess] = useState(false);
    const [shareError, setShareError] = useState('');
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    const hasCards = haveList.length > 0 || wantList.length > 0;

    const handleShare = async () => {
        try {
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
            p: isLandscape ? 2 : 0,
            backgroundColor: '#f8f9fa',
            borderTop: isLandscape ? 'none' : '1px solid #e9ecef',
            borderBottom: isLandscape ? 'none' : '1px solid #e9ecef',
            borderRadius: isLandscape ? 2 : 0,
            width: isLandscape ? '250px' : '100%',
            minWidth: isLandscape ? '250px' : 'auto',
            maxWidth: isLandscape ? '300px' : '100%',
            boxSizing: 'border-box',
            boxShadow: isLandscape ? 2 : 'none'
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
                justifyContent: hasCards && !isLandscape ? 'space-between' : 'center',
                alignItems: 'center',
                gap: isLandscape ? 1 : 2,
                px: isLandscape ? 1 : { xs: 0.5 },
                py: isLandscape ? 1.5 : { xs: 0.25 },
                backgroundColor: 'white',
                borderTop: isLandscape ? 'none' : '1px solid #dee2e6',
                borderBottom: isLandscape ? 'none' : '1px solid #dee2e6',
                borderRadius: isLandscape ? 1 : 0,
                mx: isLandscape ? 1 : 0,
                my: isLandscape ? 1 : 0,
                flexDirection: isLandscape ? 'column' : 'row'
            }}>
                {/* Left spacer for balance when share button is present */}
                {hasCards && !isLandscape && (
                    <Box sx={{ minWidth: { xs: 80, sm: 100 } }} />
                )}

                {/* Difference section - centered */}
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: isLandscape ? 1 : 2,
                    flexDirection: isLandscape ? 'column' : 'row',
                    justifyContent: 'center'
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

                {/* Share Button and Clear Button - on the right side */}
                {hasCards && !isLandscape && (
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        minWidth: { xs: 80, sm: 100 },
                        justifyContent: 'flex-end'
                    }}>
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<ShareIcon />}
                            onClick={handleShare}
                            sx={{
                                fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                minWidth: 'auto',
                                px: { xs: 1, sm: 1.5 }
                            }}
                        >
                            Share Trade
                        </Button>
                        
                        {hasLoadedFromURL && urlTradeData && (
                            <Tooltip title="Clear loaded trade data from URL">
                                <IconButton
                                    size="small"
                                    onClick={() => setShowClearConfirm(true)}
                                    sx={{ color: 'warning.main', p: 0.5 }}
                                >
                                    <ClearIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Box>
                )}

                {/* Share Button for landscape mode - below difference */}
                {hasCards && isLandscape && (
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        mt: 1
                    }}>
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<ShareIcon />}
                            onClick={handleShare}
                            sx={{
                                fontSize: '0.7rem',
                                minWidth: 'auto'
                            }}
                        >
                            Share Trade
                        </Button>
                        
                        {hasLoadedFromURL && urlTradeData && (
                            <Tooltip title="Clear loaded trade data from URL">
                                <IconButton
                                    size="small"
                                    onClick={() => setShowClearConfirm(true)}
                                    sx={{ color: 'warning.main', p: 0.5 }}
                                >
                                    <ClearIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        )}
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
