import { useState, type MouseEvent } from 'react';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import LogoutIcon from '@mui/icons-material/Logout';
import { useMask } from '../../hooks/useMask';

interface HeaderMenuProps {
  buttonClassName?: string;
  userName?: string;
  userEmail?: string;
  userPicture?: string;
  onLogout: () => void;
}

export function HeaderMenu({
  userName,
  userEmail,
  userPicture,
  onLogout,
}: HeaderMenuProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const { masked, toggleMask } = useMask();

  const handleClick = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const userInitial = (userName || userEmail || 'U').trim().charAt(0).toUpperCase();

  return (
    <>
      <IconButton
        onClick={handleClick}
        size="small"
        aria-controls={open ? 'account-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        sx={{
          p: 0.5,
          border: '2px solid',
          borderColor: 'primary.main',
        }}
      >
        <Avatar
          src={userPicture || undefined}
          alt={userName || 'User avatar'}
          sx={{
            width: 34,
            height: 34,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            fontWeight: 700,
            fontSize: '0.875rem',
          }}
        >
          {!userPicture && userInitial}
        </Avatar>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        id="account-menu"
        open={open}
        onClose={handleClose}
        onClick={handleClose}
        slotProps={{
          paper: {
            elevation: 4,
            sx: {
              borderRadius: 3,
              minWidth: 240,
              p: 1,
              mt: 1.5,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {/* User Info */}
        <Box sx={{ px: 1.5, py: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar
            src={userPicture || undefined}
            alt={userName || 'User avatar'}
            sx={{
              width: 40,
              height: 40,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              fontWeight: 700,
            }}
          >
            {!userPicture && userInitial}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
              {userName || 'Muffin User'}
            </Typography>
            {userEmail && (
              <Typography variant="caption" noWrap sx={{ color: 'text.secondary', display: 'block' }}>
                {userEmail}
              </Typography>
            )}
          </Box>
        </Box>

        <Divider sx={{ my: 1 }} />

        {/* Toggle Mask */}
        <MenuItem
          onClick={() => {
            toggleMask();
          }}
          sx={{ borderRadius: 2, py: 1 }}
        >
          <ListItemIcon sx={{ color: 'primary.main' }}>
            {masked ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
          </ListItemIcon>
          <ListItemText
            primary={masked ? 'Amounts Hidden' : 'Amounts Visible'}
            secondary={masked ? 'Click to unhide' : 'Click to hide'}
            slotProps={{
              primary: { sx: { fontSize: '0.8125rem', fontWeight: 600 } },
              secondary: { sx: { fontSize: '0.6875rem' } },
            }}
          />
        </MenuItem>

        {/* Log Out */}
        <MenuItem
          onClick={() => {
            onLogout();
          }}
          sx={{
            borderRadius: 2,
            py: 1,
            color: 'error.main',
            '&:hover': {
              bgcolor: 'error.main',
              color: 'error.contrastText',
              '& .MuiListItemIcon-root': {
                color: 'error.contrastText',
              },
            },
          }}
        >
          <ListItemIcon sx={{ color: 'inherit' }}>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Log out"
            slotProps={{
              primary: { sx: { fontSize: '0.8125rem', fontWeight: 700 } },
            }}
          />
        </MenuItem>
      </Menu>
    </>
  );
}

