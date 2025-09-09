// CardDataContext.js
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

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

// Function to check if an item is an actual card (not a product like booster box, pack, etc.)
const isActualCard = (row) => {
    const cardType = (row.extCardType || '').trim();
    return cardType !== '';
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

// Function to create a standardized card object from a JSON record
const createCardObject = (row) => {
    // Since the JSON data already has the correct structure from the CSV consolidation,
    // we mainly need to ensure proper data types and create the display name
    const card = {
        // Core properties - convert strings to appropriate types where needed
        productId: row.productId || '',
        name: row.name || '',
        cleanName: row.cleanName || '',
        imageUrl: row.imageUrl || '',
        categoryId: row.categoryId || '',
        groupId: row.groupId || '',
        url: row.url || '',
        modifiedOn: row.modifiedOn || '',
        imageCount: getIntegerValue(row, ['imageCount']),

        // Price properties - ensure they're numbers
        lowPrice: getNumericValue(row, ['lowPrice']),
        midPrice: getNumericValue(row, ['midPrice']),
        highPrice: getNumericValue(row, ['highPrice']),
        marketPrice: getNumericValue(row, ['marketPrice']),
        directLowPrice: getNumericValue(row, ['directLowPrice']),

        // Card properties
        subTypeName: row.subTypeName || '',
        extRarity: row.extRarity || '',
        extNumber: row.extNumber || '',
        extCardType: row.extCardType || '',
        extCardSubType: row.extCardSubType || '',
        extClass: row.extClass || '',
        extIntellect: getIntegerValue(row, ['extIntellect']),
        extLife: getIntegerValue(row, ['extLife']),
        extCost: getIntegerValue(row, ['extCost']),
        extPitchValue: getIntegerValue(row, ['extPitchValue']),
        extPower: getIntegerValue(row, ['extPower']),
        extDefenseValue: getIntegerValue(row, ['extDefenseValue']),
        extTalent: row.extTalent || '',
        extFlavorText: row.extFlavorText || '',

        // Additional properties
        color: row.color || '',
        artist: row.artist || '',

        // Metadata from consolidation
        _sourceFile: row._sourceFile || '',
        _setNumber: row._setNumber || 0,
        _uniqueId: row._uniqueId || '',

        // Computed properties for display
        displayName: '',
        sourceUrl: `set_${row._setNumber}` // Use set number as source identifier
    };

    // Create display name based on available data
    const name = card.name || '';
    const edition = card.subTypeName || card.color || '';
    card.displayName = edition ? `${name} (${edition})` : name;

    return card;
};

// Function to check if consolidated JSON is available
const checkConsolidatedData = async () => {
    try {
        const response = await fetch('/price-guide/consolidated-data.json');
        if (!response.ok) {
            return { available: false, reason: 'No consolidated data file found' };
        }

        // Check if it's a valid JSON by trying to parse just the beginning
        const text = await response.text();
        const data = JSON.parse(text);
        
        return {
            available: true,
            totalRecords: data.metadata?.totalRecords || 0,
            totalFiles: data.metadata?.totalFiles || 0,
            generatedAt: data.metadata?.generatedAt || null,
            dataSize: text.length
        };
    } catch (error) {
        return { available: false, reason: error.message };
    }
};

// Function to load consolidated JSON data
const loadConsolidatedData = async () => {
    try {
        console.log('Loading consolidated JSON data...');
        const response = await fetch('/price-guide/consolidated-data.json');
        if (!response.ok) {
            throw new Error(`Failed to fetch consolidated data: ${response.status}`);
        }

        const consolidatedData = await response.json();
        
        if (!consolidatedData.data || !Array.isArray(consolidatedData.data)) {
            throw new Error('Invalid consolidated data format');
        }

        console.log(`Loaded ${consolidatedData.data.length} records from consolidated JSON`);
        return consolidatedData;
    } catch (error) {
        console.error('Error loading consolidated data:', error);
        throw error;
    }
};

// Function to process JSON records and filter for actual cards
const processJsonData = (jsonData) => {
    const allCards = [];
    let totalRows = jsonData.length;
    let filteredRows = 0;

    console.log(`Processing ${totalRows} records from JSON data...`);

    jsonData.forEach(row => {
        // Only process actual cards
        if (isActualCard(row)) {
            const card = createCardObject(row);
            if (card.name && card.name.trim()) {
                allCards.push(card);
            }
        } else {
            filteredRows++;
        }
    });

    console.log(`Processed ${allCards.length} actual cards, filtered out ${filteredRows} non-card products`);
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
                displayName: card.name + ` (${card.extNumber})`
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
                cardPrice: (card.marketPrice) ? card.marketPrice : card.lowPrice,
                uniqueId: card._uniqueId
            });
        }
    });

    return Object.values(grouped);
};

// Main provider component
export const CardDataProvider = ({ children }) => {
    const [cards, setCards] = useState([]);
    const [cardGroups, setCardGroups] = useState([]);
    const [cardIdLookup, setCardIdLookup] = useState({}); // Lookup map for unique IDs
    const [loading, setLoading] = useState(false); // Changed to false for instant page load
    const [dataReady, setDataReady] = useState(false); // New state to track when data is fully loaded
    const [error, setError] = useState(null);
    const [dataSource, setDataSource] = useState(''); // Track what data source is being used
    const [metadata, setMetadata] = useState(null); // Store metadata about the loaded data

    useEffect(() => {
        const loadCardData = async () => {
            try {
                setLoading(true);
                setError(null);

                // Check if consolidated JSON is available
                const consolidatedStatus = await checkConsolidatedData();

                if (consolidatedStatus.available) {
                    console.log('Using consolidated JSON data...');
                    setDataSource('consolidated-json');

                    // Load consolidated JSON data
                    const consolidatedData = await loadConsolidatedData();
                    
                    // Store metadata
                    setMetadata(consolidatedData.metadata);

                    // Process the JSON data
                    const allCards = processJsonData(consolidatedData.data);
                    const enhancedCards = enhanceDisplayNames(allCards);
                    const groupedCards = groupCardsByEdition(enhancedCards);

                    // Create unique ID lookup map
                    const idLookup = {};
                    enhancedCards.forEach(card => {
                        if (card._uniqueId) {
                            idLookup[card._uniqueId] = card;
                        }
                    });

                    setCards(enhancedCards);
                    setCardGroups(groupedCards);
                    setCardIdLookup(idLookup);

                    console.log(`Successfully loaded ${enhancedCards.length} cards from consolidated JSON`);
                } else {
                    throw new Error(`Consolidated data not available: ${consolidatedStatus.reason}`);
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
        cardIdLookup,
        loading,
        dataReady,
        error,
        dataSource,
        metadata
    }), [cards, cardGroups, cardIdLookup, loading, dataReady, error, dataSource, metadata]);

    return (
        <CardDataContext.Provider value={value}>
            {children}
        </CardDataContext.Provider>
    );
};