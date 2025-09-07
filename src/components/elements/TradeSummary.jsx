import { Box, Typography, Chip } from '@mui/material';
import {formatCurrency} from "../../utils/helpers.js";

const TradeSummary = ({ haveList, wantList, haveTotal, wantTotal, diff }) => {
    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
            p: 0,
            backgroundColor: '#f8f9fa',
            borderTop: '1px solid #e9ecef',
            borderBottom: '1px solid #e9ecef',
            width: '100%',
            boxSizing: 'border-box'
        }}>
            <Box sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 2,
                px: { xs: 0.5, sm: 0.75, md: 1 },
                py: { xs: 0.25, sm: 0.5, md: 0.75 },
            }}>
                <Typography variant="h6" sx={{ fontWeight: 'medium', color: 'black', fontSize: { xs: '0.8rem', sm: '0.9rem' } }}>
                    My {haveList.length} cards
                </Typography>
                <Chip label={`${formatCurrency(haveTotal.toFixed(2))}`} color="primary" variant="filled" />
            </Box>

            <Box sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 2,
                px: { xs: 0.5 },
                py: { xs: 0.25 },
                backgroundColor: 'white',
                borderTop: '1px solid #dee2e6',
                borderBottom: '1px solid #dee2e6',
            }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'black', fontSize: { xs: '0.8rem' } }}>
                    Trade Differential
                </Typography>
                <Chip
                    label={diff > 0 ? `+${formatCurrency(diff.toFixed(2))}` : `${formatCurrency(diff.toFixed(2))}`}
                    color={diff > 0 ? 'primary' : diff < 0 ? 'success' : 'default'}
                    variant="filled"
                />
            </Box>

            {/* Their Cards Summary */}
            <Box sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 2,
                px: { xs: 0.5, sm: 0.75, md: 1 },
                py: { xs: 0.25, sm: 0.5, md: 0.75 },
            }}>
                <Typography variant="h6" sx={{ fontWeight: 'medium', color: 'black', fontSize: { xs: '0.8rem', sm: '0.9rem' } }}>
                    Their {wantList.length} cards
                </Typography>
                <Chip label={`${formatCurrency(wantTotal.toFixed(2))}`} color="success" variant="filled" />
            </Box>
        </Box>
    );
};

export default TradeSummary;
