# Auto-Save Trades Feature

## Summary

Simplified the trade saving process by removing the naming dialog and automatically generating trade names based on card counts when the "Save Trade" button is clicked.

## Changes Made

### Files Modified

**`src/components/elements/TradeSummary.jsx`**

1. **Removed SaveTradeDialog import and component**
   - No longer need the dialog component
   - Removed `showSaveDialog` state
   - Removed dialog component from JSX

2. **Updated `handleSaveTrade` function**
   - Now takes no parameters (previously took `tradeName`)
   - Auto-generates trade name using format: `traded +X, -Y cards`
     - `+X` = number of cards in want list (cards you're receiving)
     - `-Y` = number of cards in have list (cards you're giving)
   - Example: `traded +3, -1 cards` means you're getting 3 cards and giving 1 card

3. **Updated Save Trade button**
   - Now calls `handleSaveTrade` directly (onClick)
   - Shows "Saving..." text while saving
   - Added `saving` to disabled condition

### Files Deleted

**`src/components/history/SaveTradeDialog.jsx`**
- No longer needed with auto-save functionality

## Trade Name Format

Trades are automatically named using the pattern:
```
traded +{wantCount}, -{haveCount} cards
```

**Examples:**
- `traded +5, -3 cards` - You're getting 5 cards and giving 3 cards
- `traded +1, -1 cards` - You're getting 1 card and giving 1 card
- `traded +10, -2 cards` - You're getting 10 cards and giving 2 cards

This format provides a quick snapshot of the trade balance in terms of card count.

## User Experience Flow

### Before (with dialog):
1. Click "Save Trade"
2. Dialog opens
3. Enter trade name
4. Click Save
5. Trade saved

### After (auto-save):
1. Click "Save Trade"
2. Trade saved immediately with auto-generated name
3. Success notification appears

## Benefits

- **Faster**: One click to save instead of two
- **No decision fatigue**: Users don't need to think of a name
- **Consistent naming**: All trades follow the same pattern
- **Still editable**: Users can edit trade names later in the Trade History page

## Trade History Page

The Trade History page still supports:
- ✅ Editing trade names (click edit icon)
- ✅ Loading trades (click load icon)
- ✅ Deleting trades (click delete icon)
- ✅ Searching trades by name

## Build Status

- ✅ Build successful
- ✅ No linter errors
- ✅ All functionality working

## Testing Checklist

- [ ] Click "Save Trade" button saves immediately
- [ ] Trade appears in history with correct auto-generated name
- [ ] Button shows "Saving..." during save operation
- [ ] Success notification appears after save
- [ ] Can still edit trade names in Trade History page
- [ ] Trade name format is correct (+want count, -have count)
