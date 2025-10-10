import { useState, useMemo, useEffect } from "react";
import { calculateTotal, calculateDiff } from "../utils/trade.js";
import { 
    decodeTradeFromURL, 
    encodeTradeToURL, 
    reconstructCardsFromURLData,
    hasTradeDataInURL,
    clearTradeFromURL,
    estimateTradeURLSize,
    testURLEncoding
} from "../utils/urlEncoding.js";

export function useTradeState(cardGroups, cardIdLookup = {}) {
    const [haveList, setHaveList] = useState([]);
    const [wantList, setWantList] = useState([]);
    const [haveInput, setHaveInput] = useState("");
    const [wantInput, setWantInput] = useState("");
    const [urlTradeData, setUrlTradeData] = useState(null);
    const [hasLoadedFromURL, setHasLoadedFromURL] = useState(false);

    const getCardGroup = (cardName) =>
        cardGroups.find(group => group.name === cardName) || null;

    const addCard = (list, setList, cardNameOrObject, inputSetter) => {
        // Handle both string (for backwards compatibility/manual input) and object (from autocomplete)
        let cardName, selectedCard;
        
        if (typeof cardNameOrObject === 'object' && cardNameOrObject !== null) {
            // It's a card option object from autocomplete
            cardName = cardNameOrObject.label;
            selectedCard = cardNameOrObject.card;
        } else if (typeof cardNameOrObject === 'string') {
            // It's a string name
            cardName = cardNameOrObject;
        } else {
            return; // Invalid input
        }
        
        // Check if card already exists (by unique ID if we have selected card, otherwise by name)
        const cardExists = selectedCard 
            ? list.some(item => item.uniqueId === selectedCard._uniqueId)
            : list.some(item => item.name === cardName);
            
        if (cardName && !cardExists) {
            const cardGroup = getCardGroup(cardName);
            if (cardGroup && cardGroup.editions.length > 0) {
                // If we have a specific card selected, use its edition info
                let edition, subTypeName;
                if (selectedCard) {
                    subTypeName = selectedCard.subTypeName || 'Normal';
                    // Find the matching edition
                    edition = cardGroup.editions.find(e => e.subTypeName === subTypeName) || cardGroup.editions[0];
                } else {
                    // Default to first edition if no specific card selected
                    edition = cardGroup.editions[0];
                    subTypeName = edition.subTypeName || 'Normal';
                }
                
                setList([
                    ...list,
                    {
                        name: cardName,
                        price: edition.cardPrice,
                        cardGroup,
                        availableEditions: cardGroup.editions,
                        quantity: 1,
                        subTypeName: subTypeName,  // Store subTypeName for gradient rendering
                        uniqueId: selectedCard ? selectedCard._uniqueId : edition.uniqueId
                    }
                ]);
                inputSetter("");
            }
        }
    };

    const removeCard = (list, setList, index) => {
        setList(list.filter((_, i) => i !== index));
    };

    const updateQuantity = (list, setList, index, newQuantity) => {
        const updatedList = [...list];
        updatedList[index].quantity = newQuantity;
        setList(updatedList);
    };

    // Update prices when cardGroups change (e.g., when price type changes)
    useEffect(() => {
        if (cardGroups.length === 0) return;

        const updateListPrices = (list) => {
            return list.map(card => {
                const cardGroup = getCardGroup(card.name);
                if (cardGroup) {
                    // Find the matching edition for this card
                    const edition = cardGroup.editions.find(
                        e => e.subTypeName === card.subTypeName
                    ) || cardGroup.editions[0];
                    
                    return {
                        ...card,
                        price: edition.cardPrice,
                        availableEditions: cardGroup.editions,
                        cardGroup
                    };
                }
                return card;
            });
        };

        setHaveList(prevList => updateListPrices(prevList));
        setWantList(prevList => updateListPrices(prevList));
    }, [cardGroups]);

    // Load trade data from URL when cardGroups are available
    useEffect(() => {
        if (cardGroups.length > 0 && !hasLoadedFromURL && hasTradeDataInURL()) {
            const tradeData = decodeTradeFromURL();
            if (tradeData) {
                setUrlTradeData(tradeData);
                
                // Reconstruct cards from URL data using ID lookup
                const reconstructedHave = reconstructCardsFromURLData(tradeData.have, cardGroups, cardIdLookup);
                const reconstructedWant = reconstructCardsFromURLData(tradeData.want, cardGroups, cardIdLookup);
                
                setHaveList(reconstructedHave);
                setWantList(reconstructedWant);
                setHasLoadedFromURL(true);
                
                console.log(`Loaded trade from URL: ${reconstructedHave.length} have, ${reconstructedWant.length} want`);
                
                // Show warning if data is old
                if (tradeData.ageInDays && tradeData.ageInDays > 7) {
                    console.warn(`Trade data is ${Math.round(tradeData.ageInDays)} days old`);
                }
            }
        }
    }, [cardGroups, cardIdLookup, hasLoadedFromURL]);

    // Generate shareable URL
    const generateShareURL = () => {
        try {
            return encodeTradeToURL(haveList, wantList);
        } catch (error) {
            console.error('Failed to generate share URL:', error);
            return null;
        }
    };

    // Clear URL trade data
    const clearURLTradeData = () => {
        clearTradeFromURL();
        setUrlTradeData(null);
        setHasLoadedFromURL(false);
    };

    // Get URL size estimation
    const getURLSizeInfo = () => {
        return estimateTradeURLSize(haveList, wantList);
    };

    // Test URL encoding round-trip
    const testURLRoundTrip = () => {
        return testURLEncoding(haveList, wantList);
    };

    const haveTotal = useMemo(() => calculateTotal(haveList), [haveList]);
    const wantTotal = useMemo(() => calculateTotal(wantList), [wantList]);
    const diff = useMemo(() => calculateDiff(haveTotal, wantTotal), [haveTotal, wantTotal]);

    return {
        haveList,
        wantList,
        haveInput,
        wantInput,
        setHaveInput,
        setWantInput,
        addHaveCard: (name) => addCard(haveList, setHaveList, name || haveInput, setHaveInput),
        addWantCard: (name) => addCard(wantList, setWantList, name || wantInput, setWantInput),
        removeHaveCard: (index) => removeCard(haveList, setHaveList, index),
        removeWantCard: (index) => removeCard(wantList, setWantList, index),
        updateHaveCardQuantity: (i, q) => updateQuantity(haveList, setHaveList, i, q),
        updateWantCardQuantity: (i, q) => updateQuantity(wantList, setWantList, i, q),
        haveTotal,
        wantTotal,
        diff,
        // URL sharing functionality
        generateShareURL,
        clearURLTradeData,
        getURLSizeInfo,
        testURLRoundTrip,
        urlTradeData,
        hasLoadedFromURL
    };
}
