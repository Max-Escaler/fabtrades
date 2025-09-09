import { useState } from 'react';
import { 
    AppBar, Toolbar, Typography, Box, IconButton, Drawer, List, 
    ListItem, ListItemButton, ListItemText 
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { Link, useLocation } from 'react-router-dom';
import {formatTimestamp} from "../../utils/helpers.js";

const Header = ({ lastUpdatedTimestamp}) => {
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
        <AppBar position="static" sx={{ backgroundColor: '#432a22' }}>
            <Toolbar sx={{
                px: { xs: 1, sm: 2, md: 3 },
                py: { xs: 0.75, sm: 1, md: 1.5 },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <IconButton
                    color="inherit"
                    aria-label="open drawer"
                    onClick={toggleDrawer(true)}
                    edge="start"
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
                            fontWeight: 'bold',
                            fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' },
                        }}
                    >
                        FAB Trades
                    </Typography>
                    <Typography
                        variant="body2"
                        sx={{
                            fontSize: { xs: '0.7rem', sm: '0.8rem' },
                            mt: 0.5
                        }}
                    >
                        Prices last updated at: {lastUpdatedTimestamp ? formatTimestamp(lastUpdatedTimestamp) : 'Loading...'}
                    </Typography>
                </Box>
            </Toolbar>
        </AppBar>
        
        <Drawer
            anchor="left"
            open={drawerOpen}
            onClose={toggleDrawer(false)}
        >
            <Box
                sx={{ width: 250 }}
                role="presentation"
                onClick={toggleDrawer(false)}
                onKeyDown={toggleDrawer(false)}
            >
                <List>
                    <ListItem disablePadding>
                        <ListItemButton component={Link} to="/">
                            <ListItemText 
                                primary="Trade Calculator" 
                                sx={{ 
                                    fontWeight: location.pathname === '/' ? 'bold' : 'normal'
                                }}
                            />
                        </ListItemButton>
                    </ListItem>
                    <ListItem disablePadding>
                        <ListItemButton component={Link} to="/faqs">
                            <ListItemText 
                                primary="FAQs"
                                sx={{ 
                                    fontWeight: location.pathname === '/faqs' ? 'bold' : 'normal'
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
