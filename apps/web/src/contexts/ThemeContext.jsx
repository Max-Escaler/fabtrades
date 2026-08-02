import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { createTheme } from '@mui/material/styles';
import brandPalette from '../../../../packages/contracts/brand_palette.json';

const ThemeContext = createContext();

export const useThemeMode = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useThemeMode must be used within a ThemeModeProvider');
    }
    return context;
};

// FAB brand palette — pinned by packages/contracts/brand_palette.json (matches
// mobile AppTheme: saddle brown, tan, cream / espresso).
const {
    brown,
    brownBright,
    brownDeep,
    tan,
    tanBright,
    tanDeep,
    cream,
    espresso,
    espressoDeep,
} = brandPalette.tokens;

// Light theme - FAB earthy warm tones
const lightTheme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: brown,
            light: brownBright,
            dark: brownDeep,
            contrastText: '#ffffff',
        },
        secondary: {
            main: tan,
            light: tanBright,
            dark: tanDeep,
            contrastText: espresso,
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
            default: cream,
            paper: '#ffffff',
        },
        text: {
            primary: espresso,
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
                    background: `linear-gradient(135deg, ${brown} 0%, ${brownBright} 100%)`,
                    '&:hover': {
                        background: `linear-gradient(135deg, ${brownDeep} 0%, ${brown} 100%)`,
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
                    background: `linear-gradient(135deg, ${brown} 0%, ${brownBright} 100%)`,
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
            dark: brownBright,
            contrastText: espressoDeep,
        },
        secondary: {
            main: tanBright,
            light: '#f0d4b8',
            dark: tan,
            contrastText: espressoDeep,
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
            default: espressoDeep,
            paper: espresso,
        },
        text: {
            primary: cream,
            secondary: tan,
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
                    background: `linear-gradient(135deg, ${brown} 0%, #c87137 100%)`,
                    '&:hover': {
                        background: `linear-gradient(135deg, ${brownBright} 0%, #e09050 100%)`,
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
                    background: `linear-gradient(135deg, ${brown} 0%, #c87137 100%)`,
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
    // Check for saved preference; default to dark
    const getInitialMode = () => {
        const saved = localStorage.getItem('fabtrades-theme-mode');
        if (saved) {
            return saved;
        }
        return 'dark';
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

