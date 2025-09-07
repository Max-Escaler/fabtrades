import { AppBar, Toolbar, Typography } from '@mui/material';
import {formatTimestamp} from "../../utils/helpers.js";

const Header = ({ lastUpdatedTimestamp }) => {
    return (
        <AppBar position="static" sx={{ backgroundColor: '#432a22' }}>
            <Toolbar sx={{
                px: { xs: 1, sm: 2, md: 3 },
                py: { xs: 0.75, sm: 1, md: 1.5 },
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
            </Toolbar>
        </AppBar>
    );
};

export default Header;
