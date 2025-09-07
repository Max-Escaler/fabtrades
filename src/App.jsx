import { useState, useEffect } from 'react';
import { Box, Typography, useTheme, useMediaQuery, CircularProgress, Alert } from '@mui/material';
import { useCardData } from "./hooks/useCardData.jsx";
import { useTradeState } from "./hooks/useTradeState.js";
import Header from "./components/elements/Header.jsx";
import CardPanel from "./components/ui/CardPanel.jsx";
import TradeSummary from "./components/elements/TradeSummary.jsx";
import { fetchLastUpdatedTimestamp } from "./services/api.js";

function App() {
    const [showSuccessAlert, setShowSuccessAlert] = useState(false);
    const [lastUpdatedTimestamp, setLastUpdatedTimestamp] = useState(null);

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const { cardGroups, loading, dataReady, error } = useCardData();
    const cardNames = cardGroups.map(group => group.name);

    const tradeState = useTradeState(cardGroups);

    // Auto-hide success alert
    useEffect(() => {
        if (dataReady && !loading) {
            setShowSuccessAlert(true);
            const timer = setTimeout(() => setShowSuccessAlert(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [dataReady, loading]);

    // Fetch last updated timestamp
    useEffect(() => {
        const fetchTimestamp = async () => {
            const timestamp = await fetchLastUpdatedTimestamp();
            setLastUpdatedTimestamp(timestamp);
        };
        fetchTimestamp();
    }, []);

    if (error) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="h6" color="error" sx={{ mb: 2 }}>
                    Error loading card data
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {error}
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%' }}>
            <Header lastUpdatedTimestamp={lastUpdatedTimestamp} />

            {/* Alerts */}
            {loading && !dataReady && (
                <Box sx={{ px: { xs: 1, sm: 2, md: 3 }, py: 1 }}>
                    <Alert severity="info" icon={<CircularProgress size={20} />}>
                        Loading card data. Please wait.
                    </Alert>
                </Box>
            )}

            {showSuccessAlert && dataReady && !loading && (
                <Box sx={{ px: { xs: 1, sm: 2, md: 3 }, py: 1 }}>
                    <Alert severity="success">
                        Card data loaded successfully! You can now search and add cards.
                    </Alert>
                </Box>
            )}

            {/* Content */}
            <Box sx={{ 
                display: 'flex', 
                flexGrow: 1, 
                flexDirection: { xs: 'column', lg: 'row' }, // Vertical on mobile, horizontal on desktop
                width: '100%',
                gap: { xs: 0, lg: 2 }, // Gap between panels on desktop only
                px: { xs: 0, lg: 2 }, // Horizontal padding on desktop
                py: { xs: 0, lg: 1 } // Vertical padding on desktop
            }}>
                {/* Left Panel - Cards I Have */}
                <Box sx={{ 
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    minWidth: 0 // Prevent flex items from overflowing
                }}>
                    <CardPanel
                        title="Cards I Have"
                        cards={tradeState.haveList}
                        cardOptions={cardNames}
                        inputValue={tradeState.haveInput}
                        onInputChange={(e, v) => tradeState.setHaveInput(v || "")}
                        onAddCard={tradeState.addHaveCard}
                        onRemoveCard={tradeState.removeHaveCard}
                        onUpdateQuantity={tradeState.updateHaveCardQuantity}
                        isMobile={isMobile}
                        totalColor="primary"
                        disabled={!dataReady}
                    />
                </Box>

                {/* Trade Summary - Position changes based on screen size */}
                {(tradeState.haveList.length > 0 || tradeState.wantList.length > 0) && (
                    <Box sx={{
                        // On mobile: full width between panels
                        // On desktop: fixed width in center
                        width: { xs: '100%', lg: '400px' },
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: { xs: 'stretch', lg: 'flex-start' },
                        py: { xs: 0, lg: 2 }
                    }}>
                        <TradeSummary
                            haveList={tradeState.haveList}
                            wantList={tradeState.wantList}
                            haveTotal={tradeState.haveTotal}
                            wantTotal={tradeState.wantTotal}
                            diff={tradeState.diff}
                        />
                    </Box>
                )}

                {/* Right Panel - Cards I Want */}
                <Box sx={{ 
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    minWidth: 0 // Prevent flex items from overflowing
                }}>
                    <CardPanel
                        title="Cards I Want"
                        cards={tradeState.wantList}
                        cardOptions={cardNames}
                        inputValue={tradeState.wantInput}
                        onInputChange={(e, v) => tradeState.setWantInput(v || "")}
                        onAddCard={tradeState.addWantCard}
                        onRemoveCard={tradeState.removeWantCard}
                        onUpdateQuantity={tradeState.updateWantCardQuantity}
                        isMobile={isMobile}
                        totalColor="success"
                        disabled={!dataReady}
                    />
                </Box>
            </Box>
        </Box>
    );
}

export default App;
