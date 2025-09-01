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
  onUpdateQuantity,
  isMobile, 
  buttonColor = '#1976d2',
  totalColor = 'primary',
  disabled = false
}) => {
  return (
    <Paper 
      elevation={1}
      sx={{ 
        flex: 1,
        width: '98%',
        maxWidth: '98%',
        minHeight: { xs: '250px', sm: '300px', md: '350px', lg: '400px', xl: '450px' },
        p: { xs: 1, sm: 1.5, md: 2, lg: 2.5, xl: 3 },
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        borderRadius: 0,
        border: '1px solid #e0e0e0',
        borderTop: '1px solid #e0e0e0',
        '&:hover': {
          backgroundColor: '#fafafa',
          elevation: 2
        }
      }}
    >
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: { xs: 1, sm: 1.5, md: 2, lg: 2.5, xl: 3 },
        transition: 'all 0.3s ease',
        width: '100%'
      }}>
        <Typography 
          variant="h6" 
          sx={{ 
            fontSize: { xs: '1rem', sm: '1.125rem', md: '1.25rem', lg: '1.375rem', xl: '1.5rem' },
            transition: 'font-size 0.3s ease'
          }}
        >
          {title}
        </Typography>
      </Box>
      
      {/* Autocomplete Input */}
      <Box sx={{ 
        mb: { xs: 1, sm: 1.5, md: 2, lg: 2.5, xl: 3 }, 
        transition: 'all 0.3s ease',
        width: '100%'
      }}>
        <Autocomplete
          freeSolo
          options={cardOptions}
          sx={{ 
            width: '100%', 
            mb: { xs: 0.75, sm: 1, md: 1.5, lg: 2, xl: 2.5 },
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
        onUpdateQuantity={onUpdateQuantity}
        isMobile={isMobile}
      />
    </Paper>
  );
};

export default CardPanel;
