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
  TextField,
  Autocomplete,
  Popper,
  Dialog,
  DialogTitle,
  DialogContent,
  AppBar,
  Toolbar,
  useTheme,
  useMediaQuery
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import {formatCurrency} from "../../utils/helpers.js";

// Custom Popper component for upward expansion
const CustomPopper = React.forwardRef((props, ref) => {
  return (
    <Popper
      {...props}
      ref={ref}
      placement="top-start"
      modifiers={[
        {
          name: 'preventOverflow',
          options: {
            boundary: 'viewport',
          },
        },
        {
          name: 'flip',
          options: {
            fallbackPlacements: ['bottom-start'],
          },
        },
      ]}
    />
  );
});

const CardList = ({ 
  cards, 
  onRemoveCard, 
  onUpdateQuantity, 
  isMobile, 
  cardOptions, 
  inputValue, 
  onInputChange, 
  onAddCard, 
  title,
  disabled = false 
}) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [dialogInputValue, setDialogInputValue] = useState('');

  const handleQuantityChange = (cardIndex, newQuantity) => {
    if (onUpdateQuantity) {
      onUpdateQuantity(cardIndex, newQuantity);
    }
  };

  const handleSearchClick = () => {
    if (isSmallScreen) {
      setSearchDialogOpen(true);
      setDialogInputValue(inputValue || '');
    }
  };

  const handleDialogClose = () => {
    setSearchDialogOpen(false);
    setDialogInputValue('');
  };

  const handleDialogAddCard = (cardName) => {
    if (cardName) {
      onAddCard(cardName);
      handleDialogClose();
    }
  };

  // Generate quantity options (1-20)
  const quantityOptions = Array.from({ length: 6 }, (_, i) => i + 1);

  return (
    <List sx={{
      flexGrow: 1,
      overflow: 'auto',
      maxHeight: { xs: '250px', sm: '300px', md: '350px', lg: '400px', xl: '500px' },
      width: '100%',
      p: 0,
      m: 0,
      '& .MuiListItem-root': {
        width: '100%',
        maxWidth: '100%'
      }
    }}>
      {cards.map((card, index) => (
        <ListItem
          key={`${card.name}-${index}`}
          sx={{
            border: '1px solid rgba(139, 69, 19, 0.15)',
            borderRadius: 2,
            mb: 1,
            background: 'linear-gradient(135deg, #ffffff 0%, #fafafa 100%)',
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
              background: 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)',
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
      ))}
      
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
          // Larger screens: Inline autocomplete as before
          <Autocomplete
            freeSolo
            options={cardOptions || []}
            sx={{ 
              width: '100%', 
              transition: 'all 0.3s ease'
            }}
            renderInput={(params) => <TextField {...params} label={"Search for Cards"} disabled={disabled} />}
            inputValue={inputValue || ""}
            onChange={(event, newValue) => {
              // Handle selection from dropdown - add immediately
              if (newValue) {
                // Add the card with the selected value
                onAddCard(newValue);
              }
            }}
            onInputChange={(event, newInputValue) => {
              // Handle typing in the input field
              onInputChange(event, newInputValue);
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
              return filtered.slice(0, 10);
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
            PopperComponent={title === "Cards I Want" ? CustomPopper : undefined}
          />
        )}
      </ListItem>

      {/* Full-screen search dialog for small screens */}
      <Dialog
        fullScreen
        open={searchDialogOpen}
        onClose={handleDialogClose}
        sx={{
          '& .MuiDialog-paper': {
            backgroundColor: '#fafafa'
          }
        }}
      >
        <AppBar 
          position="static" 
          elevation={0}
          sx={{ 
            background: 'linear-gradient(135deg, #8b4513 0%, #5d2f0d 100%)',
            borderBottom: '3px solid #d4a574',
            boxShadow: '0 4px 20px rgba(139, 69, 19, 0.3)'
          }}
        >
          <Toolbar>
            <IconButton
              edge="start"
              color="inherit"
              onClick={handleDialogClose}
              aria-label="close"
              sx={{ mr: 2 }}
            >
              <CloseIcon />
            </IconButton>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Search Cards for {title}
            </Typography>
          </Toolbar>
        </AppBar>
        
        <DialogContent sx={{ p: 2, backgroundColor: '#fafafa' }}>
          <Autocomplete
            freeSolo
            autoFocus
            open={true}
            options={cardOptions || []}
            sx={{ 
              width: '100%',
              mb: 2
            }}
            renderInput={(params) => (
              <TextField 
                {...params} 
                label="Search for Cards" 
                variant="outlined"
                fullWidth
                autoFocus
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'white'
                  }
                }}
              />
            )}
            inputValue={dialogInputValue}
            onChange={(event, newValue) => {
              if (newValue) {
                handleDialogAddCard(newValue);
              }
            }}
            onInputChange={(event, newInputValue) => {
              setDialogInputValue(newInputValue);
            }}
            filterOptions={(options, { inputValue }) => {
              if (!inputValue) {
                return options.slice(0, 10);
              }
              
              const searchTerm = inputValue.toLowerCase();
              const filtered = options.filter((option) => {
                const cardName = option.toLowerCase();
                return cardName.includes(searchTerm);
              });
              
              return filtered.slice(0, 10);
            }}
            getOptionLabel={(option) => {
              return typeof option === 'string' ? option : option.displayName || option.name || '';
            }}
            isOptionEqualToValue={(option, value) => {
              return option === value;
            }}
            selectOnFocus
            clearOnBlur={false}
            handleHomeEndKeys
            autoComplete
            autoHighlight
            blurOnSelect
            ListboxProps={{
              style: {
                maxHeight: 'calc(100vh - 200px)',
                overflow: 'auto'
              }
            }}
          />
          
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Select a card from the dropdown to add it to your list, or type to search for specific cards.
          </Typography>
        </DialogContent>
      </Dialog>
    </List>
  );
};

export default CardList;
