import React, { useState } from 'react';
import {
  List,
  ListItem,
  ListItemText,
  IconButton,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Typography,
  Popover,
  ListItemButton
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';

const CardList = ({ cards, onRemoveCard, onUpdateEdition, onUpdateQuantity, isMobile }) => {
  const [editionAnchorEl, setEditionAnchorEl] = useState(null);
  const [selectedCardIndex, setSelectedCardIndex] = useState(null);

  const handleEditionClick = (event, cardIndex) => {
    setEditionAnchorEl(event.currentTarget);
    setSelectedCardIndex(cardIndex);
  };

  const handleEditionClose = () => {
    setEditionAnchorEl(null);
    setSelectedCardIndex(null);
  };

  const handleEditionChange = (editionName) => {
    if (selectedCardIndex !== null) {
      onUpdateEdition(selectedCardIndex, editionName);
    }
    handleEditionClose();
  };

  const handleQuantityChange = (cardIndex, newQuantity) => {
    if (onUpdateQuantity) {
      onUpdateQuantity(cardIndex, newQuantity);
    }
  };

  const open = Boolean(editionAnchorEl);

  // Generate quantity options (1-20)
  const quantityOptions = Array.from({ length: 20 }, (_, i) => i + 1);

  return (
    <List sx={{
      flexGrow: 1,
      overflow: 'auto',
      maxHeight: { xs: '300px', sm: '350px', md: '400px', lg: '500px', xl: '600px' }
    }}>
      {cards.map((card, index) => (
        <ListItem
          key={`${card.name}-${index}`}
          sx={{
            border: '1px solid #e0e0e0',
            borderRadius: 1,
            mb: 1,
            backgroundColor: '#fafafa',
            flexDirection: 'column',
            alignItems: 'stretch',
            gap: 0.5,
            p: { xs: 1, sm: 1.25, md: 1.5 },
            position: 'relative',
            cursor: 'pointer',
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
          onClick={(event) => handleEditionClick(event, index)}
        >
          {/* Main Card Info Row */}
          <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            width: '100%',
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
                    minWidth: 60,
                    '& .MuiOutlinedInput-root': {
                      fontSize: '0.75rem',
                      height: 28
                    }
                  }}
                  onClick={(event) => event.stopPropagation()}
                >
                  <Select
                    value={card.quantity || 1}
                    onChange={(e) => handleQuantityChange(index, e.target.value)}
                    sx={{
                      fontSize: '0.75rem',
                      '& .MuiSelect-select': {
                        py: 0.5,
                        px: 1
                      }
                    }}
                  >
                    {quantityOptions.map((qty) => (
                      <MenuItem key={qty} value={qty} sx={{ fontSize: '0.75rem' }}>
                        {qty}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Typography
                  variant="body2"
                  sx={{
                    fontSize: { xs: '0.875rem', sm: '1rem' },
                    fontWeight: 'medium',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {card.name}
                </Typography>
                
                {/* Edition Display - Small text next to name */}
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: '0.7rem',
                    color: 'text.secondary',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    flexShrink: 0
                  }}
                >
                  <EditIcon sx={{ fontSize: '0.7rem' }} />
                  {card.selectedEdition || 'No edition'}
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
                label={`$${card.price.toFixed(2)}`}
                color="primary"
                size="small"
                sx={{
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
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
                sx={{
                  color: 'error.main',
                  p: 0.5,
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

      {/* Edition Picker Popover */}
      <Popover
        open={open}
        anchorEl={editionAnchorEl}
        onClose={handleEditionClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        PaperProps={{
          sx: {
            maxHeight: 200,
            minWidth: 200
          }
        }}
      >
        <FormControl fullWidth>
          <InputLabel sx={{ fontSize: '0.875rem' }}>
            Select Edition
          </InputLabel>
          <Select
            value=""
            label="Select Edition"
            onChange={(e) => handleEditionChange(e.target.value)}
            sx={{ fontSize: '0.875rem' }}
          >
            {selectedCardIndex !== null && cards[selectedCardIndex]?.availableEditions?.map((edition) => (
              <MenuItem
                key={`${cards[selectedCardIndex].name}-${edition.subTypeName}-${edition.productId}`}
                value={edition.subTypeName}
                sx={{ fontSize: '0.875rem' }}
              >
                {edition.subTypeName}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Popover>
    </List>
  );
};

export default CardList;
