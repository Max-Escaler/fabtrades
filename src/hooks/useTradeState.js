import { useState, useMemo, useEffect } from "react";
import { calculateTotal, calculateLowTotal, calculateDiff } from "../utils/trade.js";
import { 
    decodeTradeFromURL, 
    reconstructCardsFromURLData,
    hasTradeDataInURL,
    clearTradeFromURL
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
        
        if (!cardName) return;

        // If this printing is already on the side, bump quantity (matches mobile).
        const existingIndex = selectedCard
            ? list.findIndex(item => item.uniqueId === selectedCard._uniqueId)
            : list.findIndex(item => item.name === cardName);

        if (existingIndex >= 0) {
            const updated = [...list];
            const current = updated[existingIndex];
            updated[existingIndex] = {
                ...current,
                quantity: Math.min(6, (current.quantity || 1) + 1),
            };
            setList(updated);
            inputSetter("");
            return;
        }

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
                    lowPrice: edition.lowPrice,
                    cardGroup,
                    availableEditions: cardGroup.editions,
                    quantity: 1,
                    subTypeName: subTypeName,  // Store subTypeName for gradient rendering
                    uniqueId: selectedCard ? selectedCard._uniqueId : edition.uniqueId,
                    imageUrl: selectedCard?.imageUrl || edition.imageUrl || '',
                    imageUrlFallback: selectedCard?.imageUrlFallback || edition.imageUrlFallback || ''
                }
            ]);
            inputSetter("");
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

    // Refresh prices when catalog groups change (e.g. after data load).
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
                        lowPrice: edition.lowPrice,
                        availableEditions: cardGroup.editions,
                        cardGroup,
                        imageUrl: card.imageUrl || edition.imageUrl || '',
                        imageUrlFallback: card.imageUrlFallback || edition.imageUrlFallback || ''
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

    // Clear URL trade data
    const clearURLTradeData = () => {
        clearTradeFromURL();
        setUrlTradeData(null);
        setHasLoadedFromURL(false);
    };

    // Load trade from history
    const loadTradeFromHistory = (trade) => {
        if (!trade) return;

        // Helper function to reconstruct cards from history data
        const reconstructFromHistory = (cardList) => {
            if (!cardList || !Array.isArray(cardList)) return [];
            
            return cardList.map(savedCard => {
                // Find the current card group to get latest pricing
                const cardGroup = getCardGroup(savedCard.name);
                
                if (!cardGroup || !cardGroup.editions || cardGroup.editions.length === 0) {
                    console.warn(`Card not found or has no editions: ${savedCard.name}`);
                    return null;
                }
                
                // Find matching edition by subTypeName or price
                let selectedEdition = cardGroup.editions[0]; // default
                
                if (savedCard.subTypeName) {
                    const editionByType = cardGroup.editions.find(
                        e => e.subTypeName === savedCard.subTypeName
                    );
                    if (editionByType) {
                        selectedEdition = editionByType;
                    }
                }
                
                // If we have a uniqueId, try to find exact match
                if (savedCard.uniqueId) {
                    const editionById = cardGroup.editions.find(
                        e => e.uniqueId === savedCard.uniqueId
                    );
                    if (editionById) {
                        selectedEdition = editionById;
                    }
                }
                
                return {
                    name: cardGroup.name,
                    price: selectedEdition.cardPrice,
                    lowPrice: selectedEdition.lowPrice,
                    quantity: savedCard.quantity || 1,
                    cardGroup,
                    availableEditions: cardGroup.editions,
                    subTypeName: selectedEdition.subTypeName || 'Normal',
                    uniqueId: selectedEdition.uniqueId,
                    imageUrl: savedCard.imageUrl || selectedEdition.imageUrl || '',
                    imageUrlFallback: savedCard.imageUrlFallback || selectedEdition.imageUrlFallback || ''
                };
            }).filter(card => card !== null);
        };

        const reconstructedHave = reconstructFromHistory(trade.have_list);
        const reconstructedWant = reconstructFromHistory(trade.want_list);

        setHaveList(reconstructedHave);
        setWantList(reconstructedWant);

        // Clear URL data when loading from history
        clearURLTradeData();

        console.log(`Loaded trade from history: "${trade.name}" - ${reconstructedHave.length} have, ${reconstructedWant.length} want cards`);
    };

    const haveTotal = useMemo(() => calculateTotal(haveList), [haveList]);
    const wantTotal = useMemo(() => calculateTotal(wantList), [wantList]);
    const haveLowTotal = useMemo(() => calculateLowTotal(haveList), [haveList]);
    const wantLowTotal = useMemo(() => calculateLowTotal(wantList), [wantList]);
    const diff = useMemo(() => calculateDiff(haveTotal, wantTotal), [haveTotal, wantTotal]);
    const lowDiff = useMemo(
        () => calculateDiff(haveLowTotal, wantLowTotal),
        [haveLowTotal, wantLowTotal]
    );

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
        haveLowTotal,
        wantLowTotal,
        diff,
        lowDiff,
        // URL trade-loading functionality
        clearURLTradeData,
        urlTradeData,
        hasLoadedFromURL,
        // Trade history functionality
        loadTradeFromHistory
    };
}
