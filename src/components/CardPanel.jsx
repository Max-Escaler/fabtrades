import React from 'react';
import { Box, Paper, Typography, Chip } from '@mui/material';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import AddCardButton from './AddCardButton';
import CardList from './CardList';

const CardPanel = ({ 
  title, 
  cards, 
  cardOptions, 
  inputValue, 
  onInputChange, 
  onAddCard, 
  onRemoveCard, 
  onUpdateEdition,
  isMobile, 
  buttonColor = '#1976d2',
  totalColor = 'primary',
  disabled = false
}) => {
  return (
    <Paper 
      elevation={3} 
      sx={{ 
        flex: 1,
        minWidth: { xs: '100%', sm: '280px', md: '320px', lg: '400px', xl: '500px' },
        maxWidth: { xs: '100%', lg: 'none' },
        minHeight: { xs: '300px', sm: '350px', md: '400px', lg: '500px', xl: '600px' },
        p: { xs: 1.5, sm: 2, md: 2.5, lg: 3, xl: 4 },
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          elevation: 4,
          transform: 'translateY(-2px)'
        }
      }}
    >
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: { xs: 1.5, sm: 2, md: 2.5, lg: 3, xl: 4 },
        transition: 'all 0.3s ease'
      }}>
        <Typography 
          variant="h6" 
          sx={{ 
            fontSize: { xs: '1.1rem', sm: '1.25rem', md: '1.375rem', lg: '1.5rem', xl: '1.75rem' },
            transition: 'font-size 0.3s ease'
          }}
        >
          {title}
        </Typography>
        <Chip 
          label={`Total: $${cards.reduce((sum, item) => sum + item.price, 0).toFixed(2)}`}
          color={totalColor}
          size="small"
          sx={{ 
            fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem', lg: '1.125rem' },
            transition: 'all 0.3s ease'
          }}
        />
      </Box>
      
      {/* Autocomplete Input */}
      <Box sx={{ 
        mb: { xs: 1.5, sm: 2, md: 2.5, lg: 3, xl: 4 }, 
        transition: 'all 0.3s ease' 
      }}>
        <Autocomplete
          freeSolo
          options={cardOptions}
          sx={{ 
            width: '100%', 
            mb: { xs: 1, sm: 1.5, md: 2, lg: 2.5 },
            transition: 'all 0.3s ease'
          }}
          renderInput={(params) => <TextField {...params} label="Search Cards" disabled={disabled} />}
          value={inputValue}
          onChange={(event, newValue) => {
            // Handle selection from dropdown
            if (newValue) {
              onInputChange(event, newValue);
            }
          }}
          onInputChange={(event, newInputValue) => {
            // Handle typing in the input field
            if (event && event.type === 'change') {
              onInputChange(event, newInputValue);
            }
          }}
          filterOptions={(options, { inputValue }) => {
            // Custom filtering logic
            if (!inputValue) {
              return options.slice(0, 20); // Show first 20 options when no input
            }
            
            const searchTerm = inputValue.toLowerCase();
            const filtered = options.filter((option) => {
              const cardName = option.toLowerCase();
              return cardName.includes(searchTerm);
            });
            
            // Limit results to improve performance
            return filtered.slice(0, 50);
          }}
          getOptionLabel={(option) => {
            // Handle both string and object options
            return typeof option === 'string' ? option : option.displayName || option.name || '';
          }}
          isOptionEqualToValue={(option, value) => {
            // Compare options properly
            return option === value;
          }}
          selectOnFocus
          clearOnBlur={false}
          handleHomeEndKeys
          autoComplete
          autoHighlight
          blurOnSelect
          openOnFocus
          disableClearable={false}
          disabled={disabled}
        />
        <AddCardButton 
          onClick={onAddCard} 
          color={buttonColor}
          disabled={disabled}
        />
      </Box>

      {/* List of Added Cards */}
      <CardList 
        cards={cards}
        onRemoveCard={onRemoveCard}
        onUpdateEdition={onUpdateEdition}
        isMobile={isMobile}
      />
    </Paper>
  );
};

export default CardPanel;
