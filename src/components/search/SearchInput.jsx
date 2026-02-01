import React from 'react';
import { TextField, InputAdornment, IconButton, Box } from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';
import { useSearch } from '../../hooks/useSearch';
import SearchDropdown from './SearchDropdown';
import { useThemeMode } from '../../contexts/ThemeContext.jsx';

/**
 * SearchInput Component
 * Main search interface with input field and dropdown
 */
const SearchInput = ({
  label = 'Search',
  placeholder = 'Type to search...',
  items = [],
  value = '',
  onChange,
  onSelect,
  disabled = false,
  fullWidth = true,
  placement = 'bottom',
  autoFocus = false
}) => {
  const { isDark } = useThemeMode();
  const {
    isOpen,
    highlightedIndex,
    filteredItems,
    inputRef,
    dropdownRef,
    handleFocus,
    handleBlur,
    handleInputChange,
    handleSelect,
    handleKeyDown,
    handleClear,
    setHighlightedIndex
  } = useSearch({
    items,
    onSelect,
    inputValue: value,
    onInputChange: onChange,
    disabled
  });

  return (
    <Box sx={{ position: 'relative', width: fullWidth ? '100%' : 'auto' }}>
      <TextField
        inputRef={inputRef}
        label={label}
        placeholder={placeholder}
        value={value}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        fullWidth={fullWidth}
        autoFocus={autoFocus}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon
                color="action"
                sx={{
                  fontSize: '1.25rem',
                  color: isDark ? 'rgba(212, 165, 116, 0.9)' : 'rgba(93, 58, 26, 0.7)'
                }}
              />
            </InputAdornment>
          ),
          endAdornment: value && !disabled ? (
            <InputAdornment position="end">
              <IconButton
                size="small"
                onClick={handleClear}
                edge="end"
                aria-label="clear search"
                sx={{
                  '&:hover': {
                    backgroundColor: isDark ? 'rgba(212, 165, 116, 0.12)' : 'rgba(0, 0, 0, 0.04)'
                  }
                }}
              >
                <ClearIcon
                  sx={{
                    fontSize: '1.1rem',
                    color: isDark ? 'rgba(212, 165, 116, 0.9)' : 'rgba(93, 58, 26, 0.7)'
                  }}
                />
              </IconButton>
            </InputAdornment>
          ) : null
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            backgroundColor: disabled
              ? (isDark ? 'rgba(26, 15, 10, 0.5)' : 'rgba(0, 0, 0, 0.02)')
              : (isDark ? '#1a0f0a' : '#ffffff'),
            transition: 'all 0.2s ease',
            '&:hover': {
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: disabled
                  ? (isDark ? 'rgba(212, 165, 116, 0.3)' : 'rgba(0, 0, 0, 0.23)')
                  : (isDark ? 'rgba(212, 165, 116, 0.6)' : 'rgba(139, 69, 19, 0.5)')
              }
            },
            '&.Mui-focused': {
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: isDark ? '#d4a574' : '#8b4513',
                borderWidth: '2px'
              }
            }
          },
          '& .MuiOutlinedInput-input': {
            color: isDark ? '#f5f1ed' : '#2c1810',
            '&::placeholder': {
              color: isDark ? 'rgba(212, 165, 116, 0.7)' : 'rgba(93, 58, 26, 0.6)',
              opacity: 1
            }
          },
          '& .MuiInputLabel-root': {
            color: isDark ? 'rgba(212, 165, 116, 0.8)' : 'rgba(93, 58, 26, 0.7)',
            '&.Mui-focused': {
              color: isDark ? '#d4a574' : '#8b4513'
            }
          }
        }}
      />
      
      <SearchDropdown
        key={`search-${value}-${filteredItems.length}`}
        isOpen={isOpen}
        items={filteredItems}
        highlightedIndex={highlightedIndex}
        searchTerm={value}
        onSelect={handleSelect}
        onHighlight={setHighlightedIndex}
        dropdownRef={dropdownRef}
        placement={placement}
      />
    </Box>
  );
};

export default SearchInput;

