export const calculateTotal = (list) =>
    list.reduce((sum, item) => sum + (item.price * item.quantity), 0);

export const calculateDiff = (haveTotal, wantTotal) =>
    haveTotal - wantTotal;
