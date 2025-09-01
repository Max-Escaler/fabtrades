import React from 'react';
import {
  List,
  ListItem,
  IconButton,
  Chip,
  Select,
  MenuItem,
  FormControl,
  Box,
  Typography
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

const CardList = ({ cards, onRemoveCard, onUpdateQuantity, isMobile }) => {

  const handleQuantityChange = (cardIndex, newQuantity) => {
    if (onUpdateQuantity) {
      onUpdateQuantity(cardIndex, newQuantity);
    }
  };

  // Generate quantity options (1-20)
  const quantityOptions = Array.from({ length: 20 }, (_, i) => i + 1);

  return (
    <List sx={{
      flexGrow: 1,
      overflow: 'auto',
      maxHeight: { xs: '250px', sm: '300px', md: '350px', lg: '400px', xl: '500px' },
      width: '98%'
    }}>
      {cards.map((card, index) => (
        <ListItem
          key={`${card.name}-${index}`}
          sx={{
            border: '1px solid #e0e0e0',
            borderRadius: 1,
            mb: 0.75,
            backgroundColor: '#fafafa',
            flexDirection: 'column',
            alignItems: 'stretch',
            gap: 0.5,
            p: { xs: 0.75, sm: 1, md: 1.25, lg: 1.5, xl: 1.75 },
            position: 'relative',
            cursor: 'pointer',
            width: '98%',
            '&:hover': {
              backgroundColor: '#f5f5f5',
              borderColor: '#d0d0d0',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            },
            transition: 'all 0.2s ease',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: 1,
              pointerEvents: 'none',
              transition: 'opacity 0.2s ease'
            },
            '&:hover::before': {
              opacity: 0.05,
              backgroundColor: 'primary.main'
            }
          }}
        >
          {/* Main Card Info Row */}
          <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            width: '98%',
            gap: 1
          }}>
            {/* Card Name and Edition Info */}
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                mb: 0.5
              }}>
                {/* Quantity Dropdown */}
                <FormControl
                  size="small"
                  sx={{
                    minWidth: { xs: 50, sm: 55, md: 60, lg: 65, xl: 70 },
                    '& .MuiOutlinedInput-root': {
                      fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.8rem', lg: '0.85rem', xl: '0.9rem' },
                      height: { xs: 26, sm: 28, md: 30, lg: 32, xl: 34 }
                    }
                  }}
                  onClick={(event) => event.stopPropagation()}
                >
                  <Select
                    value={card.quantity || 1}
                    onChange={(e) => handleQuantityChange(index, e.target.value)}
                    sx={{
                      fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.8rem', lg: '0.85rem', xl: '0.9rem' },
                      '& .MuiSelect-select': {
                        py: { xs: 0.25, sm: 0.5, md: 0.75, lg: 1, xl: 1.25 },
                        px: { xs: 0.75, sm: 1, md: 1.25, lg: 1.5, xl: 1.75 }
                      }
                    }}
                  >
                    {quantityOptions.map((qty) => (
                      <MenuItem key={qty} value={qty} sx={{ 
                        fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.8rem', lg: '0.85rem', xl: '0.9rem' }
                      }}>
                        {qty}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Typography
                  variant="body2"
                  sx={{
                    fontSize: { xs: '0.8rem', sm: '0.875rem', md: '0.95rem', lg: '1rem', xl: '1.125rem' },
                    fontWeight: 'medium',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {card.name}
                </Typography>
              </Box>
            </Box>

            {/* Price and Delete Button */}
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              flexShrink: 0
            }}>
              {/* Price Chip */}
              <Chip
                label={`$${(card.price || 0).toFixed(2)}`}
                color="primary"
                size="small"
                sx={{
                  fontSize: { xs: '0.65rem', sm: '0.7rem', md: '0.75rem', lg: '0.8rem', xl: '0.875rem' },
                  minWidth: 'fit-content'
                }}
              />

              {/* Delete Button */}
              <IconButton
                onClick={(event) => {
                  event.stopPropagation(); // Prevent triggering the edition popup
                  onRemoveCard(index);
                }}
                size="small"
                aria-label={`Delete ${card.name || 'card'}`}
                sx={{
                  color: 'error.main',
                  p: { xs: 0.25, sm: 0.5, md: 0.75, lg: 1, xl: 1.25 },
                  '&:hover': {
                    backgroundColor: 'rgba(244, 67, 54, 0.1)'
                  }
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>


        </ListItem>
      ))}
    </List>
  );
};

export default CardList;
