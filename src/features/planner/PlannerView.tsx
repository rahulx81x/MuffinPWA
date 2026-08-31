import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';

import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import LayersIcon from '@mui/icons-material/Layers';
import DeleteIcon from '@mui/icons-material/Delete';
import SparklesIcon from '@mui/icons-material/AutoAwesome';

import { useRecipeConfig } from '../../hooks/useRecipeConfig';
import { useMask } from '../../hooks/useMask';
import { buildMonthlyKPIs, currentMonthKey, monthKey, monthLabel } from '../../domain/metrics';
import { isCountedInvestment } from '../../domain/providentFund';
import type { NewTransactionInput, Transaction } from '../../domain/types';
import type { PlannerMode } from '../../hooks/usePlannerStore';
import {
  TransactionForm,
  type TransactionFormData,
} from '../../components/molecules/TransactionForm';
import { EmptyState } from '../../components/molecules/EmptyState';

interface PlannerViewProps {
  sheetTransactions: Transaction[];
  currentMonthPlannerTransactions?: Transaction[];
  blankPlannerTransactions?: Transaction[];
  plannerTransactions?: Transaction[];
  onAdd: (input: NewTransactionInput, mode?: PlannerMode) => void;
  onRemove: (id: string, mode?: PlannerMode) => void;
  onClear: (mode?: PlannerMode) => void;
}

function pct(part: number, whole: number): number {
  if (!whole) return 0;
  return (part / whole) * 100;
}

