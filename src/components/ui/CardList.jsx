import React, { useState } from 'react';
import {
  List,
  ListItem,
  IconButton,
  Chip,
  Select,
  MenuItem,
  FormControl,
  Box,
  Typography,
  useTheme,
  useMediaQuery
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import { formatCurrency } from "../../utils/helpers.js";
import { getCardGradient } from "../../utils/searchUtils.js";
import { SearchInput, SearchDialog } from "../search";

// Removed deprecated Autocomplete imports and CustomPopper
// Removed duplicate getCardGradient function - now imported from utils

const CardList = ({ 
  cards, 
  onRemoveCard, 
  onUpdateQuantity, 
  isMobile, 
  cardOptions, 
  allCards = [],
  inputValue, 
  onInputChange, 
  onAddCard, 
  title,
  disabled = false 
}) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);

  const handleQuantityChange = (cardIndex, newQuantity) => {
    if (onUpdateQuantity) {
      onUpdateQuantity(cardIndex, newQuantity);
    }
  };

  const handleSearchClick = () => {
    if (isSmallScreen) {
      setSearchDialogOpen(true);
    }
  };

  const handleDialogClose = () => {
    setSearchDialogOpen(false);
  };

  const handleDialogAddCard = (card) => {
    if (card) {
      onAddCard(card);
    }
  };

  // Generate quantity options (1-20)
  const quantityOptions = Array.from({ length: 6 }, (_, i) => i + 1);

  return (
    <List sx={{
      flexGrow: 1,
      overflow: 'auto',
      width: '100%',
      p: 0,
      m: 0,
      '& .MuiListItem-root': {
        width: '100%',
        maxWidth: '100%'
      }
    }}>
      {cards.map((card, index) => {
        const gradient = getCardGradient(card.subTypeName);
        return (
        <ListItem
          key={`${card.name}-${index}`}
          sx={{
            border: '1px solid rgba(139, 69, 19, 0.15)',
            borderRadius: 2,
            mb: 1,
            background: gradient.background,
            flexDirection: 'column',
            alignItems: 'stretch',
            gap: 0.5,
            p: { xs: 1, sm: 1.25, md: 1.5, lg: 1.75, xl: 2 },
            position: 'relative',
            cursor: 'pointer',
            width: '100%',
            boxShadow: '0 2px 6px rgba(139, 69, 19, 0.08)',
            '&:hover': {
              borderColor: '#8b4513',
              boxShadow: '0 4px 12px rgba(139, 69, 19, 0.15)',
              transform: 'translateY(-1px)',
              background: gradient.backgroundHover,
            },
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              width: '4px',
              height: '100%',
              background: 'linear-gradient(180deg, #8b4513 0%, #d4a574 100%)',
              borderTopLeftRadius: 8,
              borderBottomLeftRadius: 8,
              opacity: 0,
              transition: 'opacity 0.25s ease'
            },
            '&:hover::before': {
              opacity: 1
            }
          }}
        >
          {/* Main Card Info Row */}
                       <Box sx={{
               display: 'flex',
               justifyContent: 'space-between',
               alignItems: 'flex-start',
               width: '100%',
               gap: 1,
               minWidth: 0
             }}>
                         {/* Card Name and Edition Info */}
             <Box sx={{ flexGrow: 1, minWidth: 0, width: '100%' }}>
                             <Box sx={{
                 display: 'flex',
                 alignItems: 'center',
                 gap: 1,
                 mb: 0.5,
                 width: '100%'
               }}>
                {/* Quantity Dropdown */}
                                 <FormControl
                   size="small"
                   sx={{
                     minWidth: { xs: 50, sm: 55, md: 60, lg: 65, xl: 70 },
                     flexShrink: 0,
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
                     whiteSpace: 'nowrap',
                     flex: 1,
                     minWidth: 0,
                     maxWidth: '100%'
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
               flexShrink: 0,
               minWidth: 'fit-content'
             }}>
              {/* Price Chip */}
              <Chip
                label={`${formatCurrency((card.price || 0).toFixed(2))}`}
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
      );
      })}
      
             {/* Search Input at End of List */}
      <ListItem sx={{ 
        border: '2px dashed rgba(139, 69, 19, 0.2)',
        borderRadius: 2,
        mb: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        p: { xs: 1, sm: 1.25, md: 1.5, lg: 1.75, xl: 2 },
        width: '100%',
        transition: 'all 0.25s ease',
        '&:hover': {
          backgroundColor: '#ffffff',
          borderColor: '#8b4513',
          boxShadow: '0 2px 8px rgba(139, 69, 19, 0.1)'
        }
      }}>
        {isSmallScreen ? (
          // Small screen: Clickable search button that opens full-screen dialog
          <Box
            onClick={handleSearchClick}
            sx={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 1.5,
              border: '1px solid #e0e0e0',
              borderRadius: 1,
              backgroundColor: '#f5f5f5',
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: '#e0e0e0'
              },
              transition: 'background-color 0.2s ease'
            }}
          >
            <SearchIcon color="action" />
            <Typography variant="body1" color="text.secondary">
              Search for cards...
            </Typography>
          </Box>
        ) : (
          // Larger screens: Inline search input
          <SearchInput
            label="Search for Cards"
            placeholder="Type to search..."
            items={cardOptions || []}
            value={inputValue || ""}
            onChange={onInputChange}
            onSelect={onAddCard}
            disabled={disabled}
            fullWidth
            placement="bottom"
          />
        )}
      </ListItem>

      {/* Full-screen search dialog for small screens */}
      <SearchDialog
        open={searchDialogOpen}
        onClose={handleDialogClose}
        title={`Search Cards for ${title}`}
        items={cardOptions || []}
        onSelect={handleDialogAddCard}
      />
    </List>
  );
};

export default CardList;
