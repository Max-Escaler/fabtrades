import React, { useEffect, useRef } from 'react';
import { Paper, Box, Typography } from '@mui/material';
import SearchOption from './SearchOption';

/**
 * SearchDropdown Component
 * Displays filtered search results in a dropdown
 */
const SearchDropdown = ({
  isOpen,
  items = [],
  highlightedIndex,
  searchTerm = '',
  onSelect,
  onHighlight,
  dropdownRef,
  placement = 'bottom'
}) => {
  const highlightedRef = useRef(null);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedRef.current) {
      highlightedRef.current.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }, [highlightedIndex]);

  if (!isOpen) return null;

  return (
    <Paper
      ref={dropdownRef}
      elevation={8}
      sx={{
        position: 'absolute',
        top: placement === 'bottom' ? 'calc(100% + 4px)' : 'auto',
        bottom: placement === 'top' ? 'calc(100% + 4px)' : 'auto',
        left: 0,
        right: 0,
        zIndex: 1300,
        maxHeight: '320px',
        overflowY: 'auto',
        borderRadius: 2,
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
        border: '1px solid rgba(139, 69, 19, 0.2)',
        background: '#ffffff',
        // Custom scrollbar
        '&::-webkit-scrollbar': {
          width: '8px'
        },
        '&::-webkit-scrollbar-track': {
          background: '#f1f1f1',
          borderRadius: '4px'
        },
        '&::-webkit-scrollbar-thumb': {
          background: '#8b4513',
          borderRadius: '4px',
          '&:hover': {
            background: '#6d3410'
          }
        }
      }}
    >
      {items.length === 0 ? (
        <Box sx={{ px: 2, py: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {searchTerm ? 'No cards found' : 'Start typing to search...'}
          </Typography>
        </Box>
      ) : (
        items.map((item, index) => (
          <div
            key={item.value || index}
            ref={index === highlightedIndex ? highlightedRef : null}
          >
            <SearchOption
              option={item}
              isHighlighted={index === highlightedIndex}
              searchTerm={searchTerm}
              onClick={() => onSelect(item)}
              onMouseEnter={() => onHighlight(index)}
            />
          </div>
        ))
      )}
    </Paper>
  );
};

export default SearchDropdown;

