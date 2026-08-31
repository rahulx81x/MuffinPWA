import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Grid from '@mui/material/Grid';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Chip from '@mui/material/Chip';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Divider from '@mui/material/Divider';

import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PieChartIcon from '@mui/icons-material/PieChart';
import SparklesIcon from '@mui/icons-material/AutoAwesome';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LayersIcon from '@mui/icons-material/Layers';

import { useRecipeConfig } from '../../hooks/useRecipeConfig';
import { useMask } from '../../hooks/useMask';
import { useTheme } from '../../hooks/useTheme';
import {
  buildMonthlyKPIs,
  currentMonthKey,
  monthKey,
  monthLabel,
} from '../../domain/metrics';
import type { NewTransactionInput, Transaction } from '../../domain/types';
import type { PlannerMode } from '../../hooks/usePlannerStore';
import { PlannerView } from '../planner/PlannerView';
import { EmptyState } from '../../components/molecules/EmptyState';

type InsightsSubTab = 'trends' | 'categories' | 'planner';

interface InsightsViewProps {
  transactions: Transaction[];
  currentMonthPlannerTransactions?: Transaction[];
  blankPlannerTransactions?: Transaction[];
  plannerTransactions?: Transaction[];
  onSelectMonth?: (monthKey: string) => void;
  onAddPlanner: (input: NewTransactionInput, mode?: PlannerMode) => void;
  onRemovePlanner: (id: string, mode?: PlannerMode) => void;
  onClearPlanner: (mode?: PlannerMode) => void;
  onAddTransaction?: () => void;
}

function pct(part: number, whole: number): number {
  if (!whole || whole <= 0) return 0;
  return (part / whole) * 100;
}

