import { useMemo, useState, type FormEvent } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Autocomplete from '@mui/material/Autocomplete';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';

import {
  evaluateAmountExpression,
  looksLikeAmountExpression,
} from '../../domain/evaluateAmount';
import type { Transaction, TransactionType } from '../../domain/types';
import { SmartAmountInput } from '../../features/ledger/SmartAmountInput';

export interface TransactionFormData {
  date: string;
  type: TransactionType;
  category: string;
  amount: number;
  comment: string;
  investmentType: string;
}

export interface TransactionFormProps {
  initialValues?: {
    date?: string;
    type?: TransactionType;
    category?: string;
    amountText?: string;
    comment?: string;
    investmentType?: string;
  };
  transactions?: Transaction[];
  categoryChips?: string[];
  investmentTypeOptions?: string[];
  submitLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
  onSubmit: (data: TransactionFormData) => Promise<void> | void;
  busy?: boolean;
  externalError?: string | null;
  className?: string;
  layout?: 'modal' | 'inline';
  showDate?: boolean;
  requireDate?: boolean;
  resetOnSubmit?: boolean;
}

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function TransactionForm({
  initialValues,
  transactions = [],
  categoryChips = [],
  investmentTypeOptions = [],
  submitLabel = 'Save transaction',
  cancelLabel = 'Cancel',
  onCancel,
  onSubmit,
  busy = false,
  externalError = null,
  className = '',
  layout = 'modal',
  showDate = true,
  requireDate = true,
  resetOnSubmit = false,
}: TransactionFormProps) {
  const [date, setDate] = useState(initialValues?.date || todayIso());
  const [type, setType] = useState<TransactionType>(initialValues?.type || 'expense');
  const [category, setCategory] = useState(initialValues?.category || '');
  const [amountText, setAmountText] = useState(initialValues?.amountText || '');
  const [comment, setComment] = useState(initialValues?.comment || '');
  const [investmentType, setInvestmentType] = useState(initialValues?.investmentType || '');
  const [error, setError] = useState<string | null>(null);

  const activeCategoryChips = useMemo(() => {
    if (transactions && transactions.length > 0) {
      const counts: Record<string, number> = {};
      for (const tx of transactions) {
        if (tx.type !== type) continue;
        const cat = tx.category?.trim();
        if (!cat) continue;
        counts[cat] = (counts[cat] || 0) + 1;
      }
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([cat]) => cat)
        .slice(0, 4);
    }
    return categoryChips.slice(0, 4);
  }, [transactions, categoryChips, type]);

  const uniqueInvestmentOptions = useMemo(() => {
    const seen = new Set<string>();
    const ordered: string[] = [];
    for (const label of investmentTypeOptions) {
      const trimmed = label.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      ordered.push(trimmed);
    }
    return ordered.sort((a, b) => a.localeCompare(b));
  }, [investmentTypeOptions]);

  const activeError = externalError || error;

  function resolveAmountField(): number | null {
    const result = evaluateAmountExpression(amountText);
    if (!result.ok) {
      setError(result.error);
      return null;
    }
    return result.value;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const amountValue = resolveAmountField();
    if (amountValue == null) return;
    if (amountValue < 0) {
      setError('Amount cannot be negative.');
      return;
    }
    const finalDate = date.trim() || todayIso();
    if (showDate && requireDate && !date.trim()) {
      setError('Date is required.');
      return;
    }
    if (!category.trim()) {
      setError('Category is required.');
      return;
    }
    if (type === 'investment' && !investmentType.trim()) {
      setError('Investment Type is required for investment entries.');
      return;
    }

    try {
      await onSubmit({
        date: finalDate,
        type,
        category: category.trim(),
        amount: amountValue,
        comment: comment.trim(),
        investmentType: type === 'investment' ? investmentType.trim() : '',
      });

      if (resetOnSubmit) {
        setCategory('');
        setAmountText('');
        setComment('');
        setInvestmentType('');
        setDate(initialValues?.date || todayIso());
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit} className={className} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Type Toggle */}
      <Box>
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', mb: 0.75, display: 'block' }}>
          Transaction Type
        </Typography>
        <ToggleButtonGroup
          value={type}
          exclusive
          fullWidth
          size="small"
          onChange={(_, newType) => {
            if (newType) setType(newType);
          }}
          sx={{
            p: 0.5,
            bgcolor: 'action.hover',
            borderRadius: 3,
            '& .MuiToggleButton-root': {
              borderRadius: 2.5,
              border: 'none',
              fontWeight: 700,
              textTransform: 'none',
              py: 0.75,
              '&.Mui-selected': {
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': {
                  bgcolor: 'primary.dark',
                },
              },
            },
          }}
        >
          <ToggleButton value="expense">Expense</ToggleButton>
          <ToggleButton value="income">Income</ToggleButton>
          <ToggleButton value="investment">Investment</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Date */}
      {showDate && (
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', mb: 0.5, display: 'block' }}>
            Date
          </Typography>
          <TextField
            fullWidth
            type="date"
            size="small"
            required={requireDate}
            value={date}
            disabled={busy}
            onChange={(e) => setDate(e.target.value)}
            slotProps={{
              input: { sx: { borderRadius: 2.5 } },
            }}
          />
        </Box>
      )}

      {/* Category */}
      <Box>
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', mb: 0.5, display: 'block' }}>
          Category
        </Typography>
        <TextField
          fullWidth
          size="small"
          required
          placeholder="e.g. Groceries, Rent, Salary"
          value={category}
          disabled={busy}
          onChange={(e) => setCategory(e.target.value)}
          slotProps={{
            input: { sx: { borderRadius: 2.5 } },
          }}
        />

        {activeCategoryChips.length > 0 && (
          <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {activeCategoryChips.map((cat) => (
              <Chip
                key={cat}
                label={cat}
                size="small"
                clickable
                disabled={busy}
                onClick={() => {
                  setCategory(cat);
                  navigator.vibrate?.(8);
                }}
                color={category.toLowerCase() === cat.toLowerCase() ? 'primary' : 'default'}
                variant={category.toLowerCase() === cat.toLowerCase() ? 'filled' : 'outlined'}
                sx={{ fontWeight: 600 }}
              />
            ))}
          </Box>
        )}
      </Box>

      {/* Amount */}
      <Box>
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', mb: 0.5, display: 'block' }}>
          Amount
        </Typography>
        <SmartAmountInput
          required
          placeholder="0 or 1200 + 450 or 1000 * 18%"
          value={amountText}
          disabled={busy}
          onChange={(v) => {
            setAmountText(v);
            setError(null);
          }}
        />
        {looksLikeAmountExpression(amountText) && (
          <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>Formula preview</Typography>
            <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700, color: 'primary.main' }}>
              {(() => {
                const res = evaluateAmountExpression(amountText);
                return res.ok ? `= ${res.value}` : '…';
              })()}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Investment Type */}
      {type === 'investment' && (
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', mb: 0.5, display: 'block' }}>
            Investment Type
          </Typography>
          <Autocomplete
            freeSolo
            options={uniqueInvestmentOptions}
            value={investmentType}
            disabled={busy}
            onChange={(_, newValue) => {
              setInvestmentType(newValue || '');
            }}
            onInputChange={(_, newInputValue) => {
              setInvestmentType(newInputValue);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                placeholder="e.g. SIP, FD, Stocks, Provident Fund"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
              />
            )}
          />
          <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block', fontSize: '0.6875rem' }}>
            Pick or type a type. Use “Provident Fund”, “PF”, or “EPF” to track PF separately.
          </Typography>
        </Box>
      )}

      {/* Comment */}
      <Box>
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', mb: 0.5, display: 'block' }}>
          Comment
        </Typography>
        <TextField
          fullWidth
          size="small"
          placeholder="Optional note"
          value={comment}
          disabled={busy}
          onChange={(e) => setComment(e.target.value)}
          slotProps={{
            input: { sx: { borderRadius: 2.5 } },
          }}
        />
      </Box>

      {activeError && (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {activeError}
        </Alert>
      )}

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 1.5, pt: 1, ...(layout === 'inline' ? { justifyContent: 'flex-end' } : {}) }}>
        {onCancel && (
          <Button
            type="button"
            variant="outlined"
            onClick={onCancel}
            disabled={busy}
            sx={{ flex: 1, borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}
          >
            {cancelLabel}
          </Button>
        )}
        <Button
          type="submit"
          variant="contained"
          disabled={busy}
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
          sx={{
            flex: onCancel ? 1 : '1 1 100%',
            borderRadius: 2.5,
            textTransform: 'none',
            fontWeight: 700,
            py: 1,
          }}
        >
          {submitLabel}
        </Button>
      </Box>
    </Box>
  );
}

