import React, { createContext, useContext, useState } from 'react';

const PriceContext = createContext();

export const usePriceType = () => {
    const context = useContext(PriceContext);
    if (!context) {
        throw new Error('usePriceType must be used within a PriceProvider');
    }
    return context;
};

export const PriceProvider = ({ children }) => {
    const [priceType, setPriceType] = useState('low'); // 'market' or 'low'

    const value = {
        priceType,
        setPriceType
    };

    return (
        <PriceContext.Provider value={value}>
            {children}
        </PriceContext.Provider>
    );
};

export default PriceContext;

