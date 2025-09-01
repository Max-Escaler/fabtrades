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
  totalColor = 'primary'
}) => {
  return (
    <Paper 
      elevation={3} 
      sx={{ 
        width: { xs: '100%', md: 600 },
        minHeight: { xs: '300px', md: 'auto' },
        p: { xs: 1.5, sm: 2 },
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography 
          variant="h6" 
          sx={{ 
            fontSize: { xs: '1.1rem', sm: '1.25rem' }
          }}
        >
          {title}
        </Typography>
        <Chip 
          label={`Total: $${cards.reduce((sum, item) => sum + item.price, 0).toFixed(2)}`}
          color={totalColor}
          size="small"
          sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
        />
      </Box>
      
      {/* Autocomplete Input */}
      <Box sx={{ mb: 2 }}>
        <Autocomplete
          freeSolo
          options={cardOptions}
          sx={{ width: '100%', mb: 1 }}
          renderInput={(params) => <TextField {...params} label="Search Cards" />}
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
        />
        <AddCardButton 
          onClick={onAddCard} 
          color={buttonColor}
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
