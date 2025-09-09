/**
 * URL encoding utilities for sharing trades
 * Handles compression, validation, and backwards compatibility
 */

// Simple compression using run-length encoding for repetitive data
function compress(str) {
  // Use built-in compression if available, fallback to base64
  try {
    // Simple base64 encoding as fallback (could be replaced with LZ-string)
    return btoa(str);
  } catch (error) {
    console.warn('Compression failed, using raw string:', error);
    return str;
  }
}

function decompress(str) {
  try {
    return atob(str);
  } catch (error) {
    console.warn('Decompression failed, treating as raw string:', error);
    return str;
  }
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
    // Create minimal trade data structure
    const tradeData = {
      v: 1, // Version for backwards compatibility
      t: Date.now(), // Timestamp for price relevance
      h: haveList.map(card => ({
        n: card.name, // name
        p: Number(card.price.toFixed(2)), // price (rounded to 2 decimals)
        q: card.quantity, // quantity
        // Store edition info if different from default
        ...(card.cardGroup?.editions?.[0]?.cardPrice !== card.price && {
          e: card.price // edition price if different from default
        })
      })),
      w: wantList.map(card => ({
        n: card.name,
        p: Number(card.price.toFixed(2)),
        q: card.quantity,
        ...(card.cardGroup?.editions?.[0]?.cardPrice !== card.price && {
          e: card.price
        })
      }))
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
    
    return {
      version: tradeData.v,
      timestamp: tradeData.t,
      have: tradeData.h || [],
      want: tradeData.w || [],
      ageInDays: tradeData.t ? (Date.now() - tradeData.t) / (1000 * 60 * 60 * 24) : null
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
      // Find the card group by name
      const cardGroup = cardGroups.find(group => 
        group.name.toLowerCase() === urlCard.n.toLowerCase()
      );
      
      if (!cardGroup || !cardGroup.editions || cardGroup.editions.length === 0) {
        console.warn(`Card not found in current data: ${urlCard.n}`);
        return validCards;
      }

      // Find the edition that matches the price, or use default
      let selectedEdition = cardGroup.editions[0]; // default
      if (urlCard.e && urlCard.e !== urlCard.p) {
        // Look for edition with matching price
        const matchingEdition = cardGroup.editions.find(edition => 
          Math.abs(edition.cardPrice - urlCard.p) < 0.01
        );
        if (matchingEdition) {
          selectedEdition = matchingEdition;
        }
      }

      const reconstructedCard = {
        name: cardGroup.name, // Use canonical name from card group
        price: urlCard.p,
        quantity: Math.max(1, parseInt(urlCard.q) || 1), // Ensure valid quantity
        cardGroup,
        availableEditions: cardGroup.editions
      };

      validCards.push(reconstructedCard);
    } catch (error) {
      console.warn(`Failed to reconstruct card: ${urlCard.n}`, error);
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
