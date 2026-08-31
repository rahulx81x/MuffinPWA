import { useState } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Switch from '@mui/material/Switch';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';

import PaletteIcon from '@mui/icons-material/Palette';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import ReplayIcon from '@mui/icons-material/Replay';
import DownloadIcon from '@mui/icons-material/Download';
import InfoIcon from '@mui/icons-material/Info';
import DescriptionIcon from '@mui/icons-material/Description';
import TableChartIcon from '@mui/icons-material/TableChart';
import LogoutIcon from '@mui/icons-material/Logout';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

import { useFont } from '../../hooks/useFont';
import { useMask } from '../../hooks/useMask';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { useRecipeConfig } from '../../hooks/useRecipeConfig';
import { useTheme } from '../../hooks/useTheme';
import { FONTS } from '../../lib/fonts';
import { DARK_THEMES, LIGHT_THEMES } from '../../lib/themes';
import { ThemeModal } from './ThemeModal';
import { FontModal } from './FontModal';

interface SettingsViewProps {
  userName?: string;
  userEmail?: string;
  userPicture?: string;
  spreadsheetTitle?: string;
  onAbout: () => void;
  onRecipe: () => void;
  onRecurring: () => void;
  onGuide: () => void;
  onTour: () => void;
  onPrivacy: () => void;
  onTerms: () => void;
  onChangeSheet: () => void;
  onLogout: () => void;
  onInstallGuide: () => void;
}

