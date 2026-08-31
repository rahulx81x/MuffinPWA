import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import { useMask } from '../../hooks/useMask';
import type { Transaction } from '../../domain/types';

interface TransactionListProps {
  transactions: Transaction[];
}

function amountColor(type: Transaction['type']): string {
  if (type === 'income') return 'success.main';
  if (type === 'expense') return 'error.main';
  return 'secondary.main';
}

function amountPrefix(type: Transaction['type'], masked: boolean, amount?: number): string {
  if (masked || amount === 0) return '';
  if (type === 'income') return '+';
  if (type === 'expense') return '−';
  return '';
}

function formatDisplayDate(iso: string): string {
  const date = new Date(iso + 'T00:00:00');
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function TransactionList({ transactions }: TransactionListProps) {
  const { masked, formatCurrency } = useMask();
  const items = [...transactions].reverse().slice(0, 50);

  if (!items.length) {
    return (
      <Paper
        variant="outlined"
        sx={{
          p: 4,
          borderRadius: 3,
          textAlign: 'center',
          borderStyle: 'dashed',
        }}
      >
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          No transactions yet.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
      <List disablePadding>
        {items.map((t, idx) => (
          <Box key={t.id}>
            {idx > 0 && <Divider />}
            <ListItem sx={{ py: 1.75, px: 2, display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 0.75 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  {t.category || '—'}
                </Typography>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 800,
                    color: amountColor(t.type),
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {amountPrefix(t.type, masked, t.amount)}
                  {formatCurrency(t.amount)}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}>
                  {t.comment?.trim() ? t.comment : 'No comment'}
                </Typography>
                <Chip
                  label={formatDisplayDate(t.date)}
                  size="small"
                  sx={{ height: 20, fontSize: '0.6875rem' }}
                />
              </Box>
            </ListItem>
          </Box>
        ))}
      </List>
    </Paper>
  );
}

