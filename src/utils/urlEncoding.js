/**
 * URL encoding utilities for sharing trades
 * Handles compression, validation, and backwards compatibility
 */

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
 * @param {Object} cardIdLookup - Lookup map for unique IDs
 * @returns {Array} Reconstructed card objects
 */
export function reconstructCardsFromURLData(cardData, cardGroups, cardIdLookup = {}) {
  if (!cardData || !Array.isArray(cardData)) {
    return [];
  }

  return cardData.reduce((validCards, urlCard) => {
    try {
      // Handle both array format [id/name, price, quantity] and object format {n, p, q}
      let cardIdentifier, cardPrice, cardQuantity;
      
      if (Array.isArray(urlCard)) {
        // New array format: [id/name, price, quantity?]
        [cardIdentifier, cardPrice, cardQuantity] = urlCard;
        cardQuantity = cardQuantity || 1; // default to 1 if not specified
      } else {
        // Legacy object format: {n: name, p: price, q: quantity}
        cardIdentifier = urlCard.n;
        cardPrice = urlCard.p;
        cardQuantity = urlCard.q || 1;
      }
      
      let cardData = null;
      let cardGroup = null;
      let matchStrategy = 'unknown';
      
      // Strategy 1: Try unique ID lookup first (fastest and most reliable)
      if (cardIdLookup[cardIdentifier]) {
        cardData = cardIdLookup[cardIdentifier];
        // Find the card group that contains this card
        cardGroup = cardGroups.find(group => 
          group.name === cardData.displayName
        );
        matchStrategy = 'unique-id';
        console.log(`Card found by unique ID: "${cardIdentifier}" -> "${cardData.displayName}"`);
      }
      
      // Strategy 2: Fallback to name-based matching for legacy URLs
      if (!cardGroup) {
        const matchResult = findBestCardMatch(cardIdentifier, cardGroups);
        if (matchResult) {
          cardGroup = matchResult.group;
          matchStrategy = matchResult.strategy;
          console.log(`Card matched using ${matchStrategy} strategy: "${cardIdentifier}" -> "${cardGroup.name}"`);
        }
      }
      
      if (!cardGroup) {
        console.warn(`Card not found in current data after all matching attempts: ${cardIdentifier}`);
        console.log('Available card groups sample:', cardGroups.slice(0, 5).map(g => g.name));
        
        // Enhanced debugging
        const similarCards = cardGroups.filter(group => 
          group.name.toLowerCase().includes('arknight') || 
          group.name.toLowerCase().includes('shard') ||
          normalizeCardName(group.name).includes(normalizeCardName(cardIdentifier).split(' ')[0])
        ).slice(0, 5);
        
        if (similarCards.length > 0) {
          console.log('Similar cards found:', similarCards.map(g => g.name));
        }
        
        return validCards;
      }
      
      if (!cardGroup.editions || cardGroup.editions.length === 0) {
        console.warn(`Card group found but has no editions: ${cardGroup.name}`);
        return validCards;
      }

      // Find the specific edition that matches the price, or use default
      let selectedEdition = cardGroup.editions[0]; // default
      const matchingEdition = cardGroup.editions.find(edition => 
        Math.abs(edition.cardPrice - cardPrice) < 0.01
      );
      if (matchingEdition) {
        selectedEdition = matchingEdition;
      }

      const reconstructedCard = {
        name: cardGroup.name, // Use canonical name from card group
        price: cardPrice,
        lowPrice: selectedEdition.lowPrice,
        quantity: Math.max(1, parseInt(cardQuantity) || 1), // Ensure valid quantity
        cardGroup,
        availableEditions: cardGroup.editions,
        uniqueId: selectedEdition.uniqueId, // Include unique ID for future operations
        subTypeName: selectedEdition.subTypeName || 'Normal',
        imageUrl: selectedEdition.imageUrl || '',
        imageUrlFallback: selectedEdition.imageUrlFallback || ''
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
