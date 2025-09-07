import { useState, useMemo } from "react";
import { calculateTotal, calculateDiff } from "../utils/trade.js";

export function useTradeState(cardGroups) {
    const [haveList, setHaveList] = useState([]);
    const [wantList, setWantList] = useState([]);
    const [haveInput, setHaveInput] = useState("");
    const [wantInput, setWantInput] = useState("");

    const getCardGroup = (cardName) =>
        cardGroups.find(group => group.name === cardName) || null;

    const addCard = (list, setList, cardName, inputSetter) => {
        if (cardName && !list.some(item => item.name === cardName)) {
            const cardGroup = getCardGroup(cardName);
            if (cardGroup && cardGroup.editions.length > 0) {
                const defaultEdition = cardGroup.editions[0];
                setList([
                    ...list,
                    {
                        name: cardName,
                        price: defaultEdition.cardPrice,
                        cardGroup,
                        availableEditions: cardGroup.editions,
                        quantity: 1
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
        diff
    };
}
