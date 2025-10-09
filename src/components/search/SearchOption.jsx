import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { getCardGradient, highlightMatch } from '../../utils/searchUtils';

/**
 * SearchOption Component
 * Renders an individual search result option with foil gradient support
 */
const SearchOption = ({ 
  option, 
  isHighlighted = false,
  searchTerm = '',
  onClick,
  onMouseEnter
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const gradient = getCardGradient(option.subTypeName);
  const textSegments = highlightMatch(option.label, searchTerm);

  const handleMouseEnter = () => {
    setIsHovered(true);
    onMouseEnter?.();
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <Box
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      sx={{
        px: 2,
        py: 1.5,
        cursor: 'pointer',
        background: (isHighlighted || isHovered) ? gradient.backgroundHover : gradient.background,
        transition: 'all 0.2s ease',
        borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
        '&:last-child': {
          borderBottom: 'none'
        },
        '&:hover': {
          background: gradient.backgroundHover
        }
      }}
    >
      <Typography
        variant="body2"
        sx={{
          fontSize: { xs: '0.875rem', sm: '0.9rem' },
          fontWeight: isHighlighted || isHovered ? 500 : 400,
          color: '#2c1810'
        }}
      >
        {textSegments.map((segment, index) => (
          <span
            key={index}
            style={{
              fontWeight: segment.highlight ? 700 : 'inherit',
              backgroundColor: segment.highlight ? 'rgba(139, 69, 19, 0.15)' : 'transparent',
              padding: segment.highlight ? '2px 4px' : '0',
              borderRadius: segment.highlight ? '3px' : '0'
            }}
          >
            {segment.text}
          </span>
        ))}
      </Typography>
    </Box>
  );
};

export default SearchOption;

