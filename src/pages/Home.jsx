import { useState, useEffect } from 'react';
import { Box, Typography, useTheme, useMediaQuery } from '@mui/material';
import { useLocation } from 'react-router-dom';
import { useCardData } from "../hooks/useCardData.jsx";
import { useTradeState } from "../hooks/useTradeState.js";
import Header from "../components/elements/Header.jsx";
import CardPanel from "../components/ui/CardPanel.jsx";
import TradeSummary from "../components/elements/TradeSummary.jsx";
import { fetchLastUpdatedTimestamp } from "../services/api.js";
import { useThemeMode } from "../contexts/ThemeContext.jsx";

const Home = () => {
    const location = useLocation();
    const [lastUpdatedTimestamp, setLastUpdatedTimestamp] = useState(null);
    const { isDark } = useThemeMode();

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    
    // Detect landscape vs portrait orientation using aspect ratio
    const isLandscape = useMediaQuery('(min-aspect-ratio: 4/3)');

    const { cardGroups, cardIdLookup, cards, loading, dataReady, error, dataSource, metadata } = useCardData();
    
    // Create unique card options that include all editions
    const cardOptions = cards.map(card => ({
        label: card.displayName,
        value: card._uniqueDisplayId,
        subTypeName: card.subTypeName,
        setName: card._setName || '',
        card: card
    }));

    const tradeState = useTradeState(cardGroups, cardIdLookup);

    // Fetch last updated timestamp
    useEffect(() => {
        const fetchTimestamp = async () => {
            const timestamp = await fetchLastUpdatedTimestamp();
            setLastUpdatedTimestamp(timestamp);
        };
        fetchTimestamp();
    }, []);

    // Load trade from navigation state (when coming from history page)
    useEffect(() => {
        if (location.state?.loadTrade && tradeState.loadTradeFromHistory && dataReady) {
            tradeState.loadTradeFromHistory(location.state.loadTrade);
            // Clear the state to prevent reloading on refresh
            window.history.replaceState({}, document.title);
        }
    }, [location.state?.loadTrade, dataReady]);

    // Background gradients based on theme - FAB brown/cream
    const bgGradient = isDark 
        ? 'linear-gradient(135deg, #0d0806 0%, #1a0f0a 50%, #2c1810 100%)'
        : 'linear-gradient(135deg, #f5f1ed 0%, #e8dfd6 50%, #f0e6dc 100%)';

    if (error) {
        return (
            <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                height: '100vh', 
                alignItems: 'center', 
                justifyContent: 'center',
                background: bgGradient
            }}>
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
        <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: '100vh', 
            width: '100%',
            background: bgGradient,
            backgroundAttachment: 'fixed'
        }}>
            <Header 
                lastUpdatedTimestamp={lastUpdatedTimestamp}
            />

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
                    cardOptions={cardOptions}
                    allCards={cards}
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
                        testURLRoundTrip={tradeState.testURLRoundTrip}
                        urlTradeData={tradeState.urlTradeData}
                        hasLoadedFromURL={tradeState.hasLoadedFromURL}
                        loadTradeFromHistory={tradeState.loadTradeFromHistory}
                    />
                )}

                <CardPanel
                    title="Cards I Want"
                    cards={tradeState.wantList}
                    cardOptions={cardOptions}
                    allCards={cards}
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
