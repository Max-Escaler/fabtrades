import { Box, Typography, Chip } from '@mui/material';
import {formatCurrency} from "../../utils/helpers.js";

const TradeSummary = ({ haveList, wantList, haveTotal, wantTotal, diff, isLandscape = false }) => {
    return (
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
                justifyContent: 'center',
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
                <Typography variant="h6" sx={{ 
                    fontWeight: 'bold', 
                    color: 'black', 
                    fontSize: isLandscape ? '0.75rem' : { xs: '0.8rem' },
                    textAlign: 'center'
                }}>
                    Trade Differential
                </Typography>
                <Chip
                    label={diff > 0 ? `+${formatCurrency(diff.toFixed(2))}` : `${formatCurrency(diff.toFixed(2))}`}
                    color={diff > 0 ? 'primary' : diff < 0 ? 'success' : 'default'}
                    variant="filled"
                    size={isLandscape ? 'small' : 'medium'}
                />
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
        </Box>
    );
};

export default TradeSummary;
