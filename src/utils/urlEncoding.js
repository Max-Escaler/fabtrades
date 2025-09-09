/**
 * URL encoding utilities for sharing trades
 * Handles compression, validation, and backwards compatibility
 */

// Advanced compression strategies for URL optimization
function compress(str) {
  try {
    console.log('Starting compression of:', str.substring(0, 100) + '...');
    
    // Strategy 1: Remove unnecessary whitespace from JSON
    const minified = str.replace(/\s+/g, '');
    console.log('After minification:', minified.length, 'chars');
    
    // Strategy 2: Use shorter field names (already done in encoding)
    
    // Strategy 3: Compress common card name patterns
    let compressed = compressCardNames(minified);
    console.log('After card name compression:', compressed.length, 'chars');
    
    // Strategy 4: Compress repeated patterns
    compressed = compressRepeatedPatterns(compressed);
    console.log('After pattern compression:', compressed.length, 'chars');
    
    // Strategy 5: Base64 encode the result
    const result = btoa(unescape(encodeURIComponent(compressed)));
    console.log('After base64 encoding:', result.length, 'chars');
    return result;
  } catch (error) {
    console.warn('Advanced compression failed, using simple base64:', error);
    try {
      // Fallback to simple base64 encoding
      return btoa(unescape(encodeURIComponent(str)));
    } catch (fallbackError) {
      console.error('Even simple base64 failed:', fallbackError);
      // Last resort - return the string as-is
      return str;
    }
  }
}

