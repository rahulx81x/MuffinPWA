import { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import MobileStepper from '@mui/material/MobileStepper';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import DashboardIcon from '@mui/icons-material/Dashboard';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { MuffinIcon } from '../../components/ui/MuffinIcon';

interface TourModalProps {
  open: boolean;
  onComplete: (openRecipe?: boolean) => void | Promise<void>;
}

const STEPS = [
  {
    id: 'welcome',
    eyebrow: 'Welcome',
    title: 'Your sheet, baked into an app',
    body: 'Muffin reads Income, Expense, and Investment tabs from your Google Sheet and turns them into a live dashboard on your phone — installable as a PWA. New workbooks get a stable Id column so edits stay accurate even if rows move.',
    Icon: AutoAwesomeIcon,
  },
  {
    id: 'features',
    eyebrow: 'Main features',
    title: 'Home, Insights, Ledger & Settings',
    body: 'Home shows net worth and KPIs. Insights breaks down trends, categories, and what-if planning. Ledger tracks every transaction with smart search & filters. Settings houses themes, typography, amount masking, and rules.',
    Icon: DashboardIcon,
  },
  {
    id: 'recurring',
    eyebrow: 'Recurring Automation',
    title: 'Monthly bills, SIPs & reminders',
    body: 'Automate regular expenses, salary, and investment SIPs. Muffin prompts you with a smart 1-tap batch logging banner whenever scheduled payments are due in the current month.',
    Icon: EventRepeatIcon,
  },
  {
    id: 'recipe',
    eyebrow: 'Starting Balances Setup',
    title: 'Set your starting balances',
    body: 'Add your initial liquid cash balance and starting investments (FDs, mutual funds, etc.). These seed net worth before sheet transactions and sync across your account via your Google Sheet (Recipe tab).',
    Icon: AccountBalanceWalletIcon,
  },
] as const;

export function TourModal({ open, onComplete }: TourModalProps) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  async function finish(openRecipe: boolean = false) {
    if (busy) return;
    setBusy(true);
    try {
      await onComplete(openRecipe);
    } finally {
      setBusy(false);
    }
  }

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const StepIcon = current.Icon;

  return (
    <Dialog
      open={open}
      onClose={() => void finish(false)}
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: 2,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
            }}
          >
            <MuffinIcon className="h-5 w-5" />
          </Box>
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 1 }}>
              Setup Tour
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Step {step + 1} of {STEPS.length}
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={() => void finish(false)} size="small" sx={{ color: 'text.secondary' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 44,
            height: 44,
            borderRadius: 3,
            bgcolor: 'action.hover',
            color: 'primary.main',
            mb: 0.5,
          }}
        >
          <StepIcon />
        </Box>
        <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: 'primary.main', letterSpacing: 1 }}>
          {current.eyebrow}
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          {current.title}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
          {current.body}
        </Typography>

        <MobileStepper
          variant="dots"
          steps={STEPS.length}
          position="static"
          activeStep={step}
          sx={{ bgcolor: 'transparent', flexGrow: 1, px: 0, pt: 2, justifyContent: 'center' }}
          nextButton={null}
          backButton={null}
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, display: 'flex', justifyContent: 'space-between' }}>
        {step > 0 ? (
          <Button
            variant="outlined"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={busy}
            startIcon={<ArrowBackIcon />}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            Back
          </Button>
        ) : (
          <Button
            variant="text"
            onClick={() => void finish(false)}
            disabled={busy}
            sx={{ textTransform: 'none', fontWeight: 600, color: 'text.secondary' }}
          >
            Skip
          </Button>
        )}

        <Button
          variant="contained"
          onClick={() => {
            if (isLast) {
              void finish(true);
              return;
            }
            setStep((s) => Math.min(STEPS.length - 1, s + 1));
          }}
          disabled={busy}
          endIcon={!isLast ? <ArrowForwardIcon /> : undefined}
          sx={{ textTransform: 'none', fontWeight: 700 }}
        >
          {busy ? 'Saving…' : isLast ? 'Set Up Recipe Balances 🍳' : 'Next'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

