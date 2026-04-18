import { useState } from 'react';
import { 
    AppBar, Toolbar, Typography, Box, IconButton, Drawer, List, 
    ListItem, ListItemButton, ListItemText, Tooltip, Divider 
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { DarkMode, LightMode, ChevronRight } from '@mui/icons-material';
import { Link, useLocation } from 'react-router-dom';
import { formatTimestamp } from "../../utils/helpers.js";
import { useThemeMode } from "../../contexts/ThemeContext.jsx";
import { useSets } from "../../hooks/useSets.js";
import LoginButton from '../auth/LoginButton.jsx';

const RECENT_SETS_LIMIT = 8;

const Header = ({ lastUpdatedTimestamp }) => {
    const location = useLocation();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const { isDark, toggleMode } = useThemeMode();
    const { sets } = useSets();
    const recentSets = sets.slice(0, RECENT_SETS_LIMIT);

    const toggleDrawer = (open) => (event) => {
        if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
            return;
        }
        setDrawerOpen(open);
    };

    return (
        <>
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
            <Toolbar sx={{
                px: { xs: 1, sm: 2, md: 3 },
                py: { xs: 1, sm: 1.25, md: 1.75 },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <IconButton
                    color="inherit"
                    aria-label="open drawer"
                    onClick={toggleDrawer(true)}
                    edge="start"
                    sx={{
                        '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            transform: 'scale(1.05)',
                        },
                        transition: 'all 0.2s ease-in-out'
                    }}
                >
                    <MenuIcon />
                </IconButton>

                <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center',
                    flexGrow: 1
                }}>
                    <Typography
                        variant="h4"
                        sx={{
                            fontWeight: 800,
                            fontSize: { xs: '1.4rem', sm: '1.75rem', md: '2rem' },
                            background: 'linear-gradient(135deg, #ffffff 0%, #d4a574 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            letterSpacing: '0.02em',
                            textShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
                        }}
                    >
                        ⚔️ FAB Trades
                    </Typography>
                    <Typography
                        variant="body2"
                        sx={{
                            fontSize: { xs: '0.7rem', sm: '0.8rem' },
                            mt: 0.5,
                            opacity: 0.95,
                            fontWeight: 500,
                            color: isDark ? '#d4a574' : 'rgba(255, 255, 255, 0.9)'
                        }}
                    >
                        Prices last updated: {lastUpdatedTimestamp ? formatTimestamp(lastUpdatedTimestamp) : 'Loading...'}
                    </Typography>
                </Box>

                {/* Right side: Dark mode toggle and Login */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Tooltip title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
                        <IconButton
                            onClick={toggleMode}
                            sx={{
                                color: '#d4a574',
                                '&:hover': {
                                    backgroundColor: 'rgba(212, 165, 116, 0.15)',
                                }
                            }}
                        >
                            {isDark ? <LightMode /> : <DarkMode />}
                        </IconButton>
                    </Tooltip>
                    <LoginButton />
                </Box>
            </Toolbar>
        </AppBar>
        
        <Drawer
            anchor="left"
            open={drawerOpen}
            onClose={toggleDrawer(false)}
            PaperProps={{
                sx: {
                    background: isDark 
                        ? 'linear-gradient(180deg, #2c1810 0%, #1a0f0a 100%)'
                        : 'linear-gradient(180deg, #ffffff 0%, #f5f1ed 100%)',
                    borderRight: '2px solid #d4a574',
                }
            }}
        >
            <Box
                sx={{ width: 280 }}
                role="presentation"
                onClick={toggleDrawer(false)}
                onKeyDown={toggleDrawer(false)}
            >
                <Box sx={{ 
                    p: 3, 
                    background: isDark 
                        ? 'linear-gradient(135deg, #3d2318 0%, #2c1810 100%)'
                        : 'linear-gradient(135deg, #8b4513 0%, #5d2f0d 100%)',
                    borderBottom: '3px solid #d4a574',
                    mb: 2
                }}>
                    <Typography 
                        variant="h5" 
                        sx={{ 
                            color: 'white', 
                            fontWeight: 700,
                            textAlign: 'center'
                        }}
                    >
                        Menu
                    </Typography>
                </Box>
                <List sx={{ px: 1 }}>
                    <ListItem disablePadding sx={{ mb: 1 }}>
                        <ListItemButton 
                            component={Link} 
                            to="/"
                            sx={{
                                borderRadius: 2,
                                backgroundColor: location.pathname === '/' 
                                    ? (isDark ? 'rgba(200, 113, 55, 0.2)' : 'rgba(139, 69, 19, 0.1)')
                                    : 'transparent',
                                '&:hover': {
                                    backgroundColor: isDark ? 'rgba(200, 113, 55, 0.25)' : 'rgba(139, 69, 19, 0.15)',
                                },
                                transition: 'all 0.2s ease-in-out'
                            }}
                        >
                            <ListItemText 
                                primary="Trade Calculator" 
                                sx={{ 
                                    fontWeight: location.pathname === '/' ? 700 : 500,
                                    color: location.pathname === '/' 
                                        ? (isDark ? '#e4c09c' : '#8b4513')
                                        : (isDark ? '#f5f1ed' : '#2c1810'),
                                    '& .MuiTypography-root': {
                                        fontSize: '1rem'
                                    }
                                }}
                            />
                        </ListItemButton>
                    </ListItem>
                    <ListItem disablePadding sx={{ mb: 1 }}>
                        <ListItemButton 
                            component={Link} 
                            to="/history"
                            sx={{
                                borderRadius: 2,
                                backgroundColor: location.pathname === '/history' 
                                    ? (isDark ? 'rgba(200, 113, 55, 0.2)' : 'rgba(139, 69, 19, 0.1)')
                                    : 'transparent',
                                '&:hover': {
                                    backgroundColor: isDark ? 'rgba(200, 113, 55, 0.25)' : 'rgba(139, 69, 19, 0.15)',
                                },
                                transition: 'all 0.2s ease-in-out'
                            }}
                        >
                            <ListItemText 
                                primary="Trade History"
                                sx={{ 
                                    fontWeight: location.pathname === '/history' ? 700 : 500,
                                    color: location.pathname === '/history' 
                                        ? (isDark ? '#e4c09c' : '#8b4513')
                                        : (isDark ? '#f5f1ed' : '#2c1810'),
                                    '& .MuiTypography-root': {
                                        fontSize: '1rem'
                                    }
                                }}
                            />
                        </ListItemButton>
                    </ListItem>
                    <ListItem disablePadding>
                        <ListItemButton
                            component={Link}
                            to="/sets"
                            sx={{
                                borderRadius: 2,
                                backgroundColor: location.pathname === '/sets'
                                    ? (isDark ? 'rgba(200, 113, 55, 0.2)' : 'rgba(139, 69, 19, 0.1)')
                                    : 'transparent',
                                '&:hover': {
                                    backgroundColor: isDark ? 'rgba(200, 113, 55, 0.25)' : 'rgba(139, 69, 19, 0.15)',
                                },
                                transition: 'all 0.2s ease-in-out'
                            }}
                        >
                            <ListItemText
                                primary="Browse Sets"
                                sx={{
                                    fontWeight: location.pathname.startsWith('/sets') ? 700 : 500,
                                    color: location.pathname.startsWith('/sets')
                                        ? (isDark ? '#e4c09c' : '#8b4513')
                                        : (isDark ? '#f5f1ed' : '#2c1810'),
                                    '& .MuiTypography-root': { fontSize: '1rem' }
                                }}
                            />
                        </ListItemButton>
                    </ListItem>
                </List>

                {recentSets.length > 0 && (
                    <>
                        <Divider
                            sx={{
                                my: 2,
                                mx: 2,
                                borderColor: isDark ? 'rgba(212, 165, 116, 0.2)' : 'rgba(139, 69, 19, 0.15)'
                            }}
                        />
                        <Typography
                            variant="overline"
                            sx={{
                                display: 'block',
                                px: 3,
                                mb: 0.5,
                                color: isDark ? '#d4a574' : '#8b4513',
                                fontWeight: 700,
                                letterSpacing: '0.08em',
                                fontSize: '0.7rem'
                            }}
                        >
                            Recent Sets
                        </Typography>
                        <List sx={{ px: 1, pt: 0 }} dense>
                            {recentSets.map((set) => {
                                const active = location.pathname === `/sets/${set.groupId}`;
                                return (
                                    <ListItem key={set.groupId} disablePadding>
                                        <ListItemButton
                                            component={Link}
                                            to={`/sets/${set.groupId}`}
                                            sx={{
                                                borderRadius: 2,
                                                py: 0.75,
                                                backgroundColor: active
                                                    ? (isDark ? 'rgba(200, 113, 55, 0.2)' : 'rgba(139, 69, 19, 0.1)')
                                                    : 'transparent',
                                                '&:hover': {
                                                    backgroundColor: isDark ? 'rgba(200, 113, 55, 0.18)' : 'rgba(139, 69, 19, 0.1)'
                                                },
                                                transition: 'all 0.15s ease-in-out'
                                            }}
                                        >
                                            <ListItemText
                                                primary={set.name}
                                                secondary={`${set.cardCount} cards`}
                                                primaryTypographyProps={{
                                                    sx: {
                                                        fontSize: '0.875rem',
                                                        fontWeight: active ? 700 : 500,
                                                        color: active
                                                            ? (isDark ? '#e4c09c' : '#8b4513')
                                                            : (isDark ? '#f5f1ed' : '#2c1810'),
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis'
                                                    }
                                                }}
                                                secondaryTypographyProps={{
                                                    sx: {
                                                        fontSize: '0.7rem',
                                                        color: isDark ? 'rgba(212, 165, 116, 0.7)' : 'rgba(93, 58, 26, 0.65)'
                                                    }
                                                }}
                                            />
                                            <ChevronRight sx={{
                                                fontSize: 18,
                                                color: isDark ? 'rgba(212, 165, 116, 0.6)' : 'rgba(93, 58, 26, 0.5)'
                                            }} />
                                        </ListItemButton>
                                    </ListItem>
                                );
                            })}
                        </List>
                    </>
                )}
            </Box>
        </Drawer>
        </>
    );
};

export default Header;
