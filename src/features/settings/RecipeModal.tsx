import { useState, useEffect, type FormEvent } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import InputAdornment from '@mui/material/InputAdornment';

import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';

import { createEmptyInvestment, type RecipeInvestment } from '../../config';
import { useRecipeConfig } from '../../hooks/useRecipeConfig';

interface RecipeModalProps {
  open: boolean;
  onClose: () => void;
  spreadsheetId: string | null;
  spreadsheetTitle: string | null;
  investmentTypeSuggestions?: string[];
}

function parseAmountInput(value: string): number {
  const cleaned = value.replace(/,/g, '').trim();
  if (!cleaned) return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

export function RecipeModal({
  open,
  onClose,
  spreadsheetId,
  spreadsheetTitle,
  investmentTypeSuggestions = [],
}: RecipeModalProps) {
  const { config, persistConfig } = useRecipeConfig();
  const [openingBalance, setOpeningBalance] = useState('0');
  const [investments, setInvestments] = useState<RecipeInvestment[]>([]);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setOpeningBalance(String(config.openingBalance || 0));
    setInvestments(
      config.investments.length > 0
        ? config.investments.map((row) => ({ ...row }))
        : [createEmptyInvestment()]
    );
    setCopied(false);
    setError(null);
  }, [open, config]);

  async function handleCopyId() {
    if (!spreadsheetId) return;
    try {
      await navigator.clipboard.writeText(spreadsheetId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError('Could not copy sheet ID.');
    }
  }

  function updateInvestment(
    id: string,
    patch: Partial<Pick<RecipeInvestment, 'type' | 'amount'>>
  ) {
    setInvestments((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );
  }

  function removeInvestment(id: string) {
    setInvestments((prev) => {
      const next = prev.filter((row) => row.id !== id);
      return next.length > 0 ? next : [createEmptyInvestment()];
    });
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const cleaned = investments
      .map((row) => ({
        ...row,
        type: row.type.trim(),
        amount: Number.isFinite(row.amount) ? Math.max(0, row.amount) : 0,
      }))
      .filter((row) => row.type || row.amount > 0);

    for (const row of cleaned) {
      if (row.amount > 0 && !row.type) {
        setError('Give each investment amount a type label.');
        return;
      }
    }

    setSaving(true);
    try {
      await persistConfig({
        openingBalance: parseAmountInput(openingBalance),
        investments: cleaned.map((row) => ({
          ...row,
          type: row.type || 'Investment',
        })),
        recurringRules: config.recurringRules || [],
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not save recipe. Try again.'
      );
    } finally {
      setSaving(false);
    }
  }

  const suggestionList = Array.from(
    new Set(
      [
        ...investmentTypeSuggestions,
        'SIP',
        'FD',
        'Stocks',
        'Mutual Funds',
      ].map((s) => s.trim()).filter(Boolean)
    )
  ).slice(0, 4);

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
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
      <form onSubmit={handleSave}>
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
                bgcolor: 'warning.main',
                color: 'warning.contrastText',
              }}
            >
              <AccountBalanceWalletIcon />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Starting Balances
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Initial cash & investments synced to your Google Sheet
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose} disabled={saving} size="small" sx={{ color: 'text.secondary' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ py: 1.5, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {error && (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          {/* Linked Sheet Details */}
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2.5, bgcolor: 'action.hover' }}>
            <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 0.8, display: 'block' }}>
              Connected Google Sheet
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.25 }}>
              {spreadsheetTitle || 'Linked Google Sheet'}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              <TextField
                value={spreadsheetId || 'Not linked'}
                size="small"
                fullWidth
                disabled
                slotProps={{ htmlInput: { style: { fontFamily: 'monospace', fontSize: '0.75rem' } } }}
              />
              <IconButton
                onClick={() => void handleCopyId()}
                disabled={!spreadsheetId}
                size="small"
                color={copied ? 'success' : 'default'}
              >
                {copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
              </IconButton>
            </Box>
          </Paper>

          {/* Initial Opening Balance */}
          <TextField
            label="Initial Liquid Opening Balance"
            type="number"
            value={openingBalance}
            onChange={(e) => setOpeningBalance(e.target.value)}
            fullWidth
            size="small"
            disabled={saving}
            helperText="Liquid cash on hand before tracked months begin"
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
              },
            }}
          />

          {/* Initial Investments */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 0.8 }}>
                Initial Investments
              </Typography>
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => setInvestments((prev) => [...prev, createEmptyInvestment()])}
                sx={{ textTransform: 'none', fontWeight: 700 }}
              >
                Add Investment
              </Button>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {investments.map((row) => (
                <Box key={row.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TextField
                    placeholder="Type (e.g. Mutual Funds)"
                    value={row.type}
                    onChange={(e) => updateInvestment(row.id, { type: e.target.value })}
                    size="small"
                    sx={{ flex: 1 }}
                    slotProps={{ htmlInput: { list: 'recipe-investment-types' } }}
                  />
                  <TextField
                    placeholder="Amount"
                    type="number"
                    value={row.amount || ''}
                    onChange={(e) => updateInvestment(row.id, { amount: parseAmountInput(e.target.value) })}
                    size="small"
                    sx={{ width: 130 }}
                    slotProps={{
                      input: {
                        startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                      },
                    }}
                  />
                  <IconButton
                    onClick={() => removeInvestment(row.id)}
                    size="small"
                    color="error"
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Box>

            <datalist id="recipe-investment-types">
              {suggestionList.map((label) => (
                <option key={label} value={label} />
              ))}
            </datalist>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2, display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            onClick={onClose}
            disabled={saving}
            sx={{ flex: 1, borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={saving}
            sx={{ flex: 1, borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
          >
            {saving ? 'Saving…' : 'Save Balances'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