export function PlannerView({
  sheetTransactions,
  currentMonthPlannerTransactions,
  blankPlannerTransactions,
  plannerTransactions = [],
  onAdd,
  onRemove,
  onClear,
}: PlannerViewProps) {
  const { masked, formatCurrency } = useMask();
  const { config: recipeConfig } = useRecipeConfig();
  const thisMonth = currentMonthKey();
  const [plannerMode, setPlannerMode] = useState<PlannerMode>('current-month');

  const currentMonthEntries = useMemo(
    () => currentMonthPlannerTransactions ?? plannerTransactions,
    [currentMonthPlannerTransactions, plannerTransactions]
  );
  const blankEntries = useMemo(
    () => blankPlannerTransactions ?? [],
    [blankPlannerTransactions]
  );

  const monthTx = useMemo(() => {
    if (plannerMode === 'blank') {
      return blankEntries;
    }
    const currentMonthSheetTx = sheetTransactions.filter((t) => monthKey(t.date) === thisMonth);
    return [...currentMonthSheetTx, ...currentMonthEntries];
  }, [sheetTransactions, currentMonthEntries, blankEntries, thisMonth, plannerMode]);

  const income = monthTx
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0);
  const expenses = monthTx
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);
  const investment = monthTx
    .filter(isCountedInvestment)
    .reduce((s, t) => s + t.amount, 0);
  const liquid = income - expenses - investment;
  const savingsPct = pct(investment + liquid, income);

  const previousClose = useMemo(() => {
    if (plannerMode === 'blank') {
      return 0;
    }
    const monthly = buildMonthlyKPIs(sheetTransactions, recipeConfig.openingBalance);
    const prior = monthly.filter((m) => m.key < thisMonth);
    return prior.length > 0
      ? prior[prior.length - 1].closingLiquid
      : recipeConfig.openingBalance;
  }, [sheetTransactions, thisMonth, recipeConfig, plannerMode]);
  const closingBalance = previousClose + liquid;

  const plannerDisplayList = useMemo(() => {
    return plannerMode === 'blank' ? blankEntries : currentMonthEntries;
  }, [blankEntries, currentMonthEntries, plannerMode]);

  const expenseBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    monthTx
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        map[t.category] = (map[t.category] || 0) + t.amount;
      });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [monthTx]);

  function handleFormSubmit(data: TransactionFormData) {
    onAdd(
      {
        date: data.date,
        type: data.type,
        category: data.category,
        amount: data.amount,
        comment: data.comment,
        investmentType: data.investmentType,
      },
      plannerMode
    );
  }

  return (
    <Box component="section" sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* Header Banner & Mode Selector */}
      <Card variant="outlined" sx={{ borderRadius: 3, p: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 2 }}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              Planner
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}>
              {plannerMode === 'current-month'
                ? `Starts with ${monthLabel(thisMonth)} transactions + staged what-if entries.`
                : 'Blank canvas — every entry is simulated in-memory only.'}
            </Typography>
          </Box>

          <ToggleButtonGroup
            value={plannerMode}
            exclusive
            size="small"
            onChange={(_, newMode) => {
              if (newMode) setPlannerMode(newMode);
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
                px: 1.5,
                py: 0.5,
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
            <ToggleButton value="current-month">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <CalendarMonthIcon sx={{ fontSize: 16 }} />
                <span>Current Month</span>
              </Box>
            </ToggleButton>
            <ToggleButton value="blank">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <LayersIcon sx={{ fontSize: 16 }} />
                <span>Blank</span>
              </Box>
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Card>

      {/* 6 Stat Tiles */}
      <Grid container spacing={1.5}>
        {[
          { label: 'Income', value: formatCurrency(income), color: 'success.main' },
          { label: 'Expenses', value: formatCurrency(expenses), color: 'error.main' },
          { label: 'Investment', value: formatCurrency(investment), color: 'secondary.main' },
          { label: 'Net Liquid', value: formatCurrency(liquid), color: liquid >= 0 ? 'success.main' : 'error.main' },
          { label: 'Savings %', value: `${savingsPct.toFixed(1)}%`, color: savingsPct >= 0 ? 'primary.main' : 'error.main' },
          { label: 'Closing Cash', value: formatCurrency(closingBalance), color: closingBalance >= 0 ? 'text.primary' : 'error.main' },
        ].map((stat) => (
          <Grid size={{ xs: 6, sm: 4, md: 2 }} key={stat.label}>
            <Card variant="outlined" sx={{ borderRadius: 3, p: 1.5, height: '100%' }}>
              <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: 'text.secondary', display: 'block' }}>
                {stat.label}
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 900, color: stat.color, fontVariantNumeric: 'tabular-nums', mt: 0.5 }}>
                {stat.value}
              </Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Add Planning Entry */}
      <Card variant="outlined" sx={{ borderRadius: 3, p: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>
          Add planning entry
        </Typography>
        <TransactionForm
          transactions={sheetTransactions}
          submitLabel="Add to plan"
          onSubmit={handleFormSubmit}
          layout="inline"
          showDate={false}
          resetOnSubmit={true}
        />
      </Card>

      {/* Expense Categories */}
      <Card variant="outlined" sx={{ borderRadius: 3, p: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>
          Expense categories
        </Typography>
        {expenseBreakdown.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            No expenses this month yet.
          </Typography>
        ) : (
          <List disablePadding>
            {expenseBreakdown.map(([name, amount], idx) => (
              <Box key={name}>
                {idx > 0 && <Divider />}
                <ListItem sx={{ py: 1, px: 0, display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{name}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: 'error.main', fontVariantNumeric: 'tabular-nums' }}>
                    {masked ? `${pct(amount, expenses).toFixed(1)}%` : `${formatCurrency(amount)} (${pct(amount, expenses).toFixed(1)}%)`}
                  </Typography>
                </ListItem>
              </Box>
            ))}
          </List>
        )}
      </Card>

      {/* Mock Entries List */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            {plannerMode === 'blank' ? 'In-Memory Entries' : 'Mock Entries'} ({plannerDisplayList.length})
          </Typography>
          {plannerDisplayList.length > 0 && (
            <Button size="small" color="error" onClick={() => onClear(plannerMode)} sx={{ textTransform: 'none', fontWeight: 700 }}>
              Clear all
            </Button>
          )}
        </Box>

        {plannerDisplayList.length === 0 ? (
          <EmptyState
            icon={<SparklesIcon sx={{ fontSize: 24 }} />}
            title={plannerMode === 'blank' ? 'No in-memory entries yet' : 'No planning entries yet'}
            description={
              plannerMode === 'blank'
                ? 'In Blank mode, every transaction is in-memory. Add what-if income, expenses, or investments above to build a scenario from scratch.'
                : 'Add what-if income, expenses, or investments above to simulate cash flow on top of your current month without altering your Google Sheet.'
            }
          />
        ) : (
          <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <List disablePadding>
              {plannerDisplayList.map((t, idx) => (
                <Box key={t.id}>
                  {idx > 0 && <Divider />}
                  <ListItem
                    secondaryAction={
                      <IconButton edge="end" size="small" color="error" onClick={() => onRemove(t.id, plannerMode)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    }
                    sx={{ py: 1.25, px: 2 }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {t.category}
                          </Typography>
                          <Chip label={t.type} size="small" sx={{ height: 20, fontSize: '0.6875rem', textTransform: 'uppercase', fontWeight: 700 }} />
                        </Box>
                      }
                      secondary={formatCurrency(t.amount)}
                      slotProps={{
                        secondary: { variant: 'caption', sx: { fontWeight: 600 } },
                      }}
                    />
                  </ListItem>
                </Box>
              ))}
            </List>
          </Paper>
        )}
      </Box>
    </Box>
  );
}

/** Helper kept for callers that still construct planner rows. */
export { toPlannerTransaction } from '../../hooks/usePlannerStore';

