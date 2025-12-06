/**
 * Search Utilities for FAB Trades
 * Helper functions for card searching and filtering
 */

/**
 * Normalize a string for fuzzy matching
 * - Lowercase
 * - Remove special characters (apostrophes, hyphens, etc.)
 * - Collapse multiple spaces
 */
const normalizeForSearch = (str) => {
    if (!str) return '';
    return str
        .toLowerCase()
        .replace(/[''`]/g, '')      // Remove apostrophes
        .replace(/[-–—]/g, ' ')     // Replace hyphens with spaces
        .replace(/[^\w\s]/g, ' ')   // Remove other special chars
        .replace(/\s+/g, ' ')       // Collapse multiple spaces
        .trim();
};

/**
 * Check if all search words are found in the text (order-independent)
 * @param {string} text - The text to search in
 * @param {string[]} searchWords - Array of search words
 * @returns {boolean} True if all words are found
 */
const matchesAllWords = (text, searchWords) => {
    const normalizedText = normalizeForSearch(text);
    return searchWords.every(word => normalizedText.includes(word));
};

/**
 * Calculate a match score for sorting results
 * Higher score = better match
 */
const calculateMatchScore = (label, searchWords, originalTerm) => {
    const normalizedLabel = normalizeForSearch(label);
    const lowerLabel = label.toLowerCase();
    let score = 0;
    
    // Exact match (normalized) gets highest score
    if (normalizedLabel === normalizeForSearch(originalTerm)) {
        score += 1000;
    }
    
    // Original term appears as-is (substring match)
    if (lowerLabel.includes(originalTerm.toLowerCase())) {
        score += 500;
    }
    
    // Label starts with first search word
    if (normalizedLabel.startsWith(searchWords[0])) {
        score += 200;
    }
    
    // Words appear in order
    let lastIndex = -1;
    let inOrder = true;
    for (const word of searchWords) {
        const index = normalizedLabel.indexOf(word);
        if (index <= lastIndex) {
            inOrder = false;
            break;
        }
        lastIndex = index;
    }
    if (inOrder) {
        score += 100;
    }
    
    // Bonus for shorter labels (more specific matches)
    score += Math.max(0, 50 - label.length);
    
    return score;
};

/**
 * Filter card options based on search input
 * Supports fuzzy matching: word order independent, ignores special characters
 * @param {Array} options - Array of card option objects
 * @param {string} searchTerm - Search string
 * @param {number} limit - Maximum number of results to return
 * @returns {Array} Filtered options
 */
export const filterCardOptions = (options, searchTerm, limit = 10) => {
    if (!searchTerm || searchTerm.trim() === '') {
        return options.slice(0, Math.min(limit, 20));
    }

    const normalizedTerm = normalizeForSearch(searchTerm);
    const searchWords = normalizedTerm.split(' ').filter(w => w.length > 0);
    
    if (searchWords.length === 0) {
        return options.slice(0, Math.min(limit, 20));
    }
    
    // Filter options where all search words are found
    const filtered = options.filter(option => {
        const label = option.label || '';
        return matchesAllWords(label, searchWords);
    });

    // Sort by match score (best matches first)
    const sorted = filtered.sort((a, b) => {
        const scoreA = calculateMatchScore(a.label || '', searchWords, searchTerm);
        const scoreB = calculateMatchScore(b.label || '', searchWords, searchTerm);
        
        if (scoreB !== scoreA) {
            return scoreB - scoreA; // Higher score first
        }
        
        // Alphabetical as tiebreaker
        return (a.label || '').localeCompare(b.label || '');
    });

    return sorted.slice(0, limit);
};

/**
 * Highlight matching text in a string
 * Highlights all occurrences of search words
 * @param {string} text - Original text
 * @param {string} searchTerm - Term to highlight
 * @returns {Array} Array of text segments with highlight flags
 */
export const highlightMatch = (text, searchTerm) => {
    if (!searchTerm || !text) {
        return [{ text, highlight: false }];
    }

    const normalizedTerm = normalizeForSearch(searchTerm);
    const searchWords = normalizedTerm.split(' ').filter(w => w.length > 0);
    
    if (searchWords.length === 0) {
        return [{ text, highlight: false }];
    }

    // Create a map of character positions to highlight
    const highlightMap = new Array(text.length).fill(false);
    const normalizedText = normalizeForSearch(text);
    
    // Build a mapping from normalized positions to original positions
    const positionMap = [];
    for (let i = 0; i < text.length; i++) {
        const char = text[i].toLowerCase();
        const normalizedChar = normalizeForSearch(char);
        if (normalizedChar.length > 0) {
            positionMap.push(i);
        }
    }
    
    // For each search word, find and mark matching positions
    for (const word of searchWords) {
        let wordIndex = normalizedText.indexOf(word);
        while (wordIndex !== -1) {
            // Map normalized positions back to original text
            for (let i = 0; i < word.length && wordIndex + i < positionMap.length; i++) {
                const originalPos = positionMap[wordIndex + i];
                if (originalPos !== undefined) {
                    highlightMap[originalPos] = true;
                }
            }
            wordIndex = normalizedText.indexOf(word, wordIndex + 1);
        }
    }
    
    // Convert highlight map to segments
    const segments = [];
    let currentHighlight = highlightMap[0];
    let currentText = text[0] || '';
    
    for (let i = 1; i < text.length; i++) {
        if (highlightMap[i] === currentHighlight) {
            currentText += text[i];
        } else {
            segments.push({ text: currentText, highlight: currentHighlight });
            currentHighlight = highlightMap[i];
            currentText = text[i];
        }
    }
    
    if (currentText) {
        segments.push({ text: currentText, highlight: currentHighlight });
    }
    
    return segments.length > 0 ? segments : [{ text, highlight: false }];
};

/**
 * Get gradient style based on card foil type
 * FAB-themed warm brown gradients
 * @param {string} subTypeName - Card's subTypeName field (foil type)
 * @param {string} rarity - Card's rarity field
 * @param {boolean} isDark - Whether dark mode is active
 * @returns {Object} Object with background and backgroundHover properties
 */
export const getCardGradient = (subTypeName, rarity = '', isDark = false) => {
    const subType = (subTypeName || '').toLowerCase();
    
    // Rainbow Foil - vibrant rainbow gradient
    if (subType.includes('rainbow foil')) {
        if (isDark) {
            return {
                background: 'linear-gradient(135deg, #3a2020 0%, #3a3020 14%, #303a20 28%, #203a30 42%, #203040 57%, #302040 71%, #402030 85%, #3a2020 100%)',
                backgroundHover: 'linear-gradient(135deg, #4a3030 0%, #4a4030 14%, #404a30 28%, #304a40 42%, #304050 57%, #403050 71%, #503040 85%, #4a3030 100%)'
            };
        }
        return {
            background: 'linear-gradient(135deg, #ffe5e5 0%, #fff4e5 14%, #fffee5 28%, #e5ffe5 42%, #e5f4ff 57%, #f0e5ff 71%, #ffe5f0 85%, #ffe5e5 100%)',
            backgroundHover: 'linear-gradient(135deg, #ffd0d0 0%, #ffe8c0 14%, #fffdc0 28%, #d0ffd0 42%, #c0e8ff 57%, #e0c0ff 71%, #ffc0e0 85%, #ffd0d0 100%)'
        };
    }
    
    // Cold Foil - blue/silver metallic gradient
    if (subType.includes('cold foil')) {
        if (isDark) {
            return {
                background: 'linear-gradient(135deg, #1a2a3a 0%, #2a3a4a 20%, #1a3040 40%, #2a4050 60%, #1a3545 80%, #2a3a4a 100%)',
                backgroundHover: 'linear-gradient(135deg, #2a3a4a 0%, #3a4a5a 20%, #2a4050 40%, #3a5060 60%, #2a4555 80%, #3a4a5a 100%)'
            };
        }
        return {
            background: 'linear-gradient(135deg, #4da6ff 0%, #ffffff 20%, #3399ff 40%, #e6f5ff 60%, #1a8cff 80%, #ffffff 100%)',
            backgroundHover: 'linear-gradient(135deg, #3399ff 0%, #f2f9ff 20%, #2680e6 40%, #cce6ff 60%, #0073e6 80%, #e6f5ff 100%)'
        };
    }
    
    // Generic Foil variants
    if (subType.includes('foil') || subType.includes('holo')) {
        if (isDark) {
            return {
                background: 'linear-gradient(135deg, #2a2018 0%, #3a2820 20%, #4a3028 40%, #3a2820 60%, #2a2018 80%, #3a2820 100%)',
                backgroundHover: 'linear-gradient(135deg, #3a3028 0%, #4a3830 20%, #5a4038 40%, #4a3830 60%, #3a3028 80%, #4a3830 100%)'
            };
        }
        return {
            background: 'linear-gradient(135deg, #f5f1ed 0%, #f8f0e8 20%, #faf5f0 40%, #f8f0e8 60%, #f5f1ed 80%, #f8f0e8 100%)',
            backgroundHover: 'linear-gradient(135deg, #efe8e0 0%, #f5ebe0 20%, #f8f0e8 40%, #f5ebe0 60%, #efe8e0 80%, #f5ebe0 100%)'
        };
    }
    
    // Normal cards - clean FAB brown theme
    if (isDark) {
        return {
            background: 'linear-gradient(135deg, #2c1810 0%, #1a0f0a 100%)',
            backgroundHover: 'linear-gradient(135deg, #3d2318 0%, #2c1810 100%)'
        };
    }
    return {
        background: 'linear-gradient(135deg, #ffffff 0%, #fafafa 100%)',
        backgroundHover: 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)'
    };
};

/**
 * Format price for display
 * @param {number} price - Price value
 * @returns {string} Formatted price string
 */
export const formatPrice = (price) => {
    if (price === null || price === undefined || price === 0) {
        return '—';
    }
    return `$${price.toFixed(2)}`;
};

/**
 * Get short foil label for display in badges
 * @param {string} subTypeName - Card's subTypeName field
 * @returns {string|null} Short label or null if normal
 */
export const getShortFoilLabel = (subTypeName) => {
    const subType = (subTypeName || '').toLowerCase();
    
    if (subType.includes('rainbow foil')) {
        return 'RF';
    }
    if (subType.includes('cold foil')) {
        return 'CF';
    }
    // Don't show a badge for normal cards
    if (subType === 'normal' || subType === '' || !subType) {
        return null;
    }
    // For any other type, show first 2 letters uppercase
    if (subType.length > 0) {
        return subType.substring(0, 2).toUpperCase();
    }
    return null;
};

/**
 * Format a card type into a cleaner display name
 */
export const formatCardType = (subTypeName) => {
    if (!subTypeName) return null;
    
    const type = subTypeName.toLowerCase();
    
    // Return clean labels for different types
    if (type.includes('rainbow foil')) return 'Rainbow Foil';
    if (type.includes('cold foil')) return 'Cold Foil';
    if (type.includes('foil')) return 'Foil';
    if (type.includes('promo')) return 'Promo';
    if (type.includes('normal')) return null; // Don't show badge for normal cards
    
    // Return the original if it's something else
    return subTypeName;
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
