// The upstream tcgcsv.com endpoint does not send CORS headers, so the browser
// blocks direct fetches. Instead, `npm run download-csvs` mirrors the latest
// timestamp to /last-updated.txt in our public directory, which we fetch here.
export async function fetchLastUpdatedTimestamp() {
    try {
        const response = await fetch(`${import.meta.env.BASE_URL || '/'}last-updated.txt`, {
            cache: 'no-cache',
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const timestamp = (await response.text()).trim();
        if (!timestamp) {
            throw new Error('Empty timestamp');
        }
        return timestamp;
    } catch (error) {
        console.error('Error fetching last updated timestamp:', error);
        return null;
    }
}
