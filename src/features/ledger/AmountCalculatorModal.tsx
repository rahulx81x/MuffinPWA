import { useEffect, useMemo, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Grid from '@mui/material/Grid';
import BackspaceIcon from '@mui/icons-material/Backspace';
import CloseIcon from '@mui/icons-material/Close';
import CalculateIcon from '@mui/icons-material/Calculate';

import {
  evaluateAmountExpression,
  looksLikeAmountExpression,
} from '../../domain/evaluateAmount';

interface AmountCalculatorModalProps {
  open: boolean;
  initialExpression?: string;
  onClose: () => void;
  onApply: (value: number) => void;
}

const KEYS: { label: string; insert: string; accent?: boolean }[][] = [
  [
    { label: 'C', insert: 'C', accent: true },
    { label: '(', insert: '(' },
    { label: ')', insert: ')' },
    { label: '%', insert: '%' },
  ],
  [
    { label: '7', insert: '7' },
    { label: '8', insert: '8' },
    { label: '9', insert: '9' },
    { label: '÷', insert: '/' },
  ],
  [
    { label: '4', insert: '4' },
    { label: '5', insert: '5' },
    { label: '6', insert: '6' },
    { label: '×', insert: '*' },
  ],
  [
    { label: '1', insert: '1' },
    { label: '2', insert: '2' },
    { label: '3', insert: '3' },
    { label: '−', insert: '-' },
  ],
  [
    { label: '.', insert: '.' },
    { label: '0', insert: '0' },
    { label: '=', insert: '=', accent: true },
    { label: '+', insert: '+' },
  ],
];

function formatResult(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return String(value);
}

export function AmountCalculatorModal({
  open,
  initialExpression = '',
  onClose,
  onApply,
}: AmountCalculatorModalProps) {
  const [expression, setExpression] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [committed, setCommitted] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const seed = initialExpression.trim();
    setExpression(seed);
    setError(null);
    setCommitted(null);
  }, [open, initialExpression]);

  const evaluated = useMemo(
    () => evaluateAmountExpression(expression),
    [expression]
  );

  const canUse = committed != null || evaluated.ok;

  function appendToken(token: string) {
    setCommitted(null);
    setError(null);
    setExpression((prev) => prev + token);
  }

  function clearAll() {
    setExpression('');
    setError(null);
    setCommitted(null);
  }

  function backspace() {
    setCommitted(null);
    setError(null);
    setExpression((prev) => prev.slice(0, -1));
  }

  function evaluateEquals() {
    if (!evaluated.ok) {
      setError(evaluated.error);
      setCommitted(null);
      return;
    }
    setCommitted(evaluated.value);
    setExpression(formatResult(evaluated.value));
    setError(null);
  }

  function handleKey(insert: string) {
    if (insert === 'C') {
      clearAll();
      return;
    }
    if (insert === '=') {
      evaluateEquals();
      return;
    }
    appendToken(insert);
  }

  function handleUseResult() {
    const value = committed ?? (evaluated.ok ? evaluated.value : null);

    if (value == null) {
      setError(evaluated.ok ? 'Enter a valid expression.' : evaluated.error);
      return;
    }
    onApply(value);
    onClose();
  }

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
            <CalculateIcon fontSize="small" />
          </Box>
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 1 }}>
              Calculator
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              Amount
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ py: 1.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Screen / Expression Box */}
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            borderRadius: 2.5,
            bgcolor: 'action.hover',
            textAlign: 'right',
          }}
        >
          <Typography
            variant="h5"
            sx={{
              fontFamily: 'monospace',
              fontWeight: 800,
              wordBreak: 'break-all',
            }}
          >
            {expression || '0'}
          </Typography>
          {evaluated.ok && looksLikeAmountExpression(expression) && (
            <Typography variant="subtitle2" sx={{ color: 'primary.main', fontWeight: 700, mt: 0.5 }}>
              = {formatResult(evaluated.value)}
            </Typography>
          )}
          {error && (
            <Typography variant="caption" color="error" sx={{ fontWeight: 600, display: 'block', mt: 0.5 }}>
              {error}
            </Typography>
          )}
        </Paper>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            size="small"
            onClick={backspace}
            startIcon={<BackspaceIcon fontSize="small" />}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Delete
          </Button>
        </Box>

        {/* Keypad Grid */}
        <Grid container spacing={1}>
          {KEYS.flat().map((key) => (
            <Grid size={3} key={key.label + key.insert}>
              <Button
                fullWidth
                variant={key.accent ? 'contained' : 'outlined'}
                color={key.accent ? 'primary' : 'inherit'}
                onClick={() => handleKey(key.insert)}
                sx={{
                  height: 48,
                  borderRadius: 2,
                  fontSize: '1.125rem',
                  fontWeight: 800,
                }}
              >
                {key.label}
              </Button>
            </Grid>
          ))}
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          fullWidth
          variant="contained"
          disabled={!canUse}
          onClick={handleUseResult}
          sx={{ borderRadius: 2.5, fontWeight: 700, textTransform: 'none', py: 1.25 }}
        >
          Use result
        </Button>
      </DialogActions>
    </Dialog>
  );
}

