import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import CloseIcon from '@mui/icons-material/Close';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';

interface PrivacyModalProps {
  open: boolean;
  onClose: () => void;
}

export function PrivacyModal({ open, onClose }: PrivacyModalProps) {
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
              bgcolor: 'success.main',
              color: 'success.contrastText',
            }}
          >
            <VerifiedUserIcon fontSize="small" />
          </Box>
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 1 }}>
              Legal & Compliance
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Privacy Policy
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ py: 1.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8125rem', lineHeight: 1.6 }}>
          At <strong>Muffin</strong>, your privacy is paramount. All your financial transactions, opening balances, and investment baselines are stored inside your own personal Google Account spreadsheet across dedicated <code>Income</code>, <code>Expense</code>, <code>Investment</code>, and <code>Recipe</code> tabs. Zero financial values are stored in central cloud databases or Blobs.
        </Typography>

        <Paper
          variant="outlined"
          sx={{
            borderRadius: 3,
            p: 2,
            borderColor: 'primary.main',
            bgcolor: 'action.hover',
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main', mb: 0.5 }}>
            Google API Limited Use Disclosure
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.6 }}>
            Muffin&apos;s use and transfer to any other app of information received from Google APIs will adhere to{' '}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontWeight: 700, color: 'inherit' }}
            >
              Google API Services User Data Policy
            </a>
            , including Limited Use requirements.
          </Typography>
        </Paper>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            1. Information Collected
          </Typography>
          <Typography variant="body2" component="ul" sx={{ pl: 2, m: 0, fontSize: '0.8125rem', color: 'text.secondary' }}>
            <li>Google Account email & display name for login authentication.</li>
            <li>Google Sheets spreadsheet data for authorized personal budget syncing.</li>
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            2. Zero Commercial Use or AI Training
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
            We do NOT sell, rent, trade, or share your financial data with third parties. Your data is NEVER used for advertising targeting or training artificial intelligence (AI) models.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            3. Full Access Control
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
            You can revoke access anytime via{' '}
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontWeight: 700 }}
            >
              Google Permissions Settings
            </a>
            .
          </Typography>
        </Box>

        <Box sx={{ pt: 1, textAlign: 'center' }}>
          <a
            href="/privacy.html"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: '0.75rem', fontWeight: 700 }}
          >
            View Full External Privacy Webpage →
          </a>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

