import { useState, type SyntheticEvent } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Grid from '@mui/material/Grid';
import Divider from '@mui/material/Divider';
import DownloadIcon from '@mui/icons-material/Download';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import IosShareIcon from '@mui/icons-material/IosShare';
import LaptopIcon from '@mui/icons-material/Laptop';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import { MuffinIcon } from '../../components/ui/MuffinIcon';

interface PwaInstallModalProps {
  open: boolean;
  onClose: () => void;
  canPrompt?: boolean;
  onNativeInstall?: () => void;
}

export function PwaInstallModal({
  open,
  onClose,
  canPrompt,
  onNativeInstall,
}: PwaInstallModalProps) {
  const [tabIndex, setTabIndex] = useState<number>(() => {
    if (typeof navigator === 'undefined') return 2;
    if (/iphone|ipad|ipod/i.test(navigator.userAgent)) return 1;
    if (/android/i.test(navigator.userAgent)) return 0;
    return 2;
  });

  const handleTabChange = (_: SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 4,
            p: 1,
          },
        },
      }}
    >
      <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: 2.5,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
            }}
          >
            <MuffinIcon className="h-6 w-6" />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Install Muffin PWA
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Add to your home screen for an app-like experience
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ py: 1.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Direct Native Install Action */}
        {canPrompt && onNativeInstall && (
          <Paper
            variant="outlined"
            sx={{
              borderRadius: 3,
              p: 2,
              borderColor: 'primary.main',
              bgcolor: 'action.hover',
              textAlign: 'center',
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Your browser supports 1-click installation!
            </Typography>
            <Button
              variant="contained"
              fullWidth
              startIcon={<DownloadIcon />}
              onClick={() => {
                onClose();
                onNativeInstall();
              }}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
            >
              Install App Now
            </Button>
          </Paper>
        )}

        {/* Device tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabIndex} onChange={handleTabChange} textColor="primary" indicatorColor="primary" variant="fullWidth">
            <Tab icon={<PhoneAndroidIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Android" sx={{ textTransform: 'none', fontWeight: 700 }} />
            <Tab icon={<IosShareIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="iOS Safari" sx={{ textTransform: 'none', fontWeight: 700 }} />
            <Tab icon={<LaptopIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Desktop" sx={{ textTransform: 'none', fontWeight: 700 }} />
          </Tabs>
        </Box>

        {/* Step-by-Step Instructions */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {tabIndex === 0 && (
            <>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2.5, display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: 'primary.main', color: 'primary.contrastText', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', shrink: 0 }}>
                  1
                </Box>
                <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>
                  Open Muffin in Chrome on your Android phone.
                </Typography>
              </Paper>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2.5, display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: 'primary.main', color: 'primary.contrastText', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', shrink: 0 }}>
                  2
                </Box>
                <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>
                  Tap the three-dots menu icon in the top right corner.
                </Typography>
              </Paper>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2.5, display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: 'primary.main', color: 'primary.contrastText', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', shrink: 0 }}>
                  3
                </Box>
                <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>
                  Select <strong>Install app</strong> or <strong>Add to Home screen</strong>.
                </Typography>
              </Paper>
            </>
          )}

          {tabIndex === 1 && (
            <>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2.5, display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: 'primary.main', color: 'primary.contrastText', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', shrink: 0 }}>
                  1
                </Box>
                <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>
                  Open Muffin in <strong>Safari</strong> on your iPhone or iPad.
                </Typography>
              </Paper>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2.5, display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: 'primary.main', color: 'primary.contrastText', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', shrink: 0 }}>
                  2
                </Box>
                <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>
                  Tap the <strong>Share</strong> button at the bottom of the screen.
                </Typography>
              </Paper>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2.5, display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: 'primary.main', color: 'primary.contrastText', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', shrink: 0 }}>
                  3
                </Box>
                <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>
                  Scroll down and tap <strong>Add to Home Screen</strong>.
                </Typography>
              </Paper>
            </>
          )}

          {tabIndex === 2 && (
            <>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2.5, display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: 'primary.main', color: 'primary.contrastText', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', shrink: 0 }}>
                  1
                </Box>
                <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>
                  Look at your browser address bar in Chrome, Edge, or Brave.
                </Typography>
              </Paper>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2.5, display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: 'primary.main', color: 'primary.contrastText', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', shrink: 0 }}>
                  2
                </Box>
                <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>
                  Click the <strong>Install Muffin</strong> icon in the address bar.
                </Typography>
              </Paper>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2.5, display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: 'primary.main', color: 'primary.contrastText', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', shrink: 0 }}>
                  3
                </Box>
                <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>
                  Confirm installation to launch Muffin in its standalone window!
                </Typography>
              </Paper>
            </>
          )}
        </Box>

        <Divider sx={{ my: 0.5 }} />

        {/* Benefits */}
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 1, display: 'block', mb: 1 }}>
            Benefits of Installing
          </Typography>
          <Grid container spacing={1}>
            <Grid size={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircleIcon color="success" sx={{ fontSize: 16 }} />
                <Typography variant="caption">Full-screen experience</Typography>
              </Box>
            </Grid>
            <Grid size={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircleIcon color="success" sx={{ fontSize: 16 }} />
                <Typography variant="caption">Home screen access</Typography>
              </Box>
            </Grid>
            <Grid size={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircleIcon color="success" sx={{ fontSize: 16 }} />
                <Typography variant="caption">Faster launch speeds</Typography>
              </Box>
            </Grid>
            <Grid size={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircleIcon color="success" sx={{ fontSize: 16 }} />
                <Typography variant="caption">Offline cached shell</Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          fullWidth
          variant="contained"
          onClick={onClose}
          sx={{ borderRadius: 2.5, fontWeight: 700, textTransform: 'none' }}
        >
          Got it
        </Button>
      </DialogActions>
    </Dialog>
  );
}

