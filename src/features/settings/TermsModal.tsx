import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import DescriptionIcon from '@mui/icons-material/Description';

interface TermsModalProps {
  open: boolean;
  onClose: () => void;
}

export function TermsModal({ open, onClose }: TermsModalProps) {
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
            <DescriptionIcon fontSize="small" />
          </Box>
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 1 }}>
              Legal & Terms
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Terms of Service
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ py: 1.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8125rem', lineHeight: 1.6 }}>
          Welcome to <strong>Muffin</strong>. By authenticating with your Google Account, you agree to these Terms of Service.
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            1. Personal Use Dashboard
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: 'text.secondary', lineHeight: 1.6 }}>
            Muffin is an independent developer personal software application created by Rahul Gouri to read and sync data with your user-authorized Google Sheets spreadsheets.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            2. Financial Disclaimer
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: 'text.secondary', lineHeight: 1.6 }}>
            Calculations, metrics, and scenario planner estimates provided in Muffin are for personal tracking purposes only and do NOT constitute professional tax, investment, or legal advice.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            3. User Data Ownership
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: 'text.secondary', lineHeight: 1.6 }}>
            You retain 100% ownership of all spreadsheets, rows, and transaction data inside your Google Account.
          </Typography>
        </Box>

        <Box sx={{ pt: 1, textAlign: 'center' }}>
          <a
            href="/terms.html"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: '0.75rem', fontWeight: 700 }}
          >
            View Full External Terms Webpage →
          </a>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

