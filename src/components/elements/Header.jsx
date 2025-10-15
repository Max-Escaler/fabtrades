import { useState } from 'react';
import { 
    AppBar, Toolbar, Typography, Box, IconButton, Drawer, List, 
    ListItem, ListItemButton, ListItemText 
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { Link, useLocation } from 'react-router-dom';
import {formatTimestamp} from "../../utils/helpers.js";
import LoginButton from '../auth/LoginButton.jsx';

const Header = ({ lastUpdatedTimestamp }) => {
    const location = useLocation();
    const [drawerOpen, setDrawerOpen] = useState(false);

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
                background: 'linear-gradient(135deg, #8b4513 0%, #5d2f0d 100%)',
                borderBottom: '3px solid #d4a574',
                boxShadow: '0 4px 20px rgba(139, 69, 19, 0.3)'
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
                        FAB Trades
                    </Typography>
                    <Typography
                        variant="body2"
                        sx={{
                            fontSize: { xs: '0.7rem', sm: '0.8rem' },
                            mt: 0.5,
                            opacity: 0.95,
                            fontWeight: 500
                        }}
                    >
                        Prices last updated: {lastUpdatedTimestamp ? formatTimestamp(lastUpdatedTimestamp) : 'Loading...'}
                    </Typography>
                </Box>

                <LoginButton />
            </Toolbar>
        </AppBar>
        
        <Drawer
            anchor="left"
            open={drawerOpen}
            onClose={toggleDrawer(false)}
            PaperProps={{
                sx: {
                    background: 'linear-gradient(180deg, #ffffff 0%, #f5f1ed 100%)',
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
                    background: 'linear-gradient(135deg, #8b4513 0%, #5d2f0d 100%)',
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
                                backgroundColor: location.pathname === '/' ? 'rgba(139, 69, 19, 0.1)' : 'transparent',
                                '&:hover': {
                                    backgroundColor: 'rgba(139, 69, 19, 0.15)',
                                },
                                transition: 'all 0.2s ease-in-out'
                            }}
                        >
                            <ListItemText 
                                primary="Trade Calculator" 
                                sx={{ 
                                    fontWeight: location.pathname === '/' ? 700 : 500,
                                    color: location.pathname === '/' ? '#8b4513' : '#2c1810',
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
                            to="/history"
                            sx={{
                                borderRadius: 2,
                                backgroundColor: location.pathname === '/history' ? 'rgba(139, 69, 19, 0.1)' : 'transparent',
                                '&:hover': {
                                    backgroundColor: 'rgba(139, 69, 19, 0.15)',
                                },
                                transition: 'all 0.2s ease-in-out'
                            }}
                        >
                            <ListItemText 
                                primary="Trade History"
                                sx={{ 
                                    fontWeight: location.pathname === '/history' ? 700 : 500,
                                    color: location.pathname === '/history' ? '#8b4513' : '#2c1810',
                                    '& .MuiTypography-root': {
                                        fontSize: '1rem'
                                    }
                                }}
                            />
                        </ListItemButton>
                    </ListItem>
                </List>
            </Box>
        </Drawer>
        </>
    );
};

export default Header;
