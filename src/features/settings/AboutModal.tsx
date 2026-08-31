import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import CloseIcon from '@mui/icons-material/Close';
import { MuffinIcon } from '../../components/ui/MuffinIcon';

interface AboutModalProps {
  open: boolean;
  onClose: () => void;
  onPrivacy?: () => void;
  onTerms?: () => void;
}

export function AboutModal({
  open,
  onClose,
  onPrivacy,
  onTerms,
}: AboutModalProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
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
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 1 }}>
            About
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <MuffinIcon className="muffin-icon h-6 w-6 text-primary" />
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Muffin
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Vibe Coded by Rahul Gouri, 2026
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ py: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
          A cozy personal finance PWA that turns your Google Sheet into a live
          dashboard — income, expenses, investments, Provident Fund tracking,
          and net worth — baked for the phone and installable as an app.
        </Typography>

        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
          Twelve cozy muffin themes across matching light and dark palettes,
          tactile Material UI interactions, amount masking, ledger add/edit, and themed drill-down charts.
        </Typography>

        <Divider sx={{ my: 0.5 }} />

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Privacy note: Your records are stored in your Google Drive.
            Muffin has no server database.
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Muffin is an independent developer project by Rahul Gouri.
          </Typography>
        </Box>
      </DialogContent>

      <Box sx={{ px: 3, pb: 2, pt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {onPrivacy && (
            <Button
              variant="outlined"
              size="small"
              onClick={onPrivacy}
              sx={{ flex: 1, borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
            >
              Privacy Policy
            </Button>
          )}
          {onTerms && (
            <Button
              variant="outlined"
              size="small"
              onClick={onTerms}
              sx={{ flex: 1, borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
            >
              Terms
            </Button>
          )}
        </Box>
        <Button
          fullWidth
          variant="contained"
          onClick={onClose}
          sx={{ borderRadius: 2.5, fontWeight: 700, textTransform: 'none', py: 0.875 }}
        >
          Got It
        </Button>
      </Box>
    </Dialog>
  );
}
