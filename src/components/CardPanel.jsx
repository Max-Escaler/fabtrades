import React from 'react';
import { Box, Paper, Typography, Chip } from '@mui/material';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
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
      
      {/* List of Added Cards with Search Input */}
      <CardList 
        cards={cards}
        onRemoveCard={onRemoveCard}
        onUpdateQuantity={onUpdateQuantity}
        isMobile={isMobile}
        cardOptions={cardOptions}
        inputValue={inputValue}
        onInputChange={onInputChange}
        onAddCard={onAddCard}
        title={title}
        disabled={disabled}
      />
    </Paper>
  );
};

export default CardPanel;
