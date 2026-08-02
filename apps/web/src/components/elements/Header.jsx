import { useState } from 'react';
import { 
    AppBar, Toolbar, Typography, Box, IconButton, Button, Drawer, List, 
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
                borderBottom: '2px solid #d4a574',
                boxShadow: isDark 
                    ? '0 2px 10px rgba(0, 0, 0, 0.35)'
                    : '0 2px 10px rgba(139, 69, 19, 0.25)'
            }}
        >
            <Toolbar
                variant="dense"
                sx={{
                    px: { xs: 0.75, sm: 1.5, md: 2 },
                    py: 0.5,
                    minHeight: { xs: 48, sm: 52 },
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, minWidth: 0 }}>
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        onClick={toggleDrawer(true)}
                        edge="start"
                        size="small"
                        sx={{
                            p: 0.75,
                            '&:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            },
                        }}
                    >
                        <MenuIcon fontSize="small" />
                    </IconButton>
                    <Button
                        component={Link}
                        to="/"
                        size="small"
                        sx={{
                            color: location.pathname === '/' ? '#ffffff' : '#d4a574',
                            fontWeight: location.pathname === '/' ? 700 : 600,
                            fontSize: { xs: '0.75rem', sm: '0.875rem' },
                            textTransform: 'none',
                            minWidth: 0,
                            px: { xs: 0.5, sm: 1 },
                            py: 0.35,
                            whiteSpace: 'nowrap',
                            backgroundColor: location.pathname === '/'
                                ? 'rgba(212, 165, 116, 0.25)'
                                : 'transparent',
                            '&:hover': {
                                backgroundColor: 'rgba(212, 165, 116, 0.15)',
                            },
                        }}
                    >
                        Trade Calculator
                    </Button>
                    <Button
                        component={Link}
                        to="/binder"
                        size="small"
                        sx={{
                            color: location.pathname === '/binder' ? '#ffffff' : '#d4a574',
                            fontWeight: location.pathname === '/binder' ? 700 : 600,
                            fontSize: { xs: '0.75rem', sm: '0.875rem' },
                            textTransform: 'none',
                            minWidth: 0,
                            px: { xs: 0.5, sm: 1 },
                            py: 0.35,
                            whiteSpace: 'nowrap',
                            backgroundColor: location.pathname === '/binder'
                                ? 'rgba(212, 165, 116, 0.25)'
                                : 'transparent',
                            '&:hover': {
                                backgroundColor: 'rgba(212, 165, 116, 0.15)',
                            },
                        }}
                    >
                        My Binder
                    </Button>
                </Box>

                <Box
                    component={Link}
                    to="/"
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 0.75,
                        flexGrow: 1,
                        minWidth: 0,
                        textDecoration: 'none',
                    }}
                >
                    <Box
                        component="img"
                        src="/app_icon.png"
                        alt="FAB Trades"
                        sx={{
                            width: { xs: 24, sm: 28 },
                            height: { xs: 24, sm: 28 },
                            borderRadius: 1,
                            boxShadow: '0 1px 4px rgba(0, 0, 0, 0.25)',
                        }}
                    />
                    <Typography
                        sx={{
                            fontWeight: 800,
                            fontSize: { xs: '1rem', sm: '1.15rem' },
                            background: 'linear-gradient(135deg, #ffffff 0%, #d4a574 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            letterSpacing: '0.01em',
                            lineHeight: 1.2,
                        }}
                    >
                        FAB Trades
                    </Typography>
                </Box>

                {/* Right side: Dark mode toggle and Login */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Tooltip title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
                        <IconButton
                            onClick={toggleMode}
                            size="small"
                            sx={{
                                color: '#d4a574',
                                p: 0.75,
                                '&:hover': {
                                    backgroundColor: 'rgba(212, 165, 116, 0.15)',
                                }
                            }}
                        >
                            {isDark ? <LightMode fontSize="small" /> : <DarkMode fontSize="small" />}
                        </IconButton>
                    </Tooltip>
                    <LoginButton />
                </Box>
            </Toolbar>
        </AppBar>

        <Box
            component="footer"
            sx={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: (theme) => theme.zIndex.appBar,
                py: 0.5,
                px: 1.5,
                textAlign: 'center',
                borderTop: '1px solid',
                borderColor: isDark ? 'rgba(212, 165, 116, 0.25)' : 'rgba(139, 69, 19, 0.2)',
                background: isDark
                    ? 'rgba(26, 15, 10, 0.92)'
                    : 'rgba(245, 241, 237, 0.94)',
                backdropFilter: 'blur(8px)',
            }}
        >
            <Typography
                sx={{
                    fontSize: '0.7rem',
                    fontWeight: 500,
                    color: isDark ? '#d4a574' : '#5d2f0d',
                    opacity: 0.9,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                }}
            >
                Prices updated {lastUpdatedTimestamp ? formatTimestamp(lastUpdatedTimestamp) : '…'}
            </Typography>
        </Box>
        
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
                    <ListItem disablePadding sx={{ mb: 1 }}>
                        <ListItemButton
                            component={Link}
                            to="/wants"
                            sx={{
                                borderRadius: 2,
                                backgroundColor: location.pathname === '/wants'
                                    ? (isDark ? 'rgba(200, 113, 55, 0.2)' : 'rgba(139, 69, 19, 0.1)')
                                    : 'transparent',
                                '&:hover': {
                                    backgroundColor: isDark ? 'rgba(200, 113, 55, 0.25)' : 'rgba(139, 69, 19, 0.15)',
                                },
                                transition: 'all 0.2s ease-in-out'
                            }}
                        >
                            <ListItemText
                                primary="Want List"
                                sx={{
                                    fontWeight: location.pathname === '/wants' ? 700 : 500,
                                    color: location.pathname === '/wants'
                                        ? (isDark ? '#e4c09c' : '#8b4513')
                                        : (isDark ? '#f5f1ed' : '#2c1810'),
                                    '& .MuiTypography-root': { fontSize: '1rem' }
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
                    <ListItem disablePadding sx={{ mt: 1 }}>
                        <ListItemButton
                            component={Link}
                            to="/privacy"
                            sx={{
                                borderRadius: 2,
                                backgroundColor: location.pathname === '/privacy'
                                    ? (isDark ? 'rgba(200, 113, 55, 0.2)' : 'rgba(139, 69, 19, 0.1)')
                                    : 'transparent',
                                '&:hover': {
                                    backgroundColor: isDark ? 'rgba(200, 113, 55, 0.25)' : 'rgba(139, 69, 19, 0.15)',
                                },
                                transition: 'all 0.2s ease-in-out'
                            }}
                        >
                            <ListItemText
                                primary="Privacy Policy"
                                sx={{
                                    fontWeight: location.pathname === '/privacy' ? 700 : 500,
                                    color: location.pathname === '/privacy'
                                        ? (isDark ? '#e4c09c' : '#8b4513')
                                        : (isDark ? '#f5f1ed' : '#2c1810'),
                                    '& .MuiTypography-root': { fontSize: '0.875rem' }
                                }}
                            />
                        </ListItemButton>
                    </ListItem>
                    <ListItem disablePadding sx={{ mt: 1 }}>
                        <ListItemButton
                            component={Link}
                            to="/terms"
                            sx={{
                                borderRadius: 2,
                                backgroundColor: location.pathname === '/terms'
                                    ? (isDark ? 'rgba(200, 113, 55, 0.2)' : 'rgba(139, 69, 19, 0.1)')
                                    : 'transparent',
                                '&:hover': {
                                    backgroundColor: isDark ? 'rgba(200, 113, 55, 0.25)' : 'rgba(139, 69, 19, 0.15)',
                                },
                                transition: 'all 0.2s ease-in-out'
                            }}
                        >
                            <ListItemText
                                primary="Terms of Use"
                                sx={{
                                    fontWeight: location.pathname === '/terms' ? 700 : 500,
                                    color: location.pathname === '/terms'
                                        ? (isDark ? '#e4c09c' : '#8b4513')
                                        : (isDark ? '#f5f1ed' : '#2c1810'),
                                    '& .MuiTypography-root': { fontSize: '0.875rem' }
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
                                const setPath = `/sets/${set.slug || set.groupId}`;
                                const active = location.pathname === setPath;
                                return (
                                    <ListItem key={set.groupId} disablePadding>
                                        <ListItemButton
                                            component={Link}
                                            to={setPath}
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
