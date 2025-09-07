export async function fetchLastUpdatedTimestamp() {
    try {
        const response = await fetch('https://tcgcsv.com/last-updated.txt');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const timestamp = await response.text();
        return timestamp.trim();
    } catch (error) {
        console.error('Error fetching last updated timestamp:', error);
        return null;
    }
}
