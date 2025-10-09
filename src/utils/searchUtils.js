/**
 * Search Utilities
 * Helper functions for card searching and filtering
 */

/**
 * Filter card options based on search input
 * @param {Array} options - Array of card option objects
 * @param {string} searchTerm - Search string
 * @param {number} limit - Maximum number of results to return
 * @returns {Array} Filtered options
 */
export const filterCardOptions = (options, searchTerm, limit = 10) => {
  if (!searchTerm || searchTerm.trim() === '') {
    return options.slice(0, Math.min(limit, 20));
  }

  const term = searchTerm.toLowerCase().trim();
  
  // Filter options that contain the search term
  const filtered = options.filter(option => {
    const label = option.label?.toLowerCase() || '';
    return label.includes(term);
  });

  // Sort with priority: exact match > starts with > contains
  const sorted = filtered.sort((a, b) => {
    const aLabel = a.label?.toLowerCase() || '';
    const bLabel = b.label?.toLowerCase() || '';
    
    // Check for exact match
    const aExact = aLabel === term;
    const bExact = bLabel === term;
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;
    
    // Check for starts with
    const aStarts = aLabel.startsWith(term);
    const bStarts = bLabel.startsWith(term);
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;
    
    // Both contain but don't start with - sort alphabetically
    return aLabel.localeCompare(bLabel);
  });

  return sorted.slice(0, limit);
};

/**
 * Highlight matching text in a string
 * @param {string} text - Original text
 * @param {string} searchTerm - Term to highlight
 * @returns {Array} Array of text segments with highlight flags
 */
export const highlightMatch = (text, searchTerm) => {
  if (!searchTerm || !text) {
    return [{ text, highlight: false }];
  }

  const term = searchTerm.toLowerCase();
  const lowerText = text.toLowerCase();
  const index = lowerText.indexOf(term);

  if (index === -1) {
    return [{ text, highlight: false }];
  }

  const segments = [];
  
  if (index > 0) {
    segments.push({ text: text.slice(0, index), highlight: false });
  }
  
  segments.push({ 
    text: text.slice(index, index + searchTerm.length), 
    highlight: true 
  });
  
  if (index + searchTerm.length < text.length) {
    segments.push({ 
      text: text.slice(index + searchTerm.length), 
      highlight: false 
    });
  }

  return segments;
};

/**
 * Get gradient style based on card foil type
 * @param {string} subTypeName - Card's subTypeName field
 * @returns {Object} Object with background and backgroundHover properties
 */
export const getCardGradient = (subTypeName) => {
  const subType = (subTypeName || '').toLowerCase();
  
  // Rainbow Foil - vibrant rainbow gradient
  if (subType.includes('rainbow foil')) {
    return {
      background: 'linear-gradient(135deg, #ffe5e5 0%, #fff4e5 14%, #fffee5 28%, #e5ffe5 42%, #e5f4ff 57%, #f0e5ff 71%, #ffe5f0 85%, #ffe5e5 100%)',
      backgroundHover: 'linear-gradient(135deg, #ffd0d0 0%, #ffe8c0 14%, #fffdc0 28%, #d0ffd0 42%, #c0e8ff 57%, #e0c0ff 71%, #ffc0e0 85%, #ffd0d0 100%)'
    };
  } 
  // Cold Foil - blue/silver metallic gradient (more pronounced)
  else if (subType.includes('cold foil')) {
    return {
      background: 'linear-gradient(135deg, #4da6ff 0%, #ffffff 20%, #3399ff 40%, #e6f5ff 60%, #1a8cff 80%, #ffffff 100%)',
      backgroundHover: 'linear-gradient(135deg, #3399ff 0%, #f2f9ff 20%, #2680e6 40%, #cce6ff 60%, #0073e6 80%, #e6f5ff 100%)'
    };
  }
  // Normal or any other type
  return {
    background: 'linear-gradient(135deg, #ffffff 0%, #fafafa 100%)',
    backgroundHover: 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)'
  };
};

/**
 * Debounce function for search input
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait = 300) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

