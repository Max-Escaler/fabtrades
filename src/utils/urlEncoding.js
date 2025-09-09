/**
 * URL encoding utilities for sharing trades
 * Handles compression, validation, and backwards compatibility
 */

// Advanced compression strategies for URL optimization
function compress(str) {
  try {
    // Strategy 1: Remove unnecessary whitespace from JSON
    const minified = str.replace(/\s+/g, '');
    
    // Strategy 2: Use shorter field names (already done in encoding)
    
    // Strategy 3: Compress common card name patterns
    let compressed = compressCardNames(minified);
    
    // Strategy 4: Compress repeated patterns
    compressed = compressRepeatedPatterns(compressed);
    
    // Strategy 5: Base64 encode the result
    return btoa(compressed);
  } catch (error) {
    console.warn('Compression failed, using base64 fallback:', error);
    return btoa(str);
  }
}

function decompress(str) {
  try {
    const decoded = atob(str);
    // Decompress repeated patterns
    const decompressed = decompressRepeatedPatterns(decoded);
    // Decompress card names
    return decompressCardNames(decompressed);
  } catch (error) {
    console.warn('Decompression failed, treating as raw string:', error);
    return str;
  }
}

// Compress repeated JSON patterns
function compressRepeatedPatterns(str) {
  // Replace common JSON patterns with shorter equivalents
  const patterns = [
    ['"n":"', 'α'],      // name field
    ['"p":', 'β'],       // price field  
    ['"q":', 'γ'],       // quantity field
    ['{"', 'δ'],         // object start
    ['"}', 'ε'],         // object end
    [',"', 'ζ'],         // comma quote
    ['":', 'η'],         // quote colon
  ];
  
  let compressed = str;
  patterns.forEach(([pattern, replacement]) => {
    compressed = compressed.replace(new RegExp(escapeRegExp(pattern), 'g'), replacement);
  });
  
  return compressed;
}

// Decompress repeated JSON patterns
function decompressRepeatedPatterns(str) {
  const patterns = [
    ['α', '"n":"'],      // name field
    ['β', '"p":'],       // price field
    ['γ', '"q":'],       // quantity field
    ['δ', '{"'],         // object start
    ['ε', '"}'],         // object end
    ['ζ', ',"'],         // comma quote
    ['η', '":'],         // quote colon
  ];
  
  let decompressed = str;
  patterns.forEach(([replacement, pattern]) => {
    decompressed = decompressed.replace(new RegExp(escapeRegExp(replacement), 'g'), pattern);
  });
  
  return decompressed;
}

// Compress common card name patterns
function compressCardNames(str) {
  // Common FAB card terms that can be abbreviated
  const cardPatterns = [
    // Common words in card names
    [' of ', '◊'],
    [' the ', '♦'],
    [' and ', '♠'],
    ['Lightning', 'Lt'],
    ['Thunder', 'Th'],
    ['Strike', 'St'],
    ['Attack', 'At'],
    ['Defense', 'Df'],
    ['Action', 'Ac'],
    ['Equipment', 'Eq'],
    ['Weapon', 'Wp'],
    ['Rainbow', 'Rb'],
    ['Yellow', 'Y'],
    ['Blue', 'B'],
    ['Red', 'R'],
    [' - ', '~'], // common separator
  ];
  
  let compressed = str;
  cardPatterns.forEach(([pattern, replacement]) => {
    compressed = compressed.replace(new RegExp(escapeRegExp(pattern), 'g'), replacement);
  });
  
  return compressed;
}

// Decompress card name patterns
function decompressCardNames(str) {
  const cardPatterns = [
    ['◊', ' of '],
    ['♦', ' the '],
    ['♠', ' and '],
    ['Lt', 'Lightning'],
    ['Th', 'Thunder'],
    ['St', 'Strike'],
    ['At', 'Attack'],
    ['Df', 'Defense'],
    ['Ac', 'Action'],
    ['Eq', 'Equipment'],
    ['Wp', 'Weapon'],
    ['Rb', 'Rainbow'],
    ['Y', 'Yellow'],
    ['B', 'Blue'],
    ['R', 'Red'],
    ['~', ' - '],
  ];
  
  let decompressed = str;
  cardPatterns.forEach(([replacement, pattern]) => {
    decompressed = decompressed.replace(new RegExp(escapeRegExp(replacement), 'g'), pattern);
  });
  
  return decompressed;
}

// Escape special characters for regex
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Encodes trade data into a shareable URL
 * @param {Array} haveList - Cards the user has
 * @param {Array} wantList - Cards the user wants
 * @param {Object} options - Additional options
 * @returns {string} Shareable URL
 */
