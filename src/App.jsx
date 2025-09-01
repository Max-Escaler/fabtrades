import { useState } from 'react';
import { useCardData } from './inputs/cardDataProvider.jsx';
import { Box, AppBar, Toolbar, Typography, useTheme, useMediaQuery, CircularProgress, Chip } from '@mui/material';
import CardPanel from './components/CardPanel';

function App() {
  const [haveInput, setHaveInput] = useState("");
  const [wantInput, setWantInput] = useState("");
  const [haveList, setHaveList] = useState([]);
  const [wantList, setWantList] = useState([]);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));

  const { cardGroups, loading, error } = useCardData();
  const cardNames = cardGroups.map(group => group.name);

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
          availableEditions: cardGroup.editions
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
          availableEditions: cardGroup.editions
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

  const showHaveList = () => {
    console.log(haveList);
  }

  // Calculate total values
  const haveTotal = haveList.reduce((sum, item) => sum + item.price, 0);
  const wantTotal = wantList.reduce((sum, item) => sum + item.price, 0);

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

  // Show loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading Flesh and Blood card data...
        </Typography>
      </Box>
    );
  }

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
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <AppBar position="static" sx={{ backgroundColor: '#000000' }}>
        <Toolbar sx={{ 
          px: { xs: 1, sm: 2, md: 3 },
          py: { xs: 1, sm: 1.5 }
        }}>
          <Typography 
            variant="h4" 
            component="div" 
            sx={{ 
              flexGrow: 1, 
              fontWeight: 'bold',
              fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' }
            }}
          >
            FAB Trades
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Value Comparison Chip */}
      {(haveList.length > 0 || wantList.length > 0) && (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          py: 2,
          px: { xs: 1, sm: 2, md: 3 }
        }}>
          <Chip
            label={valueComparison.text}
            color={valueComparison.color}
            variant="filled"
            sx={{
              fontSize: { xs: '0.875rem', sm: '1rem' },
              fontWeight: 'medium',
              px: 2,
              py: 1
            }}
          />
        </Box>
      )}

      {/* Main Content */}
      <Box sx={{ 
        display: 'flex', 
        flexGrow: 1, 
        p: { xs: 1, sm: 2, md: 3 },
        flexDirection: { xs: 'column', md: 'row' },
        gap: { xs: 2, sm: 3 }
      }}>
        {/* Left Panel */}
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
          isMobile={isMobile}
          buttonColor="#1976d2"
          totalColor="primary"
        />

        {/* Right Panel */}
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
          isMobile={isMobile}
          buttonColor="#2e7d32"
          totalColor="success"
        />
      </Box>
    </Box>
  )
}

export default App
