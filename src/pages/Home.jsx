import { useState, useEffect } from 'react';
import { Box, Typography, useTheme, useMediaQuery, CircularProgress, Alert } from '@mui/material';
import { useCardData } from "../hooks/useCardData.jsx";
import { useTradeState } from "../hooks/useTradeState.js";
import Header from "../components/elements/Header.jsx";
import CardPanel from "../components/ui/CardPanel.jsx";
import TradeSummary from "../components/elements/TradeSummary.jsx";
import { fetchLastUpdatedTimestamp } from "../services/api.js";

const Home = () => {
    const [showSuccessAlert, setShowSuccessAlert] = useState(false);
    const [lastUpdatedTimestamp, setLastUpdatedTimestamp] = useState(null);

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    
    // Detect landscape vs portrait orientation using aspect ratio
    const isLandscape = useMediaQuery('(min-aspect-ratio: 4/3)');

    const { cardGroups, loading, dataReady, error, dataSource, metadata } = useCardData();
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
                        Card data loaded successfully!
                    </Alert>
                </Box>
            )}

            {/* Content */}
            <Box sx={{ 
                display: 'flex', 
                flexGrow: 1, 
                flexDirection: isLandscape ? 'row' : 'column',
                width: '100%',
                gap: isLandscape ? 2 : 0,
                p: isLandscape ? 2 : 0
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
                    isLandscape={isLandscape}
                />

                {(tradeState.haveList.length >= 0 || tradeState.wantList.length >= 0) && (
                    <TradeSummary
                        haveList={tradeState.haveList}
                        wantList={tradeState.wantList}
                        haveTotal={tradeState.haveTotal}
                        wantTotal={tradeState.wantTotal}
                        diff={tradeState.diff}
                        isLandscape={isLandscape}
                        generateShareURL={tradeState.generateShareURL}
                        clearURLTradeData={tradeState.clearURLTradeData}
                        getURLSizeInfo={tradeState.getURLSizeInfo}
                        urlTradeData={tradeState.urlTradeData}
                        hasLoadedFromURL={tradeState.hasLoadedFromURL}
                    />
                )}

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
                    isLandscape={isLandscape}
                />
            </Box>
        </Box>
    );
};

export default Home;
