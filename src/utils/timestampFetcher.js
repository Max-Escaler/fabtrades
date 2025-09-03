// Utility function to fetch the last updated timestamp from TCG CSV
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

// Function to format the timestamp for display
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
