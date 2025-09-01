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

  const addHaveCard = (cardName = null) => {
    const cardToAdd = cardName || haveInput;
    if (cardToAdd && !haveList.some(item => item.name === cardToAdd)){
      const cardGroup = getCardGroup(cardToAdd);
      
      if (cardGroup && cardGroup.editions.length > 0) {
        // Use the first edition as default
        const defaultEdition = cardGroup.editions[0];
        
        const newCard = {
          name: cardToAdd, 
          price: defaultEdition.cardPrice,
          cardGroup: cardGroup,
          availableEditions: cardGroup.editions,
          quantity: 1 // Add default quantity
        };
        
        setHaveList([...haveList, newCard]);
        setHaveInput("");
      }
    }
  };

  const addWantCard = (cardName = null) => {
    const cardToAdd = cardName || wantInput;
    if (cardToAdd && !wantList.some(item => item.name === cardToAdd)) {
      const cardGroup = getCardGroup(cardToAdd);
      if (cardGroup && cardGroup.editions.length > 0) {
        // Use the first edition as default
        const defaultEdition = cardGroup.editions[0];
        setWantList([...wantList, { 
          name: cardToAdd, 
          price: defaultEdition.cardPrice,
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
      width: '98%'
    }}>
      {/* Header */}
      <AppBar position="static" sx={{ 
        backgroundColor: '#000000',
        flexShrink: 0,
        width: '98%'
      }}>
        <Toolbar sx={{ 
          px: { xs: 1, sm: 2, md: 3, lg: 4, xl: 5 },
          py: { xs: 0.75, sm: 1, md: 1.5, lg: 2, xl: 2.5 },
          width: '98%'
        }}>
          <Typography 
            variant="h4" 
            component="div" 
            sx={{ 
              flexGrow: 1, 
              fontWeight: 'bold',
              fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem', lg: '2rem', xl: '2.5rem' }
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
        width: '98%',
        maxWidth: '98vw',
        height: '100%'
      }}>
        {/* Top Panel - Cards I Have */}
        <CardPanel
          title="Cards I Have"
          cards={haveList}
          cardOptions={cardNames}
          inputValue={haveInput}
          onInputChange={(event, newValue) => {
            // Handle typing in the input field
            setHaveInput(newValue || "");
          }}
          onAddCard={addHaveCard}
          onRemoveCard={removeHaveCard}
          onUpdateQuantity={updateHaveCardQuantity}
          isMobile={isMobile}
          totalColor="primary"
          disabled={!dataReady} // Disable until data is ready
        />

        {/* Trade Summary Section - Middle */}
        {(haveList.length > 0 || wantList.length > 0) && (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            gap: 0,
            p: { xs: 0.25, sm: 0.5, md: 0.75, lg: 1, xl: 1.25 },
            backgroundColor: '#f8f9fa',
            borderTop: '1px solid #e9ecef',
            borderBottom: '1px solid #e9ecef',
            width: '98%'
          }}>
            {/* My Cards Summary */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              px: { xs: 0.5, sm: 0.75, md: 1, lg: 1.25, xl: 1.5 },
              py: { xs: 0.25, sm: 0.5, md: 0.75, lg: 1, xl: 1.25 },
              width: '100%'
            }}>
              <Typography variant="h6" sx={{ 
                fontWeight: 'medium', 
                color: 'black',
                fontSize: { xs: '0.8rem', sm: '0.9rem', md: '1rem', lg: '1.125rem', xl: '1.25rem' }
              }}>
                My {haveList.length} cards
              </Typography>
              <Chip
                label={`$${haveTotal.toFixed(2)}`}
                color="primary"
                variant="filled"
                sx={{ 
                  fontWeight: 'bold',
                  fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.9rem', lg: '1rem', xl: '1.125rem' }
                }}
              />
            </Box>

            {/* Trade Differential */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              px: { xs: 0.5},
              py: { xs: 0.25},
              backgroundColor: 'white',
              borderTop: '1px solid #dee2e6',
              borderBottom: '1px solid #dee2e6',
              width: '100%'
            }}>
              <Typography variant="h6" sx={{ 
                fontWeight: 'bold', 
                color: 'black',
                fontSize: { xs: '0.8rem' }
              }}>
                Trade Differential
              </Typography>
              <Chip
                label={diff > 0 ? `+$${diff.toFixed(2)}` : `$${diff.toFixed(2)}`}
                color={diff > 0 ? 'primary' : diff < 0 ? 'success' : 'default'}
                variant="filled"
                sx={{ 
                  px: { xs: 0.1},
                  py: { xs: 0.25},
                  fontWeight: 'bold',
                  fontSize: { xs: '0.7rem'}
                 
                }}
              />
            </Box>

            {/* Their Cards Summary */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              px: { xs: 0.5, sm: 0.75, md: 1, lg: 1.25, xl: 1.5 },
              py: { xs: 0.25, sm: 0.5, md: 0.75, lg: 1, xl: 1.25 },
              width: '100%'
            }}>
              <Typography variant="h6" sx={{ 
                fontWeight: 'medium', 
                color: 'black',
                fontSize: { xs: '0.8rem', sm: '0.9rem', md: '1rem', lg: '1.125rem', xl: '1.25rem' }
              }}>
                Their {wantList.length} cards
              </Typography>
              <Chip
                label={`$${wantTotal.toFixed(2)}`}
                color="success"
                variant="filled"
                sx={{ 
                  fontWeight: 'bold',
                  fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.9rem', lg: '1rem', xl: '1.125rem' }
                }}
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
            // Handle typing in the input field
            setWantInput(newValue || "");
          }}
          onAddCard={addWantCard}
          onRemoveCard={removeWantCard}
          onUpdateQuantity={updateWantCardQuantity}
          isMobile={isMobile}
          totalColor="success"
          disabled={!dataReady} // Disable until data is ready
        />
      </Box>
    </Box>
  )
}

export default App
