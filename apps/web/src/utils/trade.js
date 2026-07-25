export const calculateTotal = (list) =>
    list.reduce((sum, item) => sum + (item.price * item.quantity), 0);

/** Sum of lowPrice × quantity (missing lows count as 0). */
export const calculateLowTotal = (list) =>
    list.reduce(
        (sum, item) => sum + ((Number(item.lowPrice) || 0) * (item.quantity || 0)),
        0
    );

export const calculateDiff = (haveTotal, wantTotal) =>
    haveTotal - wantTotal;
