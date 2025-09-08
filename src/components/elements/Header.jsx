import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import {formatTimestamp} from "../../utils/helpers.js";

const Header = ({ lastUpdatedTimestamp}) => {
    const location = useLocation();

    return (
        <AppBar position="static" sx={{ backgroundColor: '#432a22' }}>
            <Toolbar sx={{
                px: { xs: 1, sm: 2, md: 3 },
                py: { xs: 0.75, sm: 1, md: 1.5 },
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'flex-start', sm: 'center' },
                justifyContent: 'space-between'
            }}>
                <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'flex-start'
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

                <Box sx={{ 
                    display: 'flex', 
                    gap: 2,
                    mt: { xs: 2, sm: 0 }
                }}>
                    <Button 
                        component={Link} 
                        to="/" 
                        color="inherit"
                        sx={{
                            fontWeight: location.pathname === '/' ? 'bold' : 'normal',
                            textDecoration: location.pathname === '/' ? 'underline' : 'none'
                        }}
                    >
                        Home
                    </Button>
                    <Button 
                        component={Link} 
                        to="/faqs" 
                        color="inherit"
                        sx={{
                            fontWeight: location.pathname === '/faqs' ? 'bold' : 'normal',
                            textDecoration: location.pathname === '/faqs' ? 'underline' : 'none'
                        }}
                    >
                        FAQs
                    </Button>
                </Box>
            </Toolbar>
        </AppBar>
    );
};

export default Header;