export function InsightsView({
  transactions,
  currentMonthPlannerTransactions,
  blankPlannerTransactions,
  plannerTransactions = [],
  onSelectMonth,
  onAddPlanner,
  onRemovePlanner,
  onClearPlanner,
  onAddTransaction,
}: InsightsViewProps) {
  const [subTab, setSubTab] = useState<InsightsSubTab>('trends');
  const [categoryScope, setCategoryScope] = useState<'month' | 'year' | 'all'>('month');
  const { formatCurrency } = useMask();
  const { theme } = useTheme();
  const { config: recipeConfig } = useRecipeConfig();

  const thisMonth = currentMonthKey();
  const currentYear = String(new Date().getFullYear());

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    for (const t of transactions) {
      if (t.type === 'expense') {
        const k = monthKey(t.date);
        if (k) set.add(k);
      }
    }
    set.add(thisMonth);
    return Array.from(set).sort().reverse();
  }, [transactions, thisMonth]);

  const availableYears = useMemo(() => {
    const set = new Set<string>();
    for (const t of transactions) {
      if (t.type === 'expense') {
        const y = t.date ? t.date.slice(0, 4) : '';
        if (/^\d{4}$/.test(y)) set.add(y);
      }
    }
    set.add(currentYear);
    return Array.from(set).sort().reverse();
  }, [transactions, currentYear]);

  const [selectedMonth, setSelectedMonth] = useState<string>(thisMonth);
  const [selectedYear, setSelectedYear] = useState<string>(currentYear);

  const monthlyList = useMemo(
    () => buildMonthlyKPIs(transactions, recipeConfig.openingBalance).slice().reverse(),
    [transactions, recipeConfig.openingBalance]
  );

  const categoryData = useMemo(() => {
    let targetTxs: Transaction[] = [];

    if (categoryScope === 'month') {
      targetTxs = transactions.filter(
        (t) => t.type === 'expense' && monthKey(t.date) === selectedMonth
      );
    } else if (categoryScope === 'year') {
      targetTxs = transactions.filter(
        (t) => t.type === 'expense' && (t.date ? t.date.slice(0, 4) === selectedYear : false)
      );
    } else {
      targetTxs = transactions.filter((t) => t.type === 'expense');
    }

    const counts: Record<string, { total: number; count: number }> = {};
    let totalExpense = 0;

    for (const tx of targetTxs) {
      const cat = (tx.category || 'Uncategorized').trim();
      if (!counts[cat]) counts[cat] = { total: 0, count: 0 };
      counts[cat].total += tx.amount;
      counts[cat].count += 1;
      totalExpense += tx.amount;
    }

    const sorted = Object.entries(counts)
      .map(([name, data]) => ({
        name,
        total: data.total,
        count: data.count,
        share: pct(data.total, totalExpense),
      }))
      .sort((a, b) => b.total - a.total);

    return { entries: sorted, totalExpense };
  }, [transactions, categoryScope, selectedMonth, selectedYear]);

  const scopeLabel = useMemo(() => {
    if (categoryScope === 'month') return monthLabel(selectedMonth);
    if (categoryScope === 'year') return `Year ${selectedYear}`;
    return 'All Time';
  }, [categoryScope, selectedMonth, selectedYear]);

  const chartColors = theme.chartColors;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pb: 4 }}>
      {/* Header & Tabs */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 2 }}>
        <Box>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 800 }}>
            Financial Insights
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}>
            Trends, category breakdown, and scenario planner
          </Typography>
        </Box>

        <Tabs
          value={subTab}
          onChange={(_, val) => setSubTab(val)}
          sx={{
            minHeight: 40,
            bgcolor: 'action.hover',
            borderRadius: 3,
            p: 0.5,
            '& .MuiTabs-indicator': {
              display: 'none',
            },
          }}
        >
          {[
            { id: 'trends', label: 'Trends', icon: <TrendingUpIcon sx={{ fontSize: 18 }} /> },
            { id: 'categories', label: 'Categories', icon: <PieChartIcon sx={{ fontSize: 18 }} /> },
            { id: 'planner', label: 'Planner', icon: <SparklesIcon sx={{ fontSize: 18 }} /> },
          ].map((t) => (
            <Tab
              key={t.id}
              value={t.id}
              label={t.label}
              icon={t.icon}
              iconPosition="start"
              sx={{
                minHeight: 36,
                py: 0.5,
                px: 2,
                borderRadius: 2.5,
                fontWeight: 700,
                textTransform: 'none',
                fontSize: '0.8125rem',
                color: 'text.secondary',
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                },
              }}
            />
          ))}
        </Tabs>
      </Box>

      {/* SUB-TAB 1: TRENDS */}
      {subTab === 'trends' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {monthlyList.length === 0 ? (
            <EmptyState
              icon={<CalendarMonthIcon sx={{ fontSize: 24 }} />}
              title="No monthly history yet"
              description="Your month-by-month financial progression and savings rate will appear here as soon as transactions are logged."
              action={
                onAddTransaction
                  ? { label: 'Add First Transaction', onClick: onAddTransaction }
                  : undefined
              }
            />
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 0.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: 'text.secondary' }}>
                  {monthlyList.length} Months Tracked
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Tap any month to view Ledger entries
                </Typography>
              </Box>

              <Grid container spacing={2}>
                {monthlyList.map((m) => {
                  const isClickable = Boolean(onSelectMonth);

                  return (
                    <Grid size={{ xs: 12, sm: 6 }} key={m.key}>
                      <Card variant="outlined" sx={{ borderRadius: 3 }}>
                        <CardActionArea
                          disabled={!isClickable}
                          onClick={isClickable ? () => onSelectMonth?.(m.key) : undefined}
                          sx={{ p: 2 }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                                {m.label}
                              </Typography>
                              {isClickable && (
                                <Box sx={{ display: 'flex', alignItems: 'center', color: 'primary.main' }}>
                                  <Typography variant="caption" sx={{ fontWeight: 700 }}>Ledger</Typography>
                                  <ChevronRightIcon sx={{ fontSize: 16 }} />
                                </Box>
                              )}
                            </Box>

                            <Chip
                              label={`Save ${m.totalSavingsPct.toFixed(1)}%`}
                              size="small"
                              color={m.totalSavingsPct >= 30 ? 'success' : m.totalSavingsPct > 0 ? 'primary' : 'error'}
                              sx={{ fontWeight: 800, fontSize: '0.75rem' }}
                            />
                          </Box>

                          <Grid container spacing={1} sx={{ textAlign: 'center' }}>
                            <Grid size={3}>
                              <Box sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 2 }}>
                                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', fontSize: '0.625rem', textTransform: 'uppercase' }}>
                                  Income
                                </Typography>
                                <Typography variant="caption" sx={{ fontWeight: 800, color: 'success.main', fontVariantNumeric: 'tabular-nums' }}>
                                  {formatCurrency(m.income)}
                                </Typography>
                              </Box>
                            </Grid>
                            <Grid size={3}>
                              <Box sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 2 }}>
                                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', fontSize: '0.625rem', textTransform: 'uppercase' }}>
                                  Spends
                                </Typography>
                                <Typography variant="caption" sx={{ fontWeight: 800, color: 'error.main', fontVariantNumeric: 'tabular-nums' }}>
                                  {formatCurrency(m.spends)}
                                </Typography>
                              </Box>
                            </Grid>
                            <Grid size={3}>
                              <Box sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 2 }}>
                                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', fontSize: '0.625rem', textTransform: 'uppercase' }}>
                                  Invest
                                </Typography>
                                <Typography variant="caption" sx={{ fontWeight: 800, color: 'secondary.main', fontVariantNumeric: 'tabular-nums' }}>
                                  {formatCurrency(m.investment)}
                                </Typography>
                              </Box>
                            </Grid>
                            <Grid size={3}>
                              <Box sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 2 }}>
                                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', fontSize: '0.625rem', textTransform: 'uppercase' }}>
                                  Closing
                                </Typography>
                                <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.main', fontVariantNumeric: 'tabular-nums' }}>
                                  {formatCurrency(m.closingLiquid)}
                                </Typography>
                              </Box>
                            </Grid>
                          </Grid>
                        </CardActionArea>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          )}
        </Box>
      )}

      {/* SUB-TAB 2: CATEGORIES */}
      {subTab === 'categories' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 1.5, px: 0.5 }}>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: 'text.secondary', display: 'block' }}>
                Expense Distribution
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                {scopeLabel}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <ToggleButtonGroup
                value={categoryScope}
                exclusive
                size="small"
                onChange={(_, val) => {
                  if (val) setCategoryScope(val);
                }}
                sx={{
                  bgcolor: 'action.hover',
                  borderRadius: 2.5,
                  p: 0.5,
                  '& .MuiToggleButton-root': {
                    border: 'none',
                    borderRadius: 2,
                    fontWeight: 700,
                    textTransform: 'none',
                    py: 0.5,
                    px: 1.5,
                    fontSize: '0.75rem',
                    '&.Mui-selected': {
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                    },
                  },
                }}
              >
                <ToggleButton value="month">Month</ToggleButton>
                <ToggleButton value="year">Year</ToggleButton>
                <ToggleButton value="all">All Time</ToggleButton>
              </ToggleButtonGroup>

              {categoryScope === 'month' && availableMonths.length > 0 && (
                <FormControl size="small">
                  <Select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    sx={{ borderRadius: 2.5, fontSize: '0.75rem', height: 32 }}
                  >
                    {availableMonths.map((m) => (
                      <MenuItem key={m} value={m} sx={{ fontSize: '0.8125rem' }}>
                        {monthLabel(m)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              {categoryScope === 'year' && availableYears.length > 0 && (
                <FormControl size="small">
                  <Select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    sx={{ borderRadius: 2.5, fontSize: '0.75rem', height: 32 }}
                  >
                    {availableYears.map((y) => (
                      <MenuItem key={y} value={y} sx={{ fontSize: '0.8125rem' }}>
                        {y}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Box>
          </Box>

          {categoryData.entries.length === 0 ? (
            <EmptyState
              icon={<LayersIcon sx={{ fontSize: 24 }} />}
              title="No expense data"
              description={`No expenses found for ${
                categoryScope === 'month'
                  ? monthLabel(selectedMonth)
                  : categoryScope === 'year'
                  ? `the year ${selectedYear}`
                  : 'the entire dataset'
              }.`}
              action={
                onAddTransaction
                  ? { label: 'Add Transaction', onClick: onAddTransaction }
                  : undefined
              }
            />
          ) : (
            <Grid container spacing={2}>
              {/* Donut Summary */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Card variant="outlined" sx={{ borderRadius: 3, p: 3, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: 'text.secondary' }}>
                    Total Expenses ({scopeLabel})
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.5, fontVariantNumeric: 'tabular-nums' }}>
                    {formatCurrency(categoryData.totalExpense)}
                  </Typography>

                  <Box sx={{ position: 'relative', width: 160, height: 160, my: 3 }}>
                    <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100" role="img" aria-label="Category expense distribution">
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        stroke="currentColor"
                        strokeWidth="12"
                        style={{ opacity: 0.15 }}
                      />
                      {(() => {
                        let accumulatedPct = 0;
                        const circumference = 2 * Math.PI * 40;
                        return categoryData.entries.slice(0, 8).map((entry, idx) => {
                          const strokeDasharray = `${(entry.share / 100) * circumference} ${circumference}`;
                          const strokeDashoffset = -((accumulatedPct / 100) * circumference);
                          accumulatedPct += entry.share;
                          const color = chartColors[idx % chartColors.length];

                          return (
                            <circle
                              key={entry.name}
                              cx="50"
                              cy="50"
                              r="40"
                              fill="transparent"
                              stroke={color}
                              strokeWidth="12"
                              strokeDasharray={strokeDasharray}
                              strokeDashoffset={strokeDashoffset}
                              strokeLinecap="round"
                            />
                          );
                        });
                      })()}
                    </svg>
                    <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: 'text.secondary', fontSize: '0.625rem' }}>
                        Categories
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 900 }}>
                        {categoryData.entries.length}
                      </Typography>
                    </Box>
                  </Box>
                </Card>
              </Grid>

              {/* Category Breakdown List */}
              <Grid size={{ xs: 12, md: 8 }}>
                <Card variant="outlined" sx={{ borderRadius: 3, p: 2.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>
                    Category Breakdown
                  </Typography>
                  <List disablePadding>
                    {categoryData.entries.map((entry, idx) => {
                      const color = chartColors[idx % chartColors.length];
                      return (
                        <Box key={entry.name}>
                          {idx > 0 && <Divider />}
                          <ListItem sx={{ py: 1.25, px: 0, display: 'flex', justifyContent: 'space-between' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: color }} />
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>{entry.name}</Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                  {entry.count} transaction{entry.count > 1 ? 's' : ''}
                                </Typography>
                              </Box>
                            </Box>

                            <Box sx={{ textAlign: 'right' }}>
                              <Typography variant="body2" sx={{ fontWeight: 800, color: 'error.main', fontVariantNumeric: 'tabular-nums' }}>
                                {formatCurrency(entry.total)}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                {entry.share.toFixed(1)}% of total
                              </Typography>
                            </Box>
                          </ListItem>
                        </Box>
                      );
                    })}
                  </List>
                </Card>
              </Grid>
            </Grid>
          )}
        </Box>
      )}

      {/* SUB-TAB 3: PLANNER */}
      {subTab === 'planner' && (
        <PlannerView
          sheetTransactions={transactions}
          currentMonthPlannerTransactions={currentMonthPlannerTransactions}
          blankPlannerTransactions={blankPlannerTransactions}
          plannerTransactions={plannerTransactions}
          onAdd={onAddPlanner}
          onRemove={onRemovePlanner}
          onClear={onClearPlanner}
        />
      )}
    </Box>
  );
}

