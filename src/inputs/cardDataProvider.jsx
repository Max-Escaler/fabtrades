// CardDataContext.js
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';

// Create context
const CardDataContext = createContext();

// Custom hook to use the context
export const useCardData = () => {
  const context = useContext(CardDataContext);
  if (context === undefined) {
    throw new Error('useCardData must be used within a CardDataProvider');
  }
  return context;
};

// Cache for CSV data to avoid refetching
const csvCache = new Map();

// Function to check if an item is an actual card (not a product like booster box, pack, etc.)
const isActualCard = (row) => {
  const cardType = (row.extCardType || '').trim();
  return cardType !== '';
};

// Function to parse CSV data using papaparse
const parseCSV = (csvText) => {
  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          console.warn('CSV parsing warnings:', results.errors);
        }
        resolve(results.data);
      },
      error: (error) => {
        reject(error);
      }
    });
  });
};

// Function to safely get a value from a row with fallback options
const getValue = (row, possibleKeys, defaultValue = '') => {
  for (const key of possibleKeys) {
    if (row[key] !== undefined && row[key] !== '') {
      return row[key];
    }
  }
  return defaultValue;
};

// Function to safely get a numeric value
const getNumericValue = (row, possibleKeys, defaultValue = 0) => {
  const value = getValue(row, possibleKeys, defaultValue);
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

// Function to safely get an integer value
const getIntegerValue = (row, possibleKeys, defaultValue = 0) => {
  const value = getValue(row, possibleKeys, defaultValue);
  const parsed = parseInt(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

// Function to create a standardized card object from a CSV row
const createCardObject = (row, sourceUrl) => {
  // Map all possible column variations to standard properties
  const card = {
    // Core properties with multiple possible column names
    productId: getValue(row, ['productId', 'ProductId', 'product_id']),
    name: getValue(row, ['name', 'Name', 'cardName', 'CardName']),
    cleanName: getValue(row, ['cleanName', 'CleanName', 'clean_name']),
    imageUrl: getValue(row, ['imageUrl', 'ImageUrl', 'image_url']),
    categoryId: getValue(row, ['categoryId', 'CategoryId', 'category_id']),
    groupId: getValue(row, ['groupId', 'GroupId', 'group_id']),
    url: getValue(row, ['url', 'Url', 'URL']),
    modifiedOn: getValue(row, ['modifiedOn', 'ModifiedOn', 'modified_on']),
    imageCount: getIntegerValue(row, ['imageCount', 'ImageCount', 'image_count']),
    
    // Price properties with multiple possible column names
    lowPrice: getNumericValue(row, ['lowPrice', 'LowPrice', 'low_price']),
    midPrice: getNumericValue(row, ['midPrice', 'MidPrice', 'mid_price']),
    highPrice: getNumericValue(row, ['highPrice', 'HighPrice', 'high_price']),
    marketPrice: getNumericValue(row, ['marketPrice', 'MarketPrice', 'market_price', 'price', 'Price']),
    directLowPrice: getNumericValue(row, ['directLowPrice', 'DirectLowPrice', 'direct_low_price']),
    
    // Card properties with multiple possible column names
    subTypeName: getValue(row, ['subTypeName', 'SubTypeName', 'sub_type_name', 'edition', 'Edition', 'set', 'Set']),
    extRarity: getValue(row, ['extRarity', 'ExtRarity', 'ext_rarity', 'rarity', 'Rarity']),
    extNumber: getValue(row, ['extNumber', 'ExtNumber', 'ext_number', 'number', 'Number']),
    extCardType: getValue(row, ['extCardType', 'ExtCardType', 'ext_card_type', 'cardType', 'CardType', 'type', 'Type']),
    extCardSubType: getValue(row, ['extCardSubType', 'ExtCardSubType', 'ext_card_sub_type', 'cardSubType', 'CardSubType']),
    extClass: getValue(row, ['extClass', 'ExtClass', 'ext_class', 'class', 'Class']),
    extIntellect: getIntegerValue(row, ['extIntellect', 'ExtIntellect', 'ext_intellect', 'intellect', 'Intellect']),
    extLife: getIntegerValue(row, ['extLife', 'ExtLife', 'ext_life', 'life', 'Life']),
    extCost: getIntegerValue(row, ['extCost', 'ExtCost', 'ext_cost', 'cost', 'Cost']),
    extPitchValue: getIntegerValue(row, ['extPitchValue', 'ExtPitchValue', 'ext_pitch_value', 'pitchValue', 'PitchValue']),
    extPower: getIntegerValue(row, ['extPower', 'ExtPower', 'ext_power', 'power', 'Power']),
    extDefenseValue: getIntegerValue(row, ['extDefenseValue', 'ExtDefenseValue', 'ext_defense_value', 'defenseValue', 'DefenseValue']),
    extTalent: getValue(row, ['extTalent', 'ExtTalent', 'ext_talent', 'talent', 'Talent']),
    extFlavorText: getValue(row, ['extFlavorText', 'ExtFlavorText', 'ext_flavor_text', 'flavorText', 'FlavorText']),
    
    // Additional properties that might exist in some CSVs
    color: getValue(row, ['color', 'Color', 'extColor', 'ExtColor']),
    artist: getValue(row, ['artist', 'Artist', 'extArtist', 'ExtArtist']),
    
    // Computed properties for display
    displayName: '',
    sourceUrl: sourceUrl
  };
  
  // Create display name based on available data
  const name = card.name || '';
  const edition = card.subTypeName || card.color || '';
  card.displayName = edition ? `${name} (${edition})` : name;
  
  return card;
};

// Function to check if local CSV files are available
const checkLocalCSVs = async () => {
  try {
    const response = await fetch('/price-guide/manifest.json');
    if (!response.ok) {
      return { available: false, reason: 'No manifest file found' };
    }
    
    const manifest = await response.json();
    return { 
      available: true, 
      totalFiles: manifest.totalFiles,
      downloadDate: manifest.downloadDate
    };
  } catch (error) {
    return { available: false, reason: error.message };
  }
};

// Function to fetch local CSV file
const fetchLocalCSV = async (index) => {
  try {
    const response = await fetch(`/price-guide/set_${index + 1}.csv`);
    if (!response.ok) {
      throw new Error(`Failed to fetch local CSV ${index + 1}: ${response.status}`);
    }
    const csvText = await response.text();
    return await parseCSV(csvText);
  } catch (error) {
    console.error(`Error fetching local CSV ${index + 1}:`, error);
    return [];
  }
};

// Function to fetch and parse a single CSV with caching
const fetchCSV = async (url) => {
  try {
    // Check cache first
    if (csvCache.has(url)) {
      console.log(`Using cached data for ${url}`);
      return csvCache.get(url);
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status}`);
    }
    const csvText = await response.text();
    const parsedData = await parseCSV(csvText);
    
    // Cache the result
    csvCache.set(url, parsedData);
    
    return parsedData;
  } catch (error) {
    console.error(`Error fetching CSV from ${url}:`, error);
    return [];
  }
};

// Function to get CSV URLs from the assets file
const getCSVUrls = async () => {
  try {
    const response = await fetch('/csv-urls.csv');
    if (!response.ok) {
      throw new Error('Failed to fetch CSV URLs file');
    }
    const text = await response.text();
    return text.split('\n').filter(line => line.trim() && line.startsWith('http'));
  } catch (error) {
    console.error('Error fetching CSV URLs:', error);
    return [];
  }
};

// Function to process cards in batches
const processCardsInBatches = (csvResults, csvUrls, batchSize = 100) => {
  const allCards = [];
  let processedCount = 0;
  let totalRows = 0;
  let filteredRows = 0;
  
  csvResults.forEach((csvData, index) => {
    totalRows += csvData.length;
    
    // Process in batches to avoid blocking the UI
    for (let i = 0; i < csvData.length; i += batchSize) {
      const batch = csvData.slice(i, i + batchSize);
      
      batch.forEach(row => {
        // Only process actual cards
        if (isActualCard(row)) {
          const card = createCardObject(row, csvUrls[index]);
          if (card.name && card.name.trim()) {
            allCards.push(card);
          }
        } else {
          filteredRows++;
        }
      });
    }
    
    processedCount++;
  });
  
  return allCards;
};

// Function to identify duplicates and enhance display names
const enhanceDisplayNames = (cards) => {
  // Group cards by name to identify duplicates
  const nameGroups = {};
  cards.forEach(card => {
    if (!nameGroups[card.name]) {
      nameGroups[card.name] = [];
    }
    nameGroups[card.name].push(card);
  });
  
  // Enhance display names for cards with multiple editions
  return cards.map(card => {
    const sameNameCards = nameGroups[card.name];
    if (sameNameCards.length > 1) {
      // Multiple editions exist, include extNumber in display name
      const extNumber = card.extNumber || '';
      const subTypeName = card.subTypeName || '';
      
      // Create enhanced display name
      let enhancedName = card.name;
      if (extNumber) {
        enhancedName += ` (${extNumber})`;
      }
      if (subTypeName && subTypeName !== 'Normal') {
        enhancedName += ` - ${subTypeName}`;
      }
      
      return {
        ...card,
        displayName: enhancedName
      };
    } else {
      // Single edition, keep original name
      return {
        ...card,
        displayName: card.name
      };
    }
  });
};

// Function to group cards by display name and their editions
const groupCardsByEdition = (cards) => {
  const grouped = {};
  
  cards.forEach(card => {
    const displayName = card.displayName || card.name;
    
    if (!grouped[displayName]) {
      grouped[displayName] = {
        name: displayName,
        editions: []
      };
    }
    
    // Check if this edition already exists
    const existingEdition = grouped[displayName].editions.find(
      e => e.subTypeName === card.subTypeName && e.productId === card.productId
    );
    
    if (!existingEdition) {
      grouped[displayName].editions.push({
        subTypeName: card.subTypeName,
        productId: card.productId,
        cardPrice: (card.marketPrice && card.marketPrice > 0) ? card.marketPrice : card.lowPrice
      });
    }
  });
  
  return Object.values(grouped);
};

// Main provider component
export const CardDataProvider = ({ children }) => {
  const [cards, setCards] = useState([]);
  const [cardGroups, setCardGroups] = useState([]);
  const [loading, setLoading] = useState(false); // Changed to false for instant page load
  const [dataReady, setDataReady] = useState(false); // New state to track when data is fully loaded
  const [error, setError] = useState(null);
  const [usingLocalFiles, setUsingLocalFiles] = useState(false);

  useEffect(() => {
    const loadCardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check if local CSV files are available
        const localStatus = await checkLocalCSVs();
        
        if (localStatus.available) {
          console.log('Using local CSV files...');
          setUsingLocalFiles(true);
          
          // Load all local CSV files
          const csvResults = [];
          for (let i = 0; i < localStatus.totalFiles; i++) {
            const csvData = await fetchLocalCSV(i);
            csvResults.push(csvData);
          }
          
          // Process the cards
          const allCards = processCardsInBatches(csvResults, Array(localStatus.totalFiles).fill('local'));
          const enhancedCards = enhanceDisplayNames(allCards);
          const groupedCards = groupCardsByEdition(enhancedCards);
          
          setCards(enhancedCards);
          setCardGroups(groupedCards);
          
        } else {
          console.log('Local files not available, fetching from remote URLs...');
          setUsingLocalFiles(false);
          
          // Fetch CSV URLs and download all CSVs
          const csvUrls = await getCSVUrls();
          if (csvUrls.length === 0) {
            throw new Error('No CSV URLs found');
          }

          // Download all CSVs in parallel with batching
          const batchSize = 5; // Download 5 at a time to be nice to servers
          const csvResults = [];
          
          for (let i = 0; i < csvUrls.length; i += batchSize) {
            const batch = csvUrls.slice(i, i + batchSize);
            const batchPromises = batch.map(url => fetchCSV(url));
            const batchResults = await Promise.all(batchPromises);
            csvResults.push(...batchResults);
            
            // Small delay between batches
            if (i + batchSize < csvUrls.length) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }

          // Process the cards
          const allCards = processCardsInBatches(csvResults, csvUrls);
          const enhancedCards = enhanceDisplayNames(allCards);
          const groupedCards = groupCardsByEdition(enhancedCards);
          
          setCards(enhancedCards);
          setCardGroups(groupedCards);
        }

      } catch (err) {
        console.error('Error loading card data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
        setDataReady(true); // Mark data as ready when loading completes
      }
    };

    // Start loading immediately in the background
    loadCardData();
  }, []);

  const value = useMemo(() => ({
    cards,
    cardGroups,
    loading,
    dataReady, // Expose the new dataReady state
    error,
    usingLocalFiles
  }), [cards, cardGroups, loading, dataReady, error, usingLocalFiles]);
  
  return (
    <CardDataContext.Provider value={value}>
      {children}
    </CardDataContext.Provider>
  );
};
