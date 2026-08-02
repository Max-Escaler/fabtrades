import { useEffect, useState } from 'react';
import {
    Button,
    Menu,
    MenuItem,
    Avatar,
    Box,
    Typography,
    CircularProgress,
    Tooltip,
} from '@mui/material';
import {
    Logout as LogoutIcon,
    History as HistoryIcon,
    Login as LoginIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import SignInDialog from './SignInDialog.jsx';

const LoginButton = () => {
    const navigate = useNavigate();
    const { user, loading, signOut, authError } = useAuth();
    const [anchorEl, setAnchorEl] = useState(null);
    const [signingOut, setSigningOut] = useState(false);
    const [signInOpen, setSignInOpen] = useState(false);
    const open = Boolean(anchorEl);

    // After a failed OAuth redirect (common for misconfigured Apple), open the
    // dialog so the error is visible instead of a silent unsigned-in landing.
    useEffect(() => {
        if (authError && !user) setSignInOpen(true);
    }, [authError, user]);

    const handleClick = (event) => {
        if (!user) {
            setSignInOpen(true);
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

    const avatarUrl = user?.user_metadata?.avatar_url;
    const displayName =
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        user?.email?.split('@')[0] ||
        'User';

    return (
        <>
            {user ? (
                <Tooltip title="Account">
                    <Button
                        onClick={handleClick}
                        size="small"
                        sx={{
                            color: 'white',
                            textTransform: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.75,
                            minHeight: 32,
                            px: { xs: 0.5, sm: 1 },
                            py: 0.25,
                            '&:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            },
                            transition: 'all 0.15s ease-in-out',
                        }}
                        disabled={signingOut}
                    >
                        <Avatar
                            src={avatarUrl}
                            alt={displayName}
                            sx={{
                                width: 26,
                                height: 26,
                                border: '1.5px solid #d4a574',
                            }}
                        />
                        <Typography
                            sx={{
                                display: { xs: 'none', sm: 'block' },
                                fontWeight: 600,
                                fontSize: '0.8rem',
                            }}
                        >
                            {displayName}
                        </Typography>
                    </Button>
                </Tooltip>
            ) : (
                <Tooltip title="Sign in to sync binder and trade history">
                    <Button
                        onClick={handleClick}
                        size="small"
                        startIcon={<LoginIcon sx={{ fontSize: '1rem !important' }} />}
                        sx={{
                            backgroundColor: 'rgba(255, 255, 255, 0.12)',
                            color: 'white',
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            px: { xs: 1.25, sm: 1.5 },
                            py: 0.4,
                            minHeight: 32,
                            borderRadius: 1.5,
                            border: '1px solid rgba(212, 165, 116, 0.5)',
                            boxShadow: 'none',
                            '&:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            },
                            transition: 'all 0.15s ease',
                            '& .MuiButton-startIcon': {
                                marginRight: { xs: 0.35, sm: 0.5 },
                            },
                        }}
                    >
                        <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                            Sign in
                        </Box>
                        <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
                            Login
                        </Box>
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
                    },
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
                        },
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
                        },
                    }}
                >
                    <LogoutIcon fontSize="small" />
                    <Typography>Sign Out</Typography>
                </MenuItem>
            </Menu>

            <SignInDialog open={signInOpen} onClose={() => setSignInOpen(false)} />
        </>
    );
};

export default LoginButton;
