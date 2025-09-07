import { fetchLastUpdatedTimestamp, formatTimestamp } from '../../utils/timestampFetcher.js';

// Mock fetch globally
global.fetch = jest.fn();

describe('timestampFetcher', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  describe('fetchLastUpdatedTimestamp', () => {
    test('successfully fetches timestamp from URL', async () => {
      const mockTimestamp = '2025-09-02T20:10:03+0000';
      fetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockTimestamp)
      });

      const result = await fetchLastUpdatedTimestamp();
      
      expect(fetch).toHaveBeenCalledWith('https://tcgcsv.com/last-updated.txt');
      expect(result).toBe(mockTimestamp);
    });

    test('handles network errors gracefully', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await fetchLastUpdatedTimestamp();
      
      expect(result).toBeNull();
    });

    test('handles HTTP errors gracefully', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      const result = await fetchLastUpdatedTimestamp();
      
      expect(result).toBeNull();
    });
  });

  describe('formatTimestamp', () => {
    test('formats valid timestamp correctly', () => {
      const timestamp = '2025-09-02T20:10:03+0000';
      const formatted = formatTimestamp(timestamp);
      
      // Should format to a readable date string
      expect(formatted).toMatch(/Sep 2, 2025/);
      expect(formatted).toMatch(/\d{1,2}:\d{2}/); // Time format
    });

    test('handles null timestamp', () => {
      const result = formatTimestamp(null);
      expect(result).toBe('Unknown');
    });

    test('handles invalid timestamp', () => {
      const result = formatTimestamp('invalid-date');
      expect(result).toBe('Invalid Date');
    });

    test('handles empty string', () => {
      const result = formatTimestamp('');
      expect(result).toBe('Unknown');
    });
  });
});