function decompress(str) {
  try {
    console.log('Starting decompression of:', str.substring(0, 50) + '...');
    
    // Step 1: Base64 decode
    let decoded;
    try {
      decoded = atob(str);
      console.log('Base64 decoded successfully, length:', decoded.length);
    } catch (base64Error) {
      console.error('Base64 decode failed:', base64Error);
      throw base64Error;
    }
    
    // Step 2: Handle UTF-8 decoding
    let utf8Decoded;
    try {
      utf8Decoded = decodeURIComponent(escape(decoded));
      console.log('UTF-8 decoded successfully');
    } catch (utf8Error) {
      console.warn('UTF-8 decode failed, using raw decoded:', utf8Error);
      utf8Decoded = decoded;
    }
    
    // Step 3: Decompress repeated patterns
    let patternDecompressed;
    try {
      patternDecompressed = decompressRepeatedPatterns(utf8Decoded);
      console.log('Pattern decompression successful');
    } catch (patternError) {
      console.warn('Pattern decompression failed, skipping:', patternError);
      patternDecompressed = utf8Decoded;
    }
    
    // Step 4: Decompress card names
    let result;
    try {
      result = decompressCardNames(patternDecompressed);
      console.log('Card name decompression successful');
    } catch (cardError) {
      console.warn('Card name decompression failed, skipping:', cardError);
      result = patternDecompressed;
    }
    
    console.log('Final decompressed result:', result.substring(0, 100) + '...');
    return result;
  } catch (error) {
    console.error('Complete decompression failed:', error);
    console.log('Attempting fallback decompression...');
    
    // Fallback: try simple base64 decode
    try {
      const fallback = atob(str);
      console.log('Fallback base64 decode successful');
      return decodeURIComponent(escape(fallback));
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      return str;
    }
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
    console.log('Original JSON:', jsonString);
    
    // Check URL length before compression
    if (jsonString.length > 1500) {
      console.warn('Trade data is large, URL may be long');
    }

    const compressed = compress(jsonString);
    console.log('Compressed data:', compressed.substring(0, 100) + '...');
    
    // Use a more conservative encoding approach for production
    const encoded = encodeURIComponent(compressed);
    console.log('Encoded data:', encoded.substring(0, 100) + '...');
    
    const baseUrl = options.baseUrl || window.location.origin + window.location.pathname;
    const url = `${baseUrl}?trade=${encoded}`;
    
    console.log('Final URL length:', url.length);
    
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
    
    console.log('Raw trade param from URL:', tradeParam);
    
    if (!tradeParam) {
      console.log('No trade parameter found in URL');
      return null;
    }

    // Handle potential double encoding issues
    let decoded;
    try {
      decoded = decodeURIComponent(tradeParam);
      console.log('First decode attempt:', decoded.substring(0, 100) + '...');
    } catch (error) {
      console.warn('First decode failed, trying direct use:', error);
      decoded = tradeParam;
    }
    
    // Try decompression
    let decompressed;
    try {
      decompressed = decompress(decoded);
      console.log('Decompressed data:', decompressed.substring(0, 200) + '...');
    } catch (error) {
      console.error('Decompression failed:', error);
      // Try direct JSON parse in case it's not compressed
      try {
        decompressed = atob(decoded);
        console.log('Direct base64 decode worked:', decompressed.substring(0, 100) + '...');
      } catch (base64Error) {
        console.error('Base64 decode also failed:', base64Error);
        return null;
      }
    }
    
    // Parse JSON
    let tradeData;
    try {
      tradeData = JSON.parse(decompressed);
      console.log('Parsed trade data:', tradeData);
    } catch (parseError) {
      console.error('JSON parse failed:', parseError);
      console.error('Raw data was:', decompressed);
      return null;
    }
    
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
 * Normalizes card names for better matching
 * @param {string} cardName - Card name to normalize
 * @returns {string} Normalized card name
 */
function normalizeCardName(cardName) {
  return cardName
    .toLowerCase()
    .replace(/\s+/g, ' ')           // Normalize spaces
    .replace(/[^\w\s()]/g, '')      // Keep only alphanumeric, spaces, and parentheses
    .trim();
}

/**
 * Finds the best matching card group using multiple strategies
 * @param {string} cardName - Card name to find
 * @param {Array} cardGroups - Available card groups
 * @returns {Object|null} Best matching card group
 */
function findBestCardMatch(cardName, cardGroups) {
  const normalizedSearchName = normalizeCardName(cardName);
  
  // Strategy 1: Exact match
  let match = cardGroups.find(group => 
    normalizeCardName(group.name) === normalizedSearchName
  );
  if (match) return { group: match, strategy: 'exact' };
  
  // Strategy 2: Base name match (remove edition info)
  const baseName = cardName.replace(/\s*\([^)]*\).*$/, '').trim();
  const normalizedBaseName = normalizeCardName(baseName);
  
  match = cardGroups.find(group => {
    const groupBaseName = group.name.replace(/\s*\([^)]*\).*$/, '').trim();
    return normalizeCardName(groupBaseName) === normalizedBaseName;
  });
  if (match) return { group: match, strategy: 'base-name' };
  
  // Strategy 3: Substring matching
  match = cardGroups.find(group => {
    const normalizedGroupName = normalizeCardName(group.name);
    return normalizedGroupName.includes(normalizedBaseName) || 
           normalizedBaseName.includes(normalizedGroupName);
  });
  if (match) return { group: match, strategy: 'substring' };
  
  // Strategy 4: Word-based matching (for complex names)
  const searchWords = normalizedBaseName.split(/\s+/).filter(w => w.length > 2);
  if (searchWords.length > 1) {
    match = cardGroups.find(group => {
      const groupWords = normalizeCardName(group.name).split(/\s+/);
      const matchingWords = searchWords.filter(word => 
        groupWords.some(groupWord => groupWord.includes(word) || word.includes(groupWord))
      );
      return matchingWords.length >= Math.min(2, searchWords.length);
    });
    if (match) return { group: match, strategy: 'word-based' };
  }
  
  return null;
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
      
      // Use the enhanced card matching system
      const matchResult = findBestCardMatch(cardName, cardGroups);
      
      if (!matchResult) {
        console.warn(`Card not found in current data after all matching attempts: ${cardName}`);
        console.log('Available card groups sample:', cardGroups.slice(0, 5).map(g => g.name));
        
        // Enhanced debugging: look for similar names
        const similarCards = cardGroups.filter(group => 
          group.name.toLowerCase().includes('arknight') || 
          group.name.toLowerCase().includes('shard') ||
          normalizeCardName(group.name).includes(normalizeCardName(cardName).split(' ')[0])
        ).slice(0, 5);
        
        if (similarCards.length > 0) {
          console.log('Similar cards found:', similarCards.map(g => g.name));
        }
        
        return validCards;
      }
      
      const cardGroup = matchResult.group;
      console.log(`Card matched using ${matchResult.strategy} strategy: "${cardName}" -> "${cardGroup.name}"`);
      
      if (!cardGroup.editions || cardGroup.editions.length === 0) {
        console.warn(`Card group found but has no editions: ${cardGroup.name}`);
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
 * Test URL encoding and decoding round-trip
 * @param {Array} haveList 
 * @param {Array} wantList 
 * @returns {Object} Test results
 */
export function testURLEncoding(haveList, wantList) {
  try {
    console.log('Testing URL encoding round-trip...');
    
    // Step 1: Encode
    const url = encodeTradeToURL(haveList, wantList);
    if (!url) {
      return { success: false, error: 'Failed to encode URL' };
    }
    
    // Step 2: Extract trade parameter
    const urlObj = new URL(url);
    const tradeParam = urlObj.searchParams.get('trade');
    
    // Step 3: Manually test decoding
    const decoded = decodeURIComponent(tradeParam);
    const decompressed = decompress(decoded);
    const parsed = JSON.parse(decompressed);
    
    console.log('Round-trip test successful!');
    return {
      success: true,
      originalHave: haveList.length,
      originalWant: wantList.length,
      decodedHave: parsed.h ? parsed.h.length : 0,
      decodedWant: parsed.w ? parsed.w.length : 0,
      urlLength: url.length,
      tradeParam: tradeParam.substring(0, 50) + '...'
    };
  } catch (error) {
    console.error('Round-trip test failed:', error);
    return {
      success: false,
      error: error.message
    };
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
