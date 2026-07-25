export  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(amount);
};

export function formatTimestamp(timestamp) {
    if (!timestamp) return 'Unknown';

    try {
        // Parse the ISO timestamp (e.g., "2025-09-02T20:10:03+0000")
        const date = new Date(timestamp);

        // Format for display
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short'
        });
    } catch (error) {
        console.error('Error formatting timestamp:', error);
        return 'Invalid date';
    }
}
