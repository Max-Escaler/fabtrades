import { useState, useEffect } from 'react';
import { useCardData } from './inputs/cardDataProvider.jsx';
import { Box, AppBar, Toolbar, Typography, useTheme, useMediaQuery, CircularProgress, Chip, Alert } from '@mui/material';
import CardPanel from './components/CardPanel';

function App() {
  const [haveInput, setHaveInput] = useState("");
  const [wantInput, setWantInput] = useState("");
  const [haveList, setHaveList] = useState([]);
  const [wantList, setWantList] = useState([]);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));

  const { cardGroups, loading, dataReady, error } = useCardData();
  const cardNames = cardGroups.map(group => group.name);

  // Auto-hide success alert after 3 seconds
  useEffect(() => {
    if (dataReady && !loading) {
      setShowSuccessAlert(true);
      const timer = setTimeout(() => {
        setShowSuccessAlert(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [dataReady, loading]);

  // Get card group data from the loaded card data
  const getCardGroup = (cardName) => {
    return cardGroups.find(group => group.name === cardName) || null;
  };

  const addHaveCard = () => {
    if (haveInput && !haveList.some(item => item.name === haveInput)){
      const cardGroup = getCardGroup(haveInput);
      
      // Debug: Log card data for Arknight Shard
      if (haveInput === 'Arknight Shard') {
        console.log('Adding Arknight Shard:', {
          input: haveInput,
          cardGroup: cardGroup,
          editions: cardGroup?.editions?.map(e => ({ name: e.name, price: e.cardPrice }))
        });
      }
      
      if (cardGroup && cardGroup.editions.length > 0) {
        // Use the first edition as default
        const defaultEdition = cardGroup.editions[0];
        
        const newCard = {
          name: haveInput, 
          price: defaultEdition.cardPrice,
          selectedEdition: defaultEdition.subTypeName,
          cardGroup: cardGroup,
          availableEditions: cardGroup.editions,
          quantity: 1 // Add default quantity
        };
        
        // Debug: Log the new card object
        if (haveInput === 'Arknight Shard') {
          console.log('New card object:', newCard);
          console.log('All editions with prices:', cardGroup.editions.map(e => ({
            name: e.subTypeName,
            cardPrice: e.cardPrice,
            lowPrice: e.lowPrice
          })));
        }
        
        setHaveList([...haveList, newCard]);
        setHaveInput("");
      }
    }
  };

  const addWantCard = () => {
    if (wantInput && !wantList.some(item => item.name === wantInput)) {
      const cardGroup = getCardGroup(wantInput);
      if (cardGroup && cardGroup.editions.length > 0) {
        // Use the first edition as default
        const defaultEdition = cardGroup.editions[0];
        setWantList([...wantList, { 
          name: wantInput, 
          price: defaultEdition.cardPrice,
          selectedEdition: defaultEdition.subTypeName, // Use subTypeName instead of name
          cardGroup: cardGroup,
          availableEditions: cardGroup.editions,
          quantity: 1 // Add default quantity
        }]);
        setWantInput("");
      }
    }
  };

  const removeHaveCard = (index) => {
    setHaveList(haveList.filter((_, i) => i !== index));
  };

  const removeWantCard = (index) => {
    setWantList(wantList.filter((_, i) => i !== index));
  };

  const updateHaveCardEdition = (index, editionName) => {
    const updatedList = [...haveList];
    const card = updatedList[index];
    const selectedEdition = card.availableEditions.find(e => e.subTypeName === editionName);
    
    if (selectedEdition) {
      card.selectedEdition = editionName;
      card.price = selectedEdition.cardPrice;
      setHaveList(updatedList);
    }
  };

  const updateWantCardEdition = (index, editionName) => {
    const updatedList = [...wantList];
    const card = updatedList[index];
    const selectedEdition = card.availableEditions.find(e => e.subTypeName === editionName);
    
    if (selectedEdition) {
      card.selectedEdition = editionName;
      card.price = selectedEdition.cardPrice;
      setWantList(updatedList);
    }
  };

  const updateHaveCardQuantity = (index, newQuantity) => {
    const updatedList = [...haveList];
    updatedList[index].quantity = newQuantity;
    setHaveList(updatedList);
  };

  const updateWantCardQuantity = (index, newQuantity) => {
    const updatedList = [...wantList];
    updatedList[index].quantity = newQuantity;
    setWantList(updatedList);
  };

  const showHaveList = () => {
    console.log(haveList);
  }

  // Calculate total values
  const haveTotal = haveList.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const wantTotal = wantList.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const diff = haveTotal - wantTotal;

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Get value comparison text and color
  const getValueComparison = () => {
    if (diff === 0) {
      return { text: 'Values are equal', color: 'default' };
    } else if (diff > 0) {
      return { text: `Haves are worth ${formatCurrency(Math.abs(diff))} more`, color: 'primary' };
    } else {
      return { text: `Wants are worth ${formatCurrency(Math.abs(diff))} more`, color: 'success' };
    }
  };

  const valueComparison = getValueComparison();

  // No more blocking loading screen - page loads instantly

  // Show error state
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
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh',
      minHeight: '100vh',
      width: '100%'
    }}>
      {/* Header */}
      <AppBar position="static" sx={{ 
        backgroundColor: '#000000',
        flexShrink: 0
      }}>
        <Toolbar sx={{ 
          px: { xs: 1, sm: 2, md: 3, lg: 4, xl: 5 },
          py: { xs: 1, sm: 1.5, md: 2 }
        }}>
          <Typography 
            variant="h4" 
            component="div" 
            sx={{ 
              flexGrow: 1, 
              fontWeight: 'bold',
              fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem', lg: '2.5rem', xl: '3rem' }
            }}
          >
            FAB Trades
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Loading Alert - Shows while data is loading in background */}
      {loading && !dataReady && (
        <Box sx={{ px: { xs: 1, sm: 2, md: 3 }, py: 1 }}>
          <Alert 
            severity="info" 
            icon={<CircularProgress size={20} />}
            sx={{ 
              '& .MuiAlert-message': { 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1 
              } 
            }}
          >
            Loading card data in the background... You can start adding cards once data is ready.
          </Alert>
        </Box>
      )}

      {/* Data Ready Alert - Shows briefly when data is fully loaded */}
      {showSuccessAlert && dataReady && !loading && (
        <Box sx={{ px: { xs: 1, sm: 2, md: 3 }, py: 1 }}>
          <Alert 
            severity="success" 
            sx={{ 
              '& .MuiAlert-message': { 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1 
              } 
            }}
          >
            Card data loaded successfully! You can now search and add cards.
          </Alert>
        </Box>
      )}



      {/* Main Content */}
      <Box sx={{ 
        display: 'flex', 
        flexGrow: 1, 
        p: 0,
        flexDirection: 'column',
        gap: 0,
        transition: 'all 0.3s ease-in-out',
        minHeight: 0, // Important for flexbox to work properly
        alignItems: 'stretch',
        width: { xs: 500, sm: 800, md: 1100, lg: 1300, xl: 2000 },
        height: '100%'
      }}>
        {/* Top Panel - Cards I Have */}
        <CardPanel
          title="Cards I Have"
          cards={haveList}
          cardOptions={cardNames}
          inputValue={haveInput}
          onInputChange={(event, newValue) => {
            // Handle both onChange and onInputChange events
            if (newValue !== null && newValue !== undefined) {
              setHaveInput(newValue);
            }
          }}
          onAddCard={addHaveCard}
          onRemoveCard={removeHaveCard}
          onUpdateEdition={updateHaveCardEdition}
          onUpdateQuantity={updateHaveCardQuantity}
          isMobile={isMobile}
          buttonColor="#1976d2"
          totalColor="primary"
          disabled={!dataReady} // Disable until data is ready
        />

        {/* Trade Summary Section - Middle */}
        {(haveList.length > 0 || wantList.length > 0) && (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            gap: 0,
            p: { xs: 1, sm: 1.5, md: 2 },
            backgroundColor: '#f8f9fa',
            borderTop: '1px solid #e9ecef',
            borderBottom: '1px solid #e9ecef'
          }}>
            {/* My Cards Summary */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              px: 1,
              py: 1
            }}>
              <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
                My {haveList.length} cards
              </Typography>
              <Chip
                label={`$${haveTotal.toFixed(2)}`}
                color="primary"
                variant="filled"
                sx={{ fontWeight: 'bold' }}
              />
            </Box>

            {/* Trade Differential */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              px: 1,
              py: 1,
              backgroundColor: 'white',
              borderTop: '1px solid #dee2e6',
              borderBottom: '1px solid #dee2e6'
            }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                Current Value
              </Typography>
              <Chip
                label={diff > 0 ? `+$${diff.toFixed(2)}` : `$${diff.toFixed(2)}`}
                color={diff > 0 ? 'primary' : diff < 0 ? 'success' : 'default'}
                variant="filled"
                sx={{ 
                  fontWeight: 'bold',
                  fontSize: '1.1rem'
                }}
              />
            </Box>

            {/* Their Cards Summary */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              px: 1,
              py: 1
            }}>
              <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
                Their {wantList.length} cards
              </Typography>
              <Chip
                label={`$${wantTotal.toFixed(2)}`}
                color="success"
                variant="filled"
                sx={{ fontWeight: 'bold' }}
              />
            </Box>
          </Box>
        )}

        {/* Bottom Panel - Cards I Want */}
        <CardPanel
          title="Cards I Want"
          cards={wantList}
          cardOptions={cardNames}
          inputValue={wantInput}
          onInputChange={(event, newValue) => {
            // Handle both onChange and onInputChange events
            if (newValue !== null && newValue !== undefined) {
              setWantInput(newValue);
            }
          }}
          onAddCard={addWantCard}
          onRemoveCard={removeWantCard}
          onUpdateEdition={updateWantCardEdition}
          onUpdateQuantity={updateWantCardQuantity}
          isMobile={isMobile}
          buttonColor="#2e7d32"
          totalColor="success"
          disabled={!dataReady} // Disable until data is ready
        />
      </Box>
    </Box>
  )
}

export default App
