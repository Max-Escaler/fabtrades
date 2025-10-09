import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#8b4513', // Saddle brown - represents the earthy FAB feel
      light: '#a0643f',
      dark: '#5d2f0d',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#d4a574', // Tan/gold - complements the brown
      light: '#e4c09c',
      dark: '#a8824e',
      contrastText: '#2c1810',
    },
    success: {
      main: '#2e7d32', // Forest green
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
      default: '#f5f1ed', // Light cream background
      paper: '#ffffff',
    },
    text: {
      primary: '#2c1810', // Dark brown text
      secondary: '#5d3a1a',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    h4: {
      fontWeight: 700,
      letterSpacing: '-0.005em',
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  shadows: [
    'none',
    '0px 2px 4px rgba(44, 24, 16, 0.05)',
    '0px 4px 8px rgba(44, 24, 16, 0.08)',
    '0px 8px 16px rgba(44, 24, 16, 0.1)',
    '0px 12px 24px rgba(44, 24, 16, 0.12)',
    '0px 16px 32px rgba(44, 24, 16, 0.14)',
    '0px 20px 40px rgba(44, 24, 16, 0.16)',
    '0px 24px 48px rgba(44, 24, 16, 0.18)',
    '0px 28px 56px rgba(44, 24, 16, 0.2)',
    '0px 32px 64px rgba(44, 24, 16, 0.22)',
    '0px 36px 72px rgba(44, 24, 16, 0.24)',
    '0px 40px 80px rgba(44, 24, 16, 0.26)',
    '0px 44px 88px rgba(44, 24, 16, 0.28)',
    '0px 48px 96px rgba(44, 24, 16, 0.3)',
    '0px 52px 104px rgba(44, 24, 16, 0.32)',
    '0px 56px 112px rgba(44, 24, 16, 0.34)',
    '0px 60px 120px rgba(44, 24, 16, 0.36)',
    '0px 64px 128px rgba(44, 24, 16, 0.38)',
    '0px 68px 136px rgba(44, 24, 16, 0.4)',
    '0px 72px 144px rgba(44, 24, 16, 0.42)',
    '0px 76px 152px rgba(44, 24, 16, 0.44)',
    '0px 80px 160px rgba(44, 24, 16, 0.46)',
    '0px 84px 168px rgba(44, 24, 16, 0.48)',
    '0px 88px 176px rgba(44, 24, 16, 0.5)',
    '0px 92px 184px rgba(44, 24, 16, 0.52)',
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '10px 24px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 4px 12px rgba(44, 24, 16, 0.15)',
          },
        },
        contained: {
          '&:hover': {
            boxShadow: '0px 6px 16px rgba(44, 24, 16, 0.2)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        elevation1: {
          boxShadow: '0px 2px 8px rgba(44, 24, 16, 0.06)',
        },
        elevation2: {
          boxShadow: '0px 4px 12px rgba(44, 24, 16, 0.08)',
        },
        elevation3: {
          boxShadow: '0px 8px 20px rgba(44, 24, 16, 0.1)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0px 4px 12px rgba(44, 24, 16, 0.08)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 8,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0px 2px 12px rgba(44, 24, 16, 0.12)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#a0643f',
            },
          },
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
});

export default theme;

