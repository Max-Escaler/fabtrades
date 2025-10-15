import { useState } from 'react';
import {
    Button,
    Menu,
    MenuItem,
    Avatar,
    Box,
    Typography,
    CircularProgress,
    Tooltip
} from '@mui/material';
import { Login as LoginIcon, Logout as LogoutIcon, History as HistoryIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const LoginButton = () => {
    const navigate = useNavigate();
    const { user, loading, signInWithDiscord, signOut } = useAuth();
    const [anchorEl, setAnchorEl] = useState(null);
    const [signingOut, setSigningOut] = useState(false);
    const open = Boolean(anchorEl);

    const handleClick = (event) => {
        if (!user) {
            signInWithDiscord();
        } else {
            setAnchorEl(event.currentTarget);
        }
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleSignOut = async () => {
        setSigningOut(true);
        handleClose();
        await signOut();
        setSigningOut(false);
    };

    const handleViewHistory = () => {
        handleClose();
        navigate('/history');
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', px: 1 }}>
                <CircularProgress size={24} sx={{ color: 'white' }} />
            </Box>
        );
    }

    // Get Discord user metadata
    const discordAvatar = user?.user_metadata?.avatar_url;
    const discordUsername = user?.user_metadata?.full_name || user?.user_metadata?.name || 'User';

    return (
        <>
            {user ? (
                <Tooltip title="Account">
                    <Button
                        onClick={handleClick}
                        sx={{
                            color: 'white',
                            textTransform: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            px: { xs: 1, sm: 2 },
                            '&:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            },
                            transition: 'all 0.2s ease-in-out'
                        }}
                        disabled={signingOut}
                    >
                        <Avatar
                            src={discordAvatar}
                            alt={discordUsername}
                            sx={{
                                width: 32,
                                height: 32,
                                border: '2px solid #d4a574'
                            }}
                        />
                        <Typography
                            sx={{
                                display: { xs: 'none', sm: 'block' },
                                fontWeight: 600,
                                fontSize: '0.9rem'
                            }}
                        >
                            {discordUsername}
                        </Typography>
                    </Button>
                </Tooltip>
            ) : (
                <Tooltip title="Sign in to save and view trade history">
                    <Button
                        onClick={handleClick}
                        startIcon={<LoginIcon />}
                        sx={{
                            color: 'white',
                            textTransform: 'none',
                            fontWeight: 600,
                            px: { xs: 1.5, sm: 2 },
                            py: 0.75,
                            border: '2px solid #d4a574',
                            borderRadius: 2,
                            '&:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                borderColor: '#ffffff',
                                transform: 'scale(1.02)',
                            },
                            transition: 'all 0.2s ease-in-out'
                        }}
                    >
                        <Typography
                            sx={{
                                display: { xs: 'none', sm: 'block' },
                                fontSize: '0.9rem'
                            }}
                        >
                            Sign in with Discord
                        </Typography>
                        <Typography
                            sx={{
                                display: { xs: 'block', sm: 'none' },
                                fontSize: '0.85rem'
                            }}
                        >
                            Sign in
                        </Typography>
                    </Button>
                </Tooltip>
            )}

            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
                PaperProps={{
                    sx: {
                        mt: 1,
                        minWidth: 180,
                        borderRadius: 2,
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                    }
                }}
            >
                <MenuItem
                    onClick={handleViewHistory}
                    sx={{
                        py: 1.5,
                        px: 2,
                        gap: 1.5,
                        '&:hover': {
                            backgroundColor: 'rgba(139, 69, 19, 0.08)',
                        }
                    }}
                >
                    <HistoryIcon fontSize="small" />
                    <Typography>View History</Typography>
                </MenuItem>
                <MenuItem
                    onClick={handleSignOut}
                    sx={{
                        py: 1.5,
                        px: 2,
                        gap: 1.5,
                        color: 'error.main',
                        '&:hover': {
                            backgroundColor: 'rgba(211, 47, 47, 0.08)',
                        }
                    }}
                >
                    <LogoutIcon fontSize="small" />
                    <Typography>Sign Out</Typography>
                </MenuItem>
            </Menu>
        </>
    );
};

export default LoginButton;

