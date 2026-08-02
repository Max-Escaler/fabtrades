import React, { useState } from 'react';
import {
    Box,
    Paper,
    Typography,
    useTheme,
    useMediaQuery,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CardList from './CardList.jsx';
import { SearchInput, SearchDialog } from '../search';
import { useThemeMode } from "../../contexts/ThemeContext.jsx";

const CardPanel = ({ 
    title, 
    cards, 
    cardOptions, 
    inputValue, 
    onInputChange, 
    onAddCard, 
    onRemoveCard, 
    onUpdateQuantity,
    disabled = false,
    isLandscape = false,
    viewMode = 'list',
}) => {
    const { isDark } = useThemeMode();
    const theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
    const [searchDialogOpen, setSearchDialogOpen] = useState(false);

    return (
        <Paper 
            elevation={isLandscape ? 2 : 0}
            sx={{ 
                flex: 1,
                width: '100%',
                maxWidth: '100%',
                minHeight: isLandscape ? 0 : { xs: '250px', sm: '300px', md: '350px' },
                minWidth: 0,
                p: isLandscape ? 1.25 : { xs: 1.25, sm: 1.5 },
                display: 'flex',
                flexDirection: 'column',
                transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
                borderRadius: isLandscape ? 2 : 0,
                border: isLandscape 
                    ? `1px solid ${isDark ? 'rgba(200, 113, 55, 0.22)' : 'rgba(139, 69, 19, 0.15)'}` 
                    : `1px solid ${isDark ? 'rgba(200, 113, 55, 0.25)' : 'rgba(139, 69, 19, 0.15)'}`,
                borderTop: isLandscape 
                    ? `1px solid ${isDark ? 'rgba(200, 113, 55, 0.22)' : 'rgba(139, 69, 19, 0.15)'}` 
                    : `4px solid ${isDark ? '#d4a574' : '#8b4513'}`,
                boxSizing: 'border-box',
                background: isDark 
                    ? 'linear-gradient(180deg, #2c1810 0%, #1a0f0a 100%)' 
                    : 'linear-gradient(180deg, #ffffff 0%, #fafafa 100%)',
                boxShadow: isLandscape 
                    ? (isDark ? '0 4px 14px rgba(0, 0, 0, 0.25)' : '0 4px 14px rgba(139, 69, 19, 0.1)')
                    : (isDark ? '0 2px 8px rgba(0, 0, 0, 0.2)' : '0 2px 8px rgba(139, 69, 19, 0.08)'),
            }}
        >
            <Box sx={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: 1,
                mb: isLandscape ? 1 : 1.25,
                width: '100%',
                pb: isLandscape ? 0.75 : 1,
                borderBottom: `1px solid ${isDark ? 'rgba(212, 165, 116, 0.25)' : 'rgba(139, 69, 19, 0.1)'}`
            }}>
                <Typography 
                    variant="h6" 
                    sx={{ 
                        fontSize: isLandscape
                            ? '0.95rem'
                            : { xs: '0.95rem', sm: '1.05rem' },
                        fontWeight: 700,
                        color: isDark ? '#e4c09c' : '#2c1810',
                        letterSpacing: '-0.01em',
                        lineHeight: 1.2,
                        flexShrink: 0,
                        whiteSpace: 'nowrap',
                    }}
                >
                    {title}
                </Typography>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                    {isSmallScreen ? (
                        <Box
                            onClick={() => !disabled && setSearchDialogOpen(true)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    if (!disabled) setSearchDialogOpen(true);
                                }
                            }}
                            aria-label={`Search cards for ${title}`}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.75,
                                minHeight: 36,
                                px: 1,
                                borderRadius: 1,
                                border: isDark
                                    ? '1px solid rgba(200, 113, 55, 0.35)'
                                    : '1px solid rgba(139, 69, 19, 0.25)',
                                backgroundColor: isDark ? '#1a0f0a' : '#ffffff',
                                cursor: disabled ? 'default' : 'pointer',
                                opacity: disabled ? 0.6 : 1,
                            }}
                        >
                            <SearchIcon sx={{
                                fontSize: '1rem',
                                color: isDark ? '#d4a574' : '#8b4513',
                            }} />
                            <Typography
                                variant="body2"
                                sx={{
                                    color: isDark ? 'rgba(212, 165, 116, 0.75)' : 'rgba(93, 58, 26, 0.55)',
                                    fontSize: '0.8125rem',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                Search cards…
                            </Typography>
                        </Box>
                    ) : (
                        <SearchInput
                            label=""
                            placeholder="Search cards…"
                            items={cardOptions || []}
                            value={inputValue || ''}
                            onChange={onInputChange}
                            onSelect={onAddCard}
                            disabled={disabled}
                            fullWidth
                            size="small"
                            placement="bottom"
                            keepOpenOnSelect
                            keepInputOnSelect
                        />
                    )}
                </Box>
            </Box>
            
            <CardList
                cards={cards}
                onRemoveCard={onRemoveCard}
                onUpdateQuantity={onUpdateQuantity}
                disabled={disabled}
                viewMode={viewMode}
                isLandscape={isLandscape}
            />

            <SearchDialog
                open={searchDialogOpen}
                onClose={() => setSearchDialogOpen(false)}
                title={`Search Cards for ${title}`}
                items={cardOptions || []}
                onSelect={(card) => {
                    if (card) onAddCard(card);
                }}
                keepOpenOnSelect
                keepInputOnSelect
            />
        </Paper>
    );
};

export default CardPanel;
