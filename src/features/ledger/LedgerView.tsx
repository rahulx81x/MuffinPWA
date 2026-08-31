import { useDeferredValue, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';

import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import FilterListIcon from '@mui/icons-material/FilterList';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import LocalCafeIcon from '@mui/icons-material/LocalCafe';
import HomeIcon from '@mui/icons-material/Home';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import ElectricBoltIcon from '@mui/icons-material/ElectricBolt';
import CreditCardIcon from '@mui/icons-material/CreditCard';

import { useMask } from '../../hooks/useMask';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { monthLabel } from '../../domain/metrics';
import type { Transaction, TransactionType } from '../../domain/types';
import { EmptyState } from '../../components/molecules/EmptyState';

interface DateGroup {
  dateIso: string;
  displayTitle: string;
  totalExpense: number;
  totalIncome: number;
  totalInvestment: number;
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

function formatDateSectionTitle(dateIso: string): string {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

  if (dateIso === todayStr) return 'Today';
  if (dateIso === yesterdayStr) return 'Yesterday';

  const [y, m, d] = dateIso.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  return dateObj.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatFullDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  return dateObj.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatShortRange(from: string, to: string): string {
  const f = new Date(from + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
  const t = new Date(to + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
  if (from && to) return `${f} → ${t}`;
  if (from) return `From ${f}`;
  if (to) return `Until ${t}`;
  return 'Custom range';
}

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}

function TransactionCategoryIcon({
  type,
  category,
}: {
  type: TransactionType;
  category: string;
}) {
  const cat = category.toLowerCase();

  let icon = <ArrowDownwardIcon sx={{ fontSize: 18 }} />;
  let color = 'error.main';
  let bgcolor = 'error.lighter';

  if (type === 'income') {
    icon = <ArrowUpwardIcon sx={{ fontSize: 18 }} />;
    color = 'success.main';
    bgcolor = 'success.lighter';
  } else if (type === 'investment') {
    icon = <TrendingUpIcon sx={{ fontSize: 18 }} />;
    color = 'secondary.main';
    bgcolor = 'secondary.lighter';
  } else {
    if (cat.includes('food') || cat.includes('restaurant') || cat.includes('dining')) {
      icon = <RestaurantIcon sx={{ fontSize: 18 }} />;
    } else if (cat.includes('coffee') || cat.includes('tea') || cat.includes('cafe')) {
      icon = <LocalCafeIcon sx={{ fontSize: 18 }} />;
    } else if (cat.includes('rent') || cat.includes('home') || cat.includes('housing')) {
      icon = <HomeIcon sx={{ fontSize: 18 }} />;
    } else if (cat.includes('grocer') || cat.includes('supermarket') || cat.includes('shop')) {
      icon = <ShoppingBagIcon sx={{ fontSize: 18 }} />;
    } else if (cat.includes('bill') || cat.includes('electricity') || cat.includes('utility') || cat.includes('wifi')) {
      icon = <ElectricBoltIcon sx={{ fontSize: 18 }} />;
    } else if (cat.includes('card') || cat.includes('loan') || cat.includes('emi')) {
      icon = <CreditCardIcon sx={{ fontSize: 18 }} />;
    }
  }

  return (
    <Box
      sx={{
        width: 36,
        height: 36,
        borderRadius: 2.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: bgcolor || 'action.hover',
        color: color || 'text.primary',
      }}
    >
      {icon}
    </Box>
  );
}

const TYPE_FILTERS: { id: TransactionType | 'all'; label: string }[] = [
  { id: 'all', label: 'All Types' },
  { id: 'expense', label: 'Expense' },
  { id: 'income', label: 'Income' },
  { id: 'investment', label: 'Investment' },
];

export interface LedgerViewProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  onRefresh?: () => Promise<void>;
  mutating?: boolean;
  onAddTransaction?: () => void;
  recurringBanner?: React.ReactNode;
  initialMonthFilter?: string;
}

export function LedgerView({
  transactions,
  onEdit,
  onDelete,
  onRefresh,
  mutating,
  onAddTransaction,
  recurringBanner,
  initialMonthFilter,
}: LedgerViewProps) {
  const { masked, formatCurrency } = useMask();
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const searchTerm = normalizeSearch(deferredQuery);

  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all');
  const [dateMode, setDateMode] = useState<'all' | 'month' | 'custom'>(
    initialMonthFilter ? 'month' : 'all'
  );
  const [monthFilter, setMonthFilter] = useState<string>(initialMonthFilter || '');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [viewingTx, setViewingTx] = useState<Transaction | null>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [menuTx, setMenuTx] = useState<Transaction | null>(null);

  const { containerRef, pullDistance, refreshing } = usePullToRefresh<HTMLElement>({
    onRefresh: onRefresh || (() => {}),
    disabled: !onRefresh,
  });

  const sortedTransactions = useMemo(
    () => [...transactions].sort((a, b) => b.date.localeCompare(a.date)),
    [transactions]
  );

  const monthOptions = useMemo(() => {
    const keys = new Set<string>();
    for (const tx of transactions) {
      if (tx.date) keys.add(tx.date.slice(0, 7));
    }
    return Array.from(keys).sort((a, b) => b.localeCompare(a));
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return sortedTransactions.filter((tx) => {
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      if (dateMode === 'month' && monthFilter && !tx.date.startsWith(monthFilter)) {
        return false;
      }
      if (dateMode === 'custom') {
        if (fromDate && tx.date < fromDate) return false;
        if (toDate && tx.date > toDate) return false;
      }
      if (!searchTerm) return true;
      const category = (tx.category || '').toLowerCase();
      const comment = (tx.comment || '').toLowerCase();
      return category.includes(searchTerm) || comment.includes(searchTerm);
    });
  }, [sortedTransactions, typeFilter, dateMode, monthFilter, fromDate, toDate, searchTerm]);

  const groupedTransactions = useMemo<DateGroup[]>(() => {
    const groupsMap = new Map<string, Transaction[]>();
    for (const tx of filteredTransactions) {
      const list = groupsMap.get(tx.date) || [];
      list.push(tx);
      groupsMap.set(tx.date, list);
    }

    const groups: DateGroup[] = [];
    groupsMap.forEach((txs, dateIso) => {
      let totalExpense = 0;
      let totalIncome = 0;
      let totalInvestment = 0;
      for (const t of txs) {
        if (t.type === 'expense') totalExpense += t.amount;
        else if (t.type === 'income') totalIncome += t.amount;
        else if (t.type === 'investment') totalInvestment += t.amount;
      }

      groups.push({
        dateIso,
        displayTitle: formatDateSectionTitle(dateIso),
        totalExpense,
        totalIncome,
        totalInvestment,
        transactions: txs,
      });
    });

    return groups.sort((a, b) => b.dateIso.localeCompare(a.dateIso));
  }, [filteredTransactions]);

  const customRangeActive = dateMode === 'custom' && Boolean(fromDate || toDate);
  const hasActiveFilters = typeFilter !== 'all' || dateMode === 'month' || customRangeActive;

  function clearFilters() {
    setTypeFilter('all');
    setDateMode('all');
    setMonthFilter('');
    setFromDate('');
    setToDate('');
    setQuery('');
  }

  function handleOpenMenu(event: React.MouseEvent<HTMLElement>, tx: Transaction) {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
    setMenuTx(tx);
  }

  function handleCloseMenu() {
    setMenuAnchorEl(null);
    setMenuTx(null);
  }

  return (
    <Box ref={containerRef} component="section" sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* Pull to refresh */}
      {(pullDistance > 0 || refreshing) && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: refreshing ? 48 : pullDistance }}>
          <Chip label={refreshing ? 'Refreshing transactions…' : 'Pull down to refresh'} size="small" />
        </Box>
      )}

      {recurringBanner}

      {/* Search & Filter Header */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search category or note…"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                endAdornment: query ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setQuery('')}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
                sx: { borderRadius: 3 },
              },
            }}
          />

          <IconButton
            onClick={() => setFiltersOpen((o) => !o)}
            color={filtersOpen || hasActiveFilters ? 'primary' : 'default'}
            sx={{
              border: 1,
              borderColor: filtersOpen || hasActiveFilters ? 'primary.main' : 'divider',
              borderRadius: 3,
              p: 1,
            }}
          >
            <FilterListIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
            {typeFilter !== 'all' && (
              <Chip
                label={TYPE_FILTERS.find((f) => f.id === typeFilter)?.label}
                size="small"
                color="primary"
                onDelete={() => setTypeFilter('all')}
              />
            )}
            {dateMode === 'month' && monthFilter && (
              <Chip
                label={monthLabel(monthFilter)}
                size="small"
                color="primary"
                onDelete={() => {
                  setDateMode('all');
                  setMonthFilter('');
                }}
              />
            )}
            {customRangeActive && (
              <Chip
                label={formatShortRange(fromDate, toDate)}
                size="small"
                color="primary"
                onDelete={() => {
                  setDateMode('all');
                  setFromDate('');
                  setToDate('');
                }}
              />
            )}
            <Button size="small" onClick={clearFilters} sx={{ fontSize: '0.75rem', textTransform: 'none', fontWeight: 700 }}>
              Reset all
            </Button>
          </Box>
        )}

        {/* Collapsible Filter Panel */}
        <Collapse in={filtersOpen}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary', display: 'block', mb: 1 }}>
                Type
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {TYPE_FILTERS.map((f) => (
                  <Chip
                    key={f.id}
                    label={f.label}
                    size="small"
                    clickable
                    color={typeFilter === f.id ? 'primary' : 'default'}
                    variant={typeFilter === f.id ? 'filled' : 'outlined'}
                    onClick={() => setTypeFilter(f.id)}
                    sx={{ fontWeight: 600 }}
                  />
                ))}
              </Box>
            </Box>

            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary', display: 'block', mb: 1 }}>
                Date Range
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 0.5 }}>
                <Chip
                  label="All Dates"
                  size="small"
                  clickable
                  color={dateMode === 'all' ? 'primary' : 'default'}
                  variant={dateMode === 'all' ? 'filled' : 'outlined'}
                  onClick={() => {
                    setDateMode('all');
                    setMonthFilter('');
                  }}
                  sx={{ fontWeight: 600 }}
                />
                <Chip
                  label="Custom Range"
                  size="small"
                  clickable
                  color={dateMode === 'custom' ? 'primary' : 'default'}
                  variant={dateMode === 'custom' ? 'filled' : 'outlined'}
                  onClick={() => {
                    setDateMode('custom');
                    setMonthFilter('');
                  }}
                  sx={{ fontWeight: 600 }}
                />
                {monthOptions.map((key) => (
                  <Chip
                    key={key}
                    label={monthLabel(key)}
                    size="small"
                    clickable
                    color={dateMode === 'month' && monthFilter === key ? 'primary' : 'default'}
                    variant={dateMode === 'month' && monthFilter === key ? 'filled' : 'outlined'}
                    onClick={() => {
                      setDateMode('month');
                      setMonthFilter(key);
                    }}
                    sx={{ fontWeight: 600 }}
                  />
                ))}
              </Box>

              {dateMode === 'custom' && (
                <Box sx={{ mt: 1.5, display: 'flex', gap: 1.5 }}>
                  <TextField
                    fullWidth
                    type="date"
                    size="small"
                    label="From"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    slotProps={{
                      inputLabel: { shrink: true },
                      input: { sx: { borderRadius: 2 } },
                    }}
                  />
                  <TextField
                    fullWidth
                    type="date"
                    size="small"
                    label="To"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    slotProps={{
                      inputLabel: { shrink: true },
                      input: { sx: { borderRadius: 2 } },
                    }}
                  />
                </Box>
              )}
            </Box>
          </Paper>
        </Collapse>
      </Box>

      {/* Ledger Timeline */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 1.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            Ledger Timeline
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
            {filteredTransactions.length} of {sortedTransactions.length} entries
          </Typography>
        </Box>

        {groupedTransactions.length === 0 ? (
          <EmptyState
            icon={<SearchIcon sx={{ fontSize: 24 }} />}
            title={sortedTransactions.length === 0 ? 'No transactions yet' : 'No matching entries'}
            description={
              sortedTransactions.length === 0
                ? 'Transactions logged from your Google Sheet or added using the + button will appear here in chronological order.'
                : 'Try adjusting your search terms or clearing your date/type filters to view more transactions.'
            }
            action={
              sortedTransactions.length === 0 && onAddTransaction
                ? { label: 'Add First Transaction', onClick: onAddTransaction }
                : hasActiveFilters || query
                  ? { label: 'Clear Filters', onClick: clearFilters }
                  : undefined
            }
          />
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {groupedTransactions.map((group) => (
              <Box key={group.dateIso} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {/* Date Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 0.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 0.5 }}>
                    {group.displayTitle}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1.5 }}>
                    {group.totalIncome > 0 && (
                      <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                        +{formatCurrency(group.totalIncome)}
                      </Typography>
                    )}
                    {group.totalExpense > 0 && (
                      <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                        −{formatCurrency(group.totalExpense)}
                      </Typography>
                    )}
                  </Box>
                </Box>

                {/* Transactions Paper */}
                <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
                  <List disablePadding>
                    {group.transactions.map((tx, idx) => (
                      <Box key={tx.id}>
                        {idx > 0 && <Divider />}
                        <ListItem
                          secondaryAction={
                            <IconButton edge="end" size="small" onClick={(e) => handleOpenMenu(e, tx)}>
                              <MoreVertIcon fontSize="small" />
                            </IconButton>
                          }
                          sx={{ py: 1.5, px: 2, cursor: 'pointer' }}
                          onClick={() => setViewingTx(tx)}
                        >
                          <ListItemIcon sx={{ minWidth: 48 }}>
                            <TransactionCategoryIcon type={tx.type} category={tx.category} />
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 2 }}>
                                <Typography variant="subtitle2" noWrap sx={{ fontWeight: 800, maxWidth: '65%' }}>
                                  {tx.category || '—'}
                                </Typography>
                                <Typography
                                  variant="subtitle2"
                                  sx={{
                                    fontWeight: 800,
                                    color: amountColor(tx.type),
                                    fontVariantNumeric: 'tabular-nums',
                                  }}
                                >
                                  {amountPrefix(tx.type, masked, tx.amount)}
                                  {formatCurrency(tx.amount)}
                                </Typography>
                              </Box>
                            }
                            secondary={
                              tx.comment?.trim() ? (
                                <Typography variant="caption" noWrap sx={{ color: 'text.secondary', display: 'block', maxWidth: '80%' }}>
                                  {tx.comment}
                                </Typography>
                              ) : null
                            }
                          />
                        </ListItem>
                      </Box>
                    ))}
                  </List>
                </Paper>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* Row Context Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleCloseMenu}
        slotProps={{ paper: { sx: { borderRadius: 3, minWidth: 160 } } }}
      >
        <MenuItem
          onClick={() => {
            const tx = menuTx;
            handleCloseMenu();
            if (tx) setViewingTx(tx);
          }}
        >
          <ListItemIcon>
            <VisibilityIcon fontSize="small" color="primary" />
          </ListItemIcon>
          <ListItemText primary="View Details" slotProps={{ primary: { variant: 'body2', sx: { fontWeight: 600 } } }} />
        </MenuItem>

        <MenuItem
          disabled={mutating || menuTx?.tabName == null || menuTx?.rowIndex == null}
          onClick={() => {
            const tx = menuTx;
            handleCloseMenu();
            if (tx) onEdit(tx);
          }}
        >
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Edit" slotProps={{ primary: { variant: 'body2', sx: { fontWeight: 600 } } }} />
        </MenuItem>

        <MenuItem
          disabled={mutating || menuTx?.tabName == null || menuTx?.rowIndex == null}
          onClick={() => {
            const tx = menuTx;
            handleCloseMenu();
            if (tx) onDelete(tx);
          }}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText primary="Delete" slotProps={{ primary: { variant: 'body2', sx: { fontWeight: 600, color: 'error.main' } } }} />
        </MenuItem>
      </Menu>

      {/* Transaction Details Dialog */}
      {viewingTx && (
        <Dialog
          open={Boolean(viewingTx)}
          onClose={() => setViewingTx(null)}
          maxWidth="xs"
          fullWidth
          slotProps={{ paper: { sx: { borderRadius: 4, p: 1 } } }}
        >
          <DialogTitle sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', pb: 1 }}>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 1 }}>
                Transaction Details
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                {viewingTx.category || 'Transaction'}
              </Typography>
            </Box>
            <IconButton onClick={() => setViewingTx(null)} size="small" sx={{ color: 'text.secondary' }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </DialogTitle>

          <DialogContent sx={{ py: 1.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Amount Banner */}
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, textAlign: 'center', bgcolor: 'action.hover' }}>
              <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary' }}>
                Amount
              </Typography>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 900,
                  color: amountColor(viewingTx.type),
                  fontVariantNumeric: 'tabular-nums',
                  mt: 0.5,
                }}
              >
                {amountPrefix(viewingTx.type, masked, viewingTx.amount)}
                {formatCurrency(viewingTx.amount)}
              </Typography>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>Category</Typography>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>{viewingTx.category}</Typography>
              </Box>
              <Divider />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>Date</Typography>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>{formatFullDate(viewingTx.date)}</Typography>
              </Box>
              <Divider />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>Type</Typography>
                <Typography variant="body2" sx={{ fontWeight: 800, textTransform: 'capitalize' }}>{viewingTx.type}</Typography>
              </Box>

              {viewingTx.investmentType && (
                <>
                  <Divider />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 700 }}>Investment Type</Typography>
                    <Chip label={viewingTx.investmentType} size="small" color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
                  </Box>
                </>
              )}

              {viewingTx.comment?.trim() && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>Notes / Comment</Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>{viewingTx.comment}</Typography>
                  </Box>
                </>
              )}
            </Paper>
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<EditIcon fontSize="small" />}
              disabled={mutating || viewingTx.tabName == null || viewingTx.rowIndex == null}
              onClick={() => {
                const tx = viewingTx;
                setViewingTx(null);
                onEdit(tx);
              }}
              sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}
            >
              Edit
            </Button>
            <Button
              variant="contained"
              color="error"
              fullWidth
              startIcon={<DeleteIcon fontSize="small" />}
              disabled={mutating || viewingTx.tabName == null || viewingTx.rowIndex == null}
              onClick={() => {
                const tx = viewingTx;
                setViewingTx(null);
                onDelete(tx);
              }}
              sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}
