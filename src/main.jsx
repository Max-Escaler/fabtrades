import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import './index.css'
import App from './App.jsx'
import { CardDataProvider } from "./hooks/useCardData.jsx";
import { PriceProvider } from "./contexts/PriceContext.jsx";
import { ThemeModeProvider, useThemeMode } from "./contexts/ThemeContext.jsx";

// Wrapper component that applies the dynamic theme
const ThemedApp = () => {
    const { theme } = useThemeMode();
    
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <PriceProvider>
                <CardDataProvider>
                    <App />
                </CardDataProvider>
            </PriceProvider>
        </ThemeProvider>
    );
};

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <ThemeModeProvider>
            <ThemedApp />
        </ThemeModeProvider>
    </StrictMode>,
)
