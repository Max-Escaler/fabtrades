# Custom Search System Architecture

## Overview
This document describes the modular, custom search system that replaced Material UI's Autocomplete component. The new architecture is designed for maintainability, extensibility, and performance.

## Architecture

### Core Components

#### 1. **Utilities Layer** (`src/utils/searchUtils.js`)
Provides reusable utility functions:
- `filterCardOptions()` - Filters and sorts search results
- `highlightMatch()` - Identifies matching text segments for highlighting
- `getCardGradient()` - Returns foil gradient styles based on card type
- `debounce()` - Debounces function calls for performance

#### 2. **State Management** (`src/hooks/useSearch.js`)
Custom hook managing all search behavior:
- Input value state
- Dropdown open/close state
- Keyboard navigation (Arrow Up/Down, Enter, Escape, Tab)
- Click-outside detection
- Item selection handling
- Focus management

#### 3. **UI Components** (`src/components/search/`)

**SearchOption.jsx**
- Individual search result item
- Displays card name with highlighting
- Shows foil gradients (Rainbow Foil, Cold Foil, Normal)
- Handles hover states

**SearchDropdown.jsx**
- Container for search results
- Custom scrollbar styling
- Auto-scrolls highlighted items into view
- Handles empty states
- Supports top/bottom placement

**SearchInput.jsx**
- Main search input field
- Clear button functionality
- Search icon
- Integrates dropdown display
- Custom styling with brown theme

**SearchDialog.jsx**
- Full-screen mobile search experience
- Uses SearchInput internally
- Custom app bar with close button
- Auto-resets on close

**index.js**
- Centralized export point for all search components

## Features

### Current Features
✅ Keyboard navigation (arrows, enter, escape, tab)
✅ Mouse hover highlighting
✅ Search term highlighting in results
✅ Click-outside to close
✅ Clear button
✅ Foil gradients (Rainbow Foil, Cold Foil, Normal)
✅ Mobile-responsive (full-screen dialog on small screens)
✅ Top/bottom placement for dropdowns
✅ Performance optimized (limited results)
✅ Accessible (ARIA labels, keyboard support)

### Extensibility Points
The modular architecture makes it easy to add:

🔮 **Search Enhancements:**
- Debounced search (already implemented in utils)
- Fuzzy matching
- Recent searches
- Search history
- Favorite/pinned cards

🔮 **Filtering:**
- Price range filters
- Rarity filters
- Set filters
- Foil type filters

🔮 **Sorting:**
- Sort by price
- Sort by name
- Sort by rarity
- Sort by set

🔮 **Display:**
- Card images in results
- Price display in results
- Set icons
- Rarity indicators
- Custom result templates

🔮 **Advanced Features:**
- Multi-select
- Bulk actions
- Card previews on hover
- Quick-add buttons
- Inline editing

## File Structure

```
src/
├── utils/
│   └── searchUtils.js              # Utility functions
├── hooks/
│   └── useSearch.js                # Search state management hook
└── components/
    └── search/
        ├── index.js                # Export aggregator
        ├── SearchInput.jsx         # Main input component
        ├── SearchDropdown.jsx      # Results dropdown
        ├── SearchOption.jsx        # Individual result item
        └── SearchDialog.jsx        # Mobile full-screen search
```

## Usage Example

```jsx
import { SearchInput } from '../components/search';

<SearchInput
  label="Search for Cards"
  placeholder="Type to search..."
  items={cardOptions}
  value={searchValue}
  onChange={(e, val) => setSearchValue(val)}
  onSelect={(card) => handleAddCard(card)}
  disabled={false}
  fullWidth
  placement="bottom"
/>
```

## Foil Gradient System

The system automatically applies gradients based on card `subTypeName`:

### Rainbow Foil
Cards with "rainbow foil" in subTypeName get a vibrant rainbow gradient:
- Background: Soft pastel rainbow (pink → yellow → green → blue → purple)
- Hover: More saturated version

### Cold Foil
Cards with "cold foil" in subTypeName get a metallic blue gradient:
- Background: Alternating light blue and silver
- Hover: Darker blue tones

### Normal
All other cards get a subtle white/gray gradient

## Benefits Over Material UI Autocomplete

1. **Full Control**: Complete control over behavior and styling
2. **Modular**: Each piece is independently maintainable
3. **Extensible**: Easy to add new features without breaking existing code
4. **Performant**: Optimized for large datasets
5. **Custom Styling**: Brown theme with foil gradients
6. **Better Mobile UX**: Custom mobile dialog experience
7. **Smaller Bundle**: No Material UI Autocomplete dependency
8. **Type Safety**: Better TypeScript support (if needed)

## Migration Notes

The new system maintains 100% feature parity with the old Autocomplete:
- ✅ Keyboard navigation
- ✅ Mouse interaction
- ✅ Mobile support
- ✅ Foil gradients
- ✅ Filtering
- ✅ Selection handling
- ✅ Disabled state
- ✅ Top/bottom placement

## Performance Considerations

1. **Result Limiting**: Maximum 10 results per search, 20 when empty
2. **Debouncing**: Debounce utility available for API calls
3. **Virtual Scrolling**: Can be added for very large datasets
4. **Memoization**: React.memo can be added to SearchOption if needed

## Testing

Key test scenarios:
- [x] Search and select a card
- [x] Keyboard navigation (arrows, enter, escape)
- [x] Foil gradients display correctly
- [x] Mobile dialog works
- [x] Click outside closes dropdown
- [x] Clear button works
- [x] Disabled state respected
- [x] Top/bottom placement works

## Future Enhancements

Priority additions:
1. Search history/recent items
2. Advanced filters (price, rarity, set)
3. Sort options
4. Card preview on hover
5. Bulk selection mode
6. Keyboard shortcuts (Cmd+K to open)

