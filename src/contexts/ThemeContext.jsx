import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { createTheme } from '@mui/material/styles';

const ThemeContext = createContext();

export const useThemeMode = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useThemeMode must be used within a ThemeModeProvider');
    }
    return context;
};

// FAB color palette
// Primary: Rich brown/saddle brown
// Accent: Gold/tan
// Secondary: Warm cream

// Light theme - FAB earthy warm tones
const lightTheme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#8b4513',      // Saddle brown
            light: '#a0643f',
            dark: '#5d2f0d',
            contrastText: '#ffffff',
        },
        secondary: {
            main: '#d4a574',      // Tan/gold
            light: '#e4c09c',
            dark: '#a8824e',
            contrastText: '#2c1810',
        },
        success: {
            main: '#2e7d32',
            light: '#4caf50',
            dark: '#1b5e20',
        },
        error: {
            main: '#c62828',
            light: '#ef5350',
            dark: '#b71c1c',
        },
        warning: {
            main: '#f57c00',
            light: '#ff9800',
            dark: '#e65100',
        },
        info: {
            main: '#0277bd',
            light: '#03a9f4',
            dark: '#01579b',
        },
        background: {
            default: '#f5f1ed',   // Light cream
            paper: '#ffffff',
        },
        text: {
            primary: '#2c1810',
            secondary: '#5d3a1a',
        },
    },
    typography: {
        fontFamily: '"Outfit", "Poppins", "Roboto", "Helvetica", "Arial", sans-serif',
        button: {
            textTransform: 'none',
            fontWeight: 600,
        },
    },
    shape: {
        borderRadius: 12,
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    padding: '10px 24px',
                    boxShadow: 'none',
                },
                contained: {
                    background: 'linear-gradient(135deg, #8b4513 0%, #a0643f 100%)',
                    '&:hover': {
                        background: 'linear-gradient(135deg, #5d2f0d 0%, #8b4513 100%)',
                    },
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    fontWeight: 600,
                    borderRadius: 8,
                },
                colorPrimary: {
                    background: 'linear-gradient(135deg, #8b4513 0%, #a0643f 100%)',
                },
                colorSuccess: {
                    background: 'linear-gradient(135deg, #2e7d32 0%, #4caf50 100%)',
                },
            },
        },
    },
});

// Dark theme - Deep rich brown/burgundy
const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#c87137',      // Lighter brown for visibility
            light: '#e09050',
            dark: '#a0643f',
            contrastText: '#1a0f0a',
        },
        secondary: {
            main: '#e4c09c',      // Light tan
            light: '#f0d4b8',
            dark: '#d4a574',
            contrastText: '#1a0f0a',
        },
        success: {
            main: '#4caf50',
            light: '#81c784',
            dark: '#2e7d32',
        },
        error: {
            main: '#ef5350',
            light: '#ff8a80',
            dark: '#c62828',
        },
        warning: {
            main: '#ff9800',
            light: '#ffb74d',
            dark: '#f57c00',
        },
        info: {
            main: '#29b6f6',
            light: '#4fc3f7',
            dark: '#0288d1',
        },
        background: {
            default: '#1a0f0a',   // Deep brown-black
            paper: '#2c1810',
        },
        text: {
            primary: '#f5f1ed',
            secondary: '#d4a574',
        },
    },
    typography: {
        fontFamily: '"Outfit", "Poppins", "Roboto", "Helvetica", "Arial", sans-serif',
        button: {
            textTransform: 'none',
            fontWeight: 600,
        },
    },
    shape: {
        borderRadius: 12,
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    padding: '10px 24px',
                    boxShadow: 'none',
                },
                contained: {
                    background: 'linear-gradient(135deg, #8b4513 0%, #c87137 100%)',
                    '&:hover': {
                        background: 'linear-gradient(135deg, #a0643f 0%, #e09050 100%)',
                    },
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    fontWeight: 600,
                    borderRadius: 8,
                },
                colorPrimary: {
                    background: 'linear-gradient(135deg, #8b4513 0%, #c87137 100%)',
                },
                colorSuccess: {
                    background: 'linear-gradient(135deg, #2e7d32 0%, #4caf50 100%)',
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                },
            },
        },
    },
});

export const ThemeModeProvider = ({ children }) => {
    // Check for saved preference or system preference
    const getInitialMode = () => {
        const saved = localStorage.getItem('fabtrades-theme-mode');
        if (saved) {
            return saved;
        }
        // Check system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    };

    const [mode, setMode] = useState(getInitialMode);

    // Save preference to localStorage
    useEffect(() => {
        localStorage.setItem('fabtrades-theme-mode', mode);
    }, [mode]);

    const toggleMode = () => {
        setMode(prevMode => prevMode === 'light' ? 'dark' : 'light');
    };

    const theme = useMemo(() => {
        return mode === 'dark' ? darkTheme : lightTheme;
    }, [mode]);

    const value = {
        mode,
        setMode,
        toggleMode,
        theme,
        isDark: mode === 'dark'
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

export default ThemeContext;