export function SettingsView({
  userName,
  userEmail,
  userPicture,
  spreadsheetTitle,
  onAbout,
  onRecipe,
  onRecurring,
  onGuide,
  onTour,
  onPrivacy,
  onTerms,
  onChangeSheet,
  onLogout,
  onInstallGuide,
}: SettingsViewProps) {
  const { masked, toggleMask, formatCurrency } = useMask();
  const { themeId } = useTheme();
  const { fontId } = useFont();
  const { state: installState, install, canPrompt } = usePwaInstall();
  const { recurringRules } = useRecipeConfig();

  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [fontModalOpen, setFontModalOpen] = useState(false);

  const activeRecurringCount = recurringRules.filter((r) => r.active).length;
  const activeRecurringTotal = recurringRules
    .filter((r) => r.active)
    .reduce((sum, r) => sum + r.amount, 0);

  const userInitial = (userName || userEmail || 'U').trim().charAt(0).toUpperCase();

  const currentTheme =
    [...LIGHT_THEMES, ...DARK_THEMES].find((t) => t.id === themeId) || LIGHT_THEMES[0];
  const currentFont = FONTS.find((f) => f.id === fontId) || FONTS[0];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5, pb: 6 }}>
      {/* Page Title */}
      <Box>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 800 }}>
          Settings
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}>
          Manage your account, appearance, privacy, and preferences
        </Typography>
      </Box>

      {/* Account Section */}
      <Card variant="outlined" sx={{ borderRadius: 3.5 }}>
        <CardContent sx={{ p: { xs: 2, sm: 2.5 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              src={userPicture || undefined}
              alt={userName || 'User avatar'}
              sx={{
                width: 48,
                height: 48,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                fontWeight: 700,
                fontSize: '1.125rem',
              }}
            >
              {!userPicture && userInitial}
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="subtitle1" noWrap sx={{ fontWeight: 800 }}>
                {userName || 'Muffin User'}
              </Typography>
              {userEmail && (
                <Typography variant="caption" noWrap sx={{ color: 'text.secondary', display: 'block' }}>
                  {userEmail}
                </Typography>
              )}
            </Box>
            <Button
              variant="outlined"
              color="error"
              size="small"
              onClick={onLogout}
              startIcon={<LogoutIcon />}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
            >
              Log out
            </Button>
          </Box>

          {/* Linked Google Sheet */}
          <Paper
            variant="outlined"
            sx={{
              p: 1.5,
              borderRadius: 2.5,
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'flex-start', sm: 'center' },
              justifyContent: 'space-between',
              gap: 1.5,
              bgcolor: 'action.hover',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 34,
                  height: 34,
                  borderRadius: 2,
                  bgcolor: 'success.main',
                  color: 'success.contrastText',
                }}
              >
                <TableChartIcon fontSize="small" />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 0.8, display: 'block' }}>
                  Connected Sheet
                </Typography>
                <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                  {spreadsheetTitle || 'Personal Finance Sheet'}
                </Typography>
              </Box>
            </Box>
            <Button
              variant="outlined"
              color="inherit"
              size="small"
              onClick={onChangeSheet}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, alignSelf: { xs: 'flex-start', sm: 'center' } }}
            >
              Change Sheet
            </Button>
          </Paper>
        </CardContent>
      </Card>

      {/* Appearance Section */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PaletteIcon color="primary" sx={{ fontSize: 18 }} />
          <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 1 }}>
            Appearance & Styling
          </Typography>
        </Box>

        <Card variant="outlined" sx={{ borderRadius: 3.5, overflow: 'hidden' }}>
          <List disablePadding>
            {/* Theme & Palette Option */}
            <ListItem disablePadding>
              <ListItemButton onClick={() => setThemeModalOpen(true)} sx={{ py: 1.5, px: 2 }}>
                <ListItemIcon sx={{ minWidth: 42, color: 'primary.main' }}>
                  <PaletteIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Theme & Color Palette"
                  secondary={
                    <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <Box
                        sx={{
                          display: 'inline-flex',
                          height: 12,
                          width: 24,
                          borderRadius: 2,
                          overflow: 'hidden',
                          border: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <Box sx={{ width: '40%', height: '100%', bgcolor: currentTheme.background }} />
                        <Box sx={{ width: '30%', height: '100%', bgcolor: currentTheme.card }} />
                        <Box sx={{ flex: 1, height: '100%', bgcolor: currentTheme.accent }} />
                      </Box>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {currentTheme.name} ({currentTheme.mode})
                      </Typography>
                    </Box>
                  }
                  slotProps={{
                    primary: { sx: { fontWeight: 700, fontSize: '0.875rem' } },
                  }}
                />
                <ChevronRightIcon sx={{ color: 'text.secondary' }} />
              </ListItemButton>
            </ListItem>

            <Divider />

            {/* Typography Style Option */}
            <ListItem disablePadding>
              <ListItemButton onClick={() => setFontModalOpen(true)} sx={{ py: 1.5, px: 2 }}>
                <ListItemIcon sx={{ minWidth: 42, color: 'primary.main' }}>
                  <TextFieldsIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Typography Style"
                  secondary={`${currentFont.name} · Aa Bb 123`}
                  slotProps={{
                    primary: { sx: { fontWeight: 700, fontSize: '0.875rem' } },
                    secondary: { sx: { fontSize: '0.75rem', fontFamily: currentFont.body, mt: 0.5 } },
                  }}
                />
                <ChevronRightIcon sx={{ color: 'text.secondary' }} />
              </ListItemButton>
            </ListItem>
          </List>
        </Card>
      </Box>

      {/* Data & Privacy Section */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <VerifiedUserIcon color="primary" sx={{ fontSize: 18 }} />
          <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 1 }}>
            Data & Privacy
          </Typography>
        </Box>

        <Card variant="outlined" sx={{ borderRadius: 3.5, overflow: 'hidden' }}>
          <List disablePadding>
            {/* Mask Amounts Toggle */}
            <ListItem sx={{ py: 1.5, px: 2 }}>
              <ListItemIcon sx={{ minWidth: 42, color: 'primary.main' }}>
                {masked ? <VisibilityOffIcon /> : <VisibilityIcon />}
              </ListItemIcon>
              <ListItemText
                primary="Mask Financial Amounts"
                secondary="Hide account figures in public places"
                slotProps={{
                  primary: { sx: { fontWeight: 700, fontSize: '0.875rem' } },
                  secondary: { sx: { fontSize: '0.75rem' } },
                }}
              />
              <Switch edge="end" checked={masked} onChange={toggleMask} />
            </ListItem>

            <Divider />

            {/* Starting Balances (Recipe) */}
            <ListItem sx={{ py: 1.5, px: 2 }}>
              <ListItemIcon sx={{ minWidth: 42, color: 'warning.main' }}>
                <AccountBalanceWalletIcon />
              </ListItemIcon>
              <ListItemText
                primary="Starting Balances"
                secondary="Configure opening liquid balance & initial investments"
                slotProps={{
                  primary: { sx: { fontWeight: 700, fontSize: '0.875rem' } },
                  secondary: { sx: { fontSize: '0.75rem' } },
                }}
              />
              <Button
                variant="outlined"
                color="inherit"
                size="small"
                onClick={onRecipe}
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
              >
                Configure
              </Button>
            </ListItem>

            <Divider />

            {/* Recurring Rules & SIPs */}
            <ListItem sx={{ py: 1.5, px: 2 }}>
              <ListItemIcon sx={{ minWidth: 42, color: 'primary.main' }}>
                <EventRepeatIcon />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Recurring Rules & SIPs
                    </Typography>
                    {activeRecurringCount > 0 && (
                      <Chip
                        label={`${activeRecurringCount} Active`}
                        size="small"
                        color="primary"
                        sx={{ height: 18, fontSize: '0.625rem', fontWeight: 700 }}
                      />
                    )}
                  </Box>
                }
                secondary={
                  activeRecurringCount > 0
                    ? `${formatCurrency(activeRecurringTotal)}/mo scheduled with smart due alert`
                    : 'Automate rent, bills, salary, and mutual fund SIPs'
                }
                slotProps={{
                  secondary: { sx: { fontSize: '0.75rem' } },
                }}
              />
              <Button
                variant="outlined"
                color="inherit"
                size="small"
                onClick={onRecurring}
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
              >
                Manage
              </Button>
            </ListItem>
          </List>
        </Card>
      </Box>

      {/* Guides & Help Section */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MenuBookIcon color="primary" sx={{ fontSize: 18 }} />
          <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 1 }}>
            Guides & Help
          </Typography>
        </Box>

        <Card variant="outlined" sx={{ borderRadius: 3.5, overflow: 'hidden' }}>
          <List disablePadding>
            <ListItem disablePadding>
              <ListItemButton onClick={onGuide} sx={{ py: 1.5, px: 2 }}>
                <ListItemIcon sx={{ minWidth: 42, color: 'info.main' }}>
                  <MenuBookIcon />
                </ListItemIcon>
                <ListItemText
                  primary="User & Formula Guide"
                  secondary="Formulas, sheet formatting, and best practices"
                  slotProps={{
                    primary: { sx: { fontWeight: 700, fontSize: '0.875rem' } },
                    secondary: { sx: { fontSize: '0.75rem' } },
                  }}
                />
                <ChevronRightIcon sx={{ color: 'text.secondary' }} />
              </ListItemButton>
            </ListItem>

            <Divider />

            <ListItem disablePadding>
              <ListItemButton onClick={onTour} sx={{ py: 1.5, px: 2 }}>
                <ListItemIcon sx={{ minWidth: 42, color: 'secondary.main' }}>
                  <ReplayIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Replay Onboarding Tour"
                  secondary="Interactive walk-through of Muffin features"
                  slotProps={{
                    primary: { sx: { fontWeight: 700, fontSize: '0.875rem' } },
                    secondary: { sx: { fontSize: '0.75rem' } },
                  }}
                />
                <ChevronRightIcon sx={{ color: 'text.secondary' }} />
              </ListItemButton>
            </ListItem>
          </List>
        </Card>
      </Box>

      {/* App & About Section */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <InfoIcon color="primary" sx={{ fontSize: 18 }} />
          <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 1 }}>
            About & App
          </Typography>
        </Box>

        <Card variant="outlined" sx={{ borderRadius: 3.5, overflow: 'hidden' }}>
          <List disablePadding>
            {installState !== 'installed' && (
              <>
                <ListItem sx={{ py: 1.5, px: 2 }}>
                  <ListItemIcon sx={{ minWidth: 42, color: 'primary.main' }}>
                    <DownloadIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Install Muffin App"
                    secondary="Install to home screen for native offline experience"
                    slotProps={{
                      primary: { sx: { fontWeight: 700, fontSize: '0.875rem' } },
                      secondary: { sx: { fontSize: '0.75rem' } },
                    }}
                  />
                  <Button
                    variant="contained"
                    size="small"
                    onClick={canPrompt ? () => void install() : onInstallGuide}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                  >
                    {canPrompt ? 'Install' : 'Instructions'}
                  </Button>
                </ListItem>
                <Divider />
              </>
            )}

            <ListItem disablePadding>
              <ListItemButton onClick={onAbout} sx={{ py: 1.5, px: 2 }}>
                <ListItemIcon sx={{ minWidth: 42, color: 'text.secondary' }}>
                  <InfoIcon />
                </ListItemIcon>
                <ListItemText
                  primary="About Muffin"
                  secondary="Version, developer information & license"
                  slotProps={{
                    primary: { sx: { fontWeight: 700, fontSize: '0.875rem' } },
                    secondary: { sx: { fontSize: '0.75rem' } },
                  }}
                />
                <ChevronRightIcon sx={{ color: 'text.secondary' }} />
              </ListItemButton>
            </ListItem>

            <Divider />

            <ListItem disablePadding>
              <ListItemButton onClick={onPrivacy} sx={{ py: 1.5, px: 2 }}>
                <ListItemIcon sx={{ minWidth: 42, color: 'text.secondary' }}>
                  <VerifiedUserIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Privacy Policy"
                  secondary="Zero third-party trackers. Your Google Sheet is yours alone."
                  slotProps={{
                    primary: { sx: { fontWeight: 700, fontSize: '0.875rem' } },
                    secondary: { sx: { fontSize: '0.75rem' } },
                  }}
                />
                <ChevronRightIcon sx={{ color: 'text.secondary' }} />
              </ListItemButton>
            </ListItem>

            <Divider />

            <ListItem disablePadding>
              <ListItemButton onClick={onTerms} sx={{ py: 1.5, px: 2 }}>
                <ListItemIcon sx={{ minWidth: 42, color: 'text.secondary' }}>
                  <DescriptionIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Terms of Service"
                  secondary="Terms of use for Muffin PWA"
                  slotProps={{
                    primary: { sx: { fontWeight: 700, fontSize: '0.875rem' } },
                    secondary: { sx: { fontSize: '0.75rem' } },
                  }}
                />
                <ChevronRightIcon sx={{ color: 'text.secondary' }} />
              </ListItemButton>
            </ListItem>
          </List>
        </Card>

        {/* Developer attribution compliance rule */}
        <Typography variant="caption" sx={{ pt: 1, textAlign: 'center', color: 'text.secondary', display: 'block' }}>
          Muffin is an independent developer project crafted with 🧁 by Rahul Gouri.
        </Typography>
      </Box>

      <ThemeModal open={themeModalOpen} onClose={() => setThemeModalOpen(false)} />
      <FontModal open={fontModalOpen} onClose={() => setFontModalOpen(false)} />
    </Box>
  );
}

