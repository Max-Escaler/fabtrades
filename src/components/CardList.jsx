import React from 'react';
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
  Box
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

const CardList = ({ cards, onRemoveCard, onUpdateEdition, isMobile }) => {
  return (
    <List sx={{
      flexGrow: 1,
      overflow: 'auto',
      maxHeight: { xs: '300px', md: '400px' }
    }}>
      {cards.map((card, index) => (
        <ListItem
          key={`${card.name}-${index}`}
          sx={{
            border: '1px solid #e0e0e0',
            borderRadius: 1,
            mb: 1,
            backgroundColor: '#fafafa',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' },
            gap: 1
          }}
        >
          <Box sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' },
            gap: 1,
            width: '100%'
          }}>
            {/* Card Name */}
            <ListItemText
              primary={card.name}
              sx={{
                flexGrow: 1,
                minWidth: 0,
                '& .MuiListItemText-primary': {
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  fontWeight: 'medium',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }
              }}
            />

            {/* Edition Picker */}
            <FormControl
              size="small"
              sx={{
                minWidth: { xs: '100%', sm: 120 },
                maxWidth: { xs: '100%', sm: 150 }
              }}
            >
              <InputLabel
                sx={{
                  fontSize: { xs: '0.75rem', sm: '0.875rem' }
                }}
              >
                Edition
              </InputLabel>
              <Select
                value={card.selectedEdition || ''}
                label="Edition"
                onChange={(e) => onUpdateEdition(index, e.target.value)}
                sx={{
                  fontSize: { xs: '0.75rem', sm: '0.875rem' }
                }}
              >
                {card.availableEditions?.map((edition) => {
                  // Debug: Log what's in the availableEditions array
                  if (card.name === 'Arknight Shard') {
                    console.log('Available edition:', edition);
                    console.log('this edition is', edition.subTypeName );
                  }
                  
                  return (
                    <MenuItem
                      key={`${card.name}-${edition.subTypeName}-${edition.productId}`}
                      value={edition.subTypeName}
                      sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                    >
                      {edition.subTypeName}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>

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
          </Box>

          {/* Delete Button */}
          <IconButton
            onClick={() => onRemoveCard(index)}
            size="small"
            sx={{
              color: 'error.main',
              alignSelf: { xs: 'flex-end', sm: 'center' }
            }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </ListItem>
      ))}
    </List>
  );
};

export default CardList;
