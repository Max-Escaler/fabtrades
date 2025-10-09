import { useState, useEffect, useRef, useCallback } from 'react';
import { filterCardOptions } from '../utils/searchUtils';

/**
 * Custom hook for managing search state and behavior
 * @param {Object} options - Configuration options
 * @param {Array} options.items - Array of items to search through
 * @param {Function} options.onSelect - Callback when item is selected
 * @param {string} options.inputValue - Controlled input value
 * @param {Function} options.onInputChange - Callback when input changes
 * @param {boolean} options.disabled - Whether search is disabled
 * @returns {Object} Search state and handlers
 */
export const useSearch = ({
  items = [],
  onSelect,
  inputValue = '',
  onInputChange,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [filteredItems, setFilteredItems] = useState([]);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Filter items when input changes
  useEffect(() => {
    const filtered = filterCardOptions(items, inputValue, 10);
    setFilteredItems(filtered);
    setHighlightedIndex(-1);
  }, [inputValue, items]);

  // Handle input focus
  const handleFocus = useCallback(() => {
    if (!disabled) {
      setIsOpen(true);
    }
  }, [disabled]);

  // Handle input blur
  const handleBlur = useCallback((event) => {
    // Delay to allow click events on dropdown items
    setTimeout(() => {
      if (dropdownRef.current && !dropdownRef.current.contains(document.activeElement)) {
        setIsOpen(false);
      }
    }, 150);
  }, []);

  // Handle input change
  const handleInputChange = useCallback((event) => {
    const value = event.target.value;
    onInputChange?.(event, value);
    if (!isOpen && value) {
      setIsOpen(true);
    }
  }, [onInputChange, isOpen]);

  // Handle item selection
  const handleSelect = useCallback((item) => {
    onSelect?.(item);
    setIsOpen(false);
    setHighlightedIndex(-1);
    // Clear input through the callback
    onInputChange?.(null, '');
  }, [onSelect, onInputChange]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event) => {
    if (disabled) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setIsOpen(true);
        setHighlightedIndex(prev => 
          Math.min(prev + 1, filteredItems.length - 1)
        );
        break;

      case 'ArrowUp':
        event.preventDefault();
        setHighlightedIndex(prev => Math.max(prev - 1, -1));
        break;

      case 'Enter':
        event.preventDefault();
        if (highlightedIndex >= 0 && filteredItems[highlightedIndex]) {
          handleSelect(filteredItems[highlightedIndex]);
        } else if (filteredItems.length === 1) {
          // If only one result, select it
          handleSelect(filteredItems[0]);
        }
        break;

      case 'Escape':
        event.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;

      case 'Tab':
        setIsOpen(false);
        break;

      default:
        if (!isOpen) {
          setIsOpen(true);
        }
        break;
    }
  }, [disabled, highlightedIndex, filteredItems, handleSelect, isOpen]);

  // Handle clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clear button handler
  const handleClear = useCallback((event) => {
    event.stopPropagation();
    onInputChange?.(null, '');
    inputRef.current?.focus();
    setIsOpen(true);
  }, [onInputChange]);

  return {
    // State
    isOpen,
    highlightedIndex,
    filteredItems,
    
    // Refs
    inputRef,
    dropdownRef,
    
    // Handlers
    handleFocus,
    handleBlur,
    handleInputChange,
    handleSelect,
    handleKeyDown,
    handleClear,
    
    // Control functions
    setIsOpen,
    setHighlightedIndex
  };
};