export function encodeTradeToURL(haveList, wantList, options = {}) {
  try {
    // Create ultra-minimal trade data structure using arrays instead of objects
    const tradeData = {
      v: 1, // Version for backwards compatibility
      t: Math.floor(Date.now() / 60000), // Timestamp in minutes (saves ~4 characters)
      h: haveList.map(card => [
        card.name,
        Number(card.price.toFixed(2)),
        card.quantity > 1 ? card.quantity : undefined // omit quantity if it's 1
      ].filter(x => x !== undefined)), // remove undefined values
      w: wantList.map(card => [
        card.name,
        Number(card.price.toFixed(2)),
        card.quantity > 1 ? card.quantity : undefined
      ].filter(x => x !== undefined))
    };

    const jsonString = JSON.stringify(tradeData);
    
    // Check URL length before compression
    if (jsonString.length > 1500) {
      console.warn('Trade data is large, URL may be long');
    }

    const compressed = compress(jsonString);
    const encoded = encodeURIComponent(compressed);
    
    const baseUrl = options.baseUrl || window.location.origin + window.location.pathname;
    const url = `${baseUrl}?trade=${encoded}`;
    
    // Check final URL length
    if (url.length > 2000) {
      console.warn('Generated URL is very long (>2000 chars), may not work in all browsers');
    }
    
    return url;
  } catch (error) {
    console.error('Failed to encode trade to URL:', error);
    return null;
  }
}

/**
 * Decodes trade data from URL
 * @returns {Object|null} Trade data or null if invalid
 */
export function decodeTradeFromURL() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const tradeParam = urlParams.get('trade');
    
    if (!tradeParam) {
      return null;
    }

    const decoded = decodeURIComponent(tradeParam);
    const decompressed = decompress(decoded);
    const tradeData = JSON.parse(decompressed);
    
    // Validate version
    if (!tradeData.v || tradeData.v > 1) {
      console.warn('Unsupported trade data version:', tradeData.v);
      return null;
    }
    
    // Check timestamp age (warn if older than 7 days)
    if (tradeData.t) {
      const ageInDays = (Date.now() - tradeData.t) / (1000 * 60 * 60 * 24);
      if (ageInDays > 7) {
        console.warn(`Trade data is ${Math.round(ageInDays)} days old, prices may be outdated`);
      }
    }
    
    // Convert timestamp back from minutes to milliseconds
    const timestamp = tradeData.t ? tradeData.t * 60000 : null;
    
    return {
      version: tradeData.v,
      timestamp: timestamp,
      have: tradeData.h || [],
      want: tradeData.w || [],
      ageInDays: timestamp ? (Date.now() - timestamp) / (1000 * 60 * 60 * 24) : null
    };
  } catch (error) {
    console.error('Failed to decode trade from URL:', error);
    return null;
  }
}

/**
 * Reconstructs full card objects from minimal URL data
 * @param {Array} cardData - Minimal card data from URL
 * @param {Array} cardGroups - Available card groups from the app
 * @returns {Array} Reconstructed card objects
 */
export function reconstructCardsFromURLData(cardData, cardGroups) {
  if (!cardData || !Array.isArray(cardData)) {
    return [];
  }

  return cardData.reduce((validCards, urlCard) => {
    try {
      // Handle both array format [name, price, quantity] and object format {n, p, q}
      let cardName, cardPrice, cardQuantity;
      
      if (Array.isArray(urlCard)) {
        // New array format: [name, price, quantity?]
        [cardName, cardPrice, cardQuantity] = urlCard;
        cardQuantity = cardQuantity || 1; // default to 1 if not specified
      } else {
        // Legacy object format: {n: name, p: price, q: quantity}
        cardName = urlCard.n;
        cardPrice = urlCard.p;
        cardQuantity = urlCard.q || 1;
      }
      
      // Find the card group by name
      const cardGroup = cardGroups.find(group => 
        group.name.toLowerCase() === cardName.toLowerCase()
      );
      
      if (!cardGroup || !cardGroup.editions || cardGroup.editions.length === 0) {
        console.warn(`Card not found in current data: ${cardName}`);
        return validCards;
      }

      const reconstructedCard = {
        name: cardGroup.name, // Use canonical name from card group
        price: cardPrice,
        quantity: Math.max(1, parseInt(cardQuantity) || 1), // Ensure valid quantity
        cardGroup,
        availableEditions: cardGroup.editions
      };

      validCards.push(reconstructedCard);
    } catch (error) {
      console.warn(`Failed to reconstruct card:`, error);
    }
    
    return validCards;
  }, []);
}

/**
 * Validates if the current URL contains trade data
 * @returns {boolean} True if URL contains valid trade data
 */
export function hasTradeDataInURL() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.has('trade');
}

/**
 * Clears trade data from URL without page reload
 */
export function clearTradeFromURL() {
  if (window.history && window.history.replaceState) {
    const url = new URL(window.location);
    url.searchParams.delete('trade');
    window.history.replaceState({}, '', url);
  }
}

/**
 * Estimates the size of a trade for URL encoding
 * @param {Array} haveList 
 * @param {Array} wantList 
 * @returns {Object} Size estimation
 */
export function estimateTradeURLSize(haveList, wantList) {
  try {
    const url = encodeTradeToURL(haveList, wantList);
    return {
      urlLength: url ? url.length : 0,
      isLarge: url ? url.length > 1500 : false,
      isTooLarge: url ? url.length > 2000 : false
    };
  } catch (error) {
    return {
      urlLength: 0,
      isLarge: false,
      isTooLarge: true,
      error: error.message
    };
  }
}
