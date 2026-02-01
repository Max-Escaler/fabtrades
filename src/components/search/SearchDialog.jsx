import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    AppBar,
    Toolbar,
    IconButton,
    Typography,
    Box
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchInput from './SearchInput';
import { useThemeMode } from '../../contexts/ThemeContext.jsx';

/**
 * SearchDialog Component
 * Full-screen search dialog for mobile devices
 */
const SearchDialog = ({
    open,
    onClose,
    title = 'Search',
    items = [],
    onSelect,
    keepOpenOnSelect = false,
    keepInputOnSelect = false
}) => {
    const [searchValue, setSearchValue] = useState('');
    const { isDark } = useThemeMode();

    // Reset search when dialog closes
    useEffect(() => {
        if (!open) {
            setSearchValue('');
        }
    }, [open]);

  const handleSelect = (item) => {
    onSelect?.(item);
    if (!keepInputOnSelect) {
      setSearchValue('');
    }
    if (!keepOpenOnSelect) {
      onClose();
    }
  };

    return (
        <Dialog
            fullScreen
            open={open}
            onClose={onClose}
            sx={{
                '& .MuiDialog-paper': {
                    backgroundColor: isDark ? '#1a0f0a' : '#fafafa'
                }
            }}
        >
            <AppBar 
                position="static" 
                elevation={0}
                sx={{ 
                    background: isDark 
                        ? 'linear-gradient(135deg, #2c1810 0%, #1a0f0a 100%)'
                        : 'linear-gradient(135deg, #8b4513 0%, #5d2f0d 100%)',
                    borderBottom: '3px solid #d4a574',
                    boxShadow: isDark 
                        ? '0 4px 20px rgba(0, 0, 0, 0.4)'
                        : '0 4px 20px rgba(139, 69, 19, 0.3)'
                }}
            >
                <Toolbar>
                    <IconButton
                        edge="start"
                        color="inherit"
                        onClick={onClose}
                        aria-label="close"
                        sx={{ mr: 2 }}
                    >
                        <CloseIcon />
                    </IconButton>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        {title}
                    </Typography>
                </Toolbar>
            </AppBar>
            
            <DialogContent sx={{ p: 2, backgroundColor: isDark ? '#1a0f0a' : '#fafafa' }}>
                <SearchInput
                    label="Search for Cards"
                    placeholder="Start typing to search..."
                    items={items}
                    value={searchValue}
                    onChange={(e, val) => setSearchValue(val)}
                    onSelect={handleSelect}
                    fullWidth
                    placement="bottom"
                    autoFocus
          keepOpenOnSelect={keepOpenOnSelect}
          keepInputOnSelect={keepInputOnSelect}
                />
                
                <Box sx={{ mt: 3, px: 1 }}>
                    <Typography variant="body2" sx={{ color: isDark ? '#d4a574' : 'text.secondary' }}>
                        Select a card from the dropdown to add it to your list, or type to search for specific cards.
                    </Typography>
                </Box>
            </DialogContent>
        </Dialog>
    );
};

export default SearchDialog;
