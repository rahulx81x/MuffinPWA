import { useState, useMemo, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Slider from '@mui/material/Slider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import InputAdornment from '@mui/material/InputAdornment';

import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import BoltIcon from '@mui/icons-material/Bolt';
import CheckIcon from '@mui/icons-material/Check';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditIcon from '@mui/icons-material/Edit';

import { newRecurringRuleId, type RecurrenceType, type RecurringRule, type Transaction } from '@shared';
import {
  calculateRecurringDueSummary,
  formatRecurrenceDay,
  formatRuleEndDate,
} from '../../domain/recurring';
import { useMask } from '../../hooks/useMask';
import { useRecipeConfig } from '../../hooks/useRecipeConfig';

interface RecurringManagerModalProps {
  open: boolean;
  onClose: () => void;
  onLogSingleRule?: (rule: RecurringRule) => Promise<boolean>;
  onLogAllDue?: () => Promise<boolean>;
  logging?: boolean;
  transactions?: Transaction[];
  investmentTypeOptions?: string[];
}

const filter = createFilterOptions<string>();

export function RecurringManagerModal({
  open,
  onClose,
  onLogSingleRule,
  onLogAllDue,
  logging = false,
  transactions = [],
  investmentTypeOptions = [],
}: RecurringManagerModalProps) {
  const { formatCurrency } = useMask();
  const {
    recurringRules,
    addRecurringRule,
    editRecurringRule,
    removeRecurringRule,
    toggleRecurringRule,
  } = useRecipeConfig();

  const [formMode, setFormMode] = useState<'list' | 'add' | 'edit'>('list');
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState<RecurrenceType>('expense');
  const [category, setCategory] = useState('');
  const [investmentType, setInvestmentType] = useState('');
  const [amountText, setAmountText] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [comment, setComment] = useState('');
  const [autoPrompt, setAutoPrompt] = useState(true);
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Category suggestions
  const categoryChips = useMemo(() => {
    if (!transactions || !transactions.length) return [];
    const counts: Record<string, number> = {};
    for (const tx of transactions) {
      if (tx.type !== type) continue;
      const cat = tx.category?.trim();
      if (!cat) continue;
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([cat]) => cat);
  }, [transactions, type]);

  // Investment type options
  const typeOptions = useMemo<string[]>(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const label of investmentTypeOptions || []) {
      const trimmed = label.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      list.push(trimmed);
    }
    return list.sort((a, b) => a.localeCompare(b));
  }, [investmentTypeOptions]);

  const dueSummary = useMemo(() => {
    return calculateRecurringDueSummary(recurringRules);
  }, [recurringRules]);

  const activeMonthlyTotal = useMemo(() => {
    return recurringRules
      .filter((r) => r.active && !dueSummary.expiredItems.some((e) => e.id === r.id))
      .reduce((sum, r) => sum + r.amount, 0);
  }, [recurringRules, dueSummary.expiredItems]);

  useEffect(() => {
    if (!open) {
      setFormMode('list');
      setEditingRuleId(null);
      setError(null);
    }
  }, [open]);

  function startAdd() {
    setName('');
    setType('expense');
    setCategory('');
    setInvestmentType('');
    setAmountText('');
    setDayOfMonth(1);
    setComment('');
    setAutoPrompt(true);
    setHasEndDate(false);
    setEndDate('');
    setError(null);
    setFormMode('add');
  }

  function startEdit(rule: RecurringRule) {
    setEditingRuleId(rule.id);
    setName(rule.name);
    setType(rule.type);
    setCategory(rule.category);
    setInvestmentType(rule.investmentType || '');
    setAmountText(String(rule.amount));
    setDayOfMonth(rule.dayOfMonth);
    setComment(rule.comment || '');
    setAutoPrompt(rule.autoPrompt !== false);
    setHasEndDate(Boolean(rule.endDate));
    setEndDate(rule.endDate || '');
    setError(null);
    setFormMode('edit');
  }

  async function handleSaveForm() {
    setError(null);
    const cleanName = name.trim();
    if (!cleanName) {
      setError('Please provide a name for this recurring transaction.');
      return;
    }

    const cleanAmount = Number(amountText.replace(/,/g, '').trim());
    if (!Number.isFinite(cleanAmount) || cleanAmount <= 0) {
      setError('Please enter a valid amount greater than ₹0.');
      return;
    }

    const cleanCategory = category.trim() || (type === 'income' ? 'Income' : type === 'investment' ? 'Investment' : 'Expense');
    const cleanDay = Math.max(1, Math.min(31, Math.round(dayOfMonth || 1)));
    const cleanEndDate = hasEndDate && endDate.trim() ? endDate.trim() : undefined;

    setSaving(true);
    try {
      if (formMode === 'add') {
        const newRule: RecurringRule = {
          id: newRecurringRuleId(),
          name: cleanName,
          type,
          category: cleanCategory,
          investmentType: type === 'investment' ? (investmentType.trim() || cleanCategory) : undefined,
          amount: cleanAmount,
          dayOfMonth: cleanDay,
          comment: comment.trim() || undefined,
          active: true,
          autoPrompt: true,
          endDate: cleanEndDate,
          createdAt: new Date().toISOString(),
        };
        await addRecurringRule(newRule);
      } else if (formMode === 'edit' && editingRuleId) {
        const existing = recurringRules.find((r) => r.id === editingRuleId);
        const updatedRule: RecurringRule = {
          id: editingRuleId,
          name: cleanName,
          type,
          category: cleanCategory,
          investmentType: type === 'investment' ? (investmentType.trim() || cleanCategory) : undefined,
          amount: cleanAmount,
          dayOfMonth: cleanDay,
          comment: comment.trim() || undefined,
          active: existing ? existing.active : true,
          autoPrompt,
          endDate: cleanEndDate,
          lastLoggedMonth: existing?.lastLoggedMonth,
          createdAt: existing?.createdAt || new Date().toISOString(),
        };
        await editRecurringRule(updatedRule);
      }
      setFormMode('list');
    } catch (err) {
      console.error('Failed to save recurring rule:', err);
      setError('Failed to save rule. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(ruleId: string) {
    setSaving(true);
    try {
      await removeRecurringRule(ruleId);
      if (editingRuleId === ruleId) {
        setFormMode('list');
      }
    } catch (err) {
      console.error('Failed to delete rule:', err);
      setError('Failed to delete rule.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(ruleId: string) {
    try {
      await toggleRecurringRule(ruleId);
    } catch (err) {
      console.error('Failed to toggle rule:', err);
    }
  }

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
            maxHeight: '90dvh',
          },
        },
      }}
    >
      <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {formMode !== 'list' && (
            <IconButton onClick={() => setFormMode('list')} size="small">
              <ChevronLeftIcon />
            </IconButton>
          )}
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
            <EventRepeatIcon />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {formMode === 'list'
                ? 'Recurring Rules & SIPs'
                : formMode === 'add'
                ? 'Add Recurring Rule'
                : 'Edit Recurring Rule'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {formMode === 'list'
                ? `${recurringRules.filter((r) => r.active).length} active (${formatCurrency(activeMonthlyTotal)}/mo)`
                : 'Auto-schedule monthly transactions'}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {formMode === 'list' && (
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={startAdd}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
            >
              Add
            </Button>
          )}
          <IconButton onClick={onClose} disabled={saving} size="small" sx={{ color: 'text.secondary' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ py: 1.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {error && (
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {/* LIST MODE */}
        {formMode === 'list' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Due Action Header Banner */}
            {dueSummary.dueItems.length > 0 && onLogAllDue && (
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 3,
                  borderColor: 'primary.main',
                  bgcolor: 'action.hover',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1.5,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <BoltIcon color="primary" />
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      {dueSummary.dueItems.length} Due Now ({formatCurrency(dueSummary.totalDueAmount)})
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Scheduled up to today in this billing cycle
                    </Typography>
                  </Box>
                </Box>
                <Button
                  variant="contained"
                  size="small"
                  disabled={logging}
                  onClick={() => void onLogAllDue()}
                  startIcon={logging ? <CircularProgress size={14} color="inherit" /> : <CheckIcon />}
                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                >
                  Log All
                </Button>
              </Paper>
            )}

            {/* Empty state */}
            {recurringRules.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ width: 48, height: 48, borderRadius: 3, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary' }}>
                  <EventRepeatIcon />
                </Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  No recurring rules yet
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 300 }}>
                  Automate monthly expenses, utility bills, salary, and mutual fund SIPs with 1-tap logging.
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={startAdd}
                  sx={{ mt: 1, borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                >
                  Add First Recurring Rule
                </Button>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {recurringRules.map((rule) => {
                  const isDue = dueSummary.dueItems.some((d) => d.id === rule.id);
                  const isLoggedThisMonth = dueSummary.loggedThisMonthItems.some((l) => l.id === rule.id);
                  const isExpired = dueSummary.expiredItems.some((e) => e.id === rule.id);

                  return (
                    <Paper
                      key={rule.id}
                      variant="outlined"
                      sx={{
                        p: 2,
                        borderRadius: 3,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1.5,
                        borderColor: isDue ? 'primary.main' : isLoggedThisMonth ? 'success.main' : 'divider',
                        bgcolor: isDue ? 'action.hover' : 'background.paper',
                        opacity: !rule.active || isExpired ? 0.7 : 1,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 32,
                              height: 32,
                              borderRadius: 2,
                              bgcolor: rule.type === 'income' ? 'success.main' : rule.type === 'investment' ? 'secondary.main' : 'primary.main',
                              color: '#fff',
                            }}
                          >
                            {rule.type === 'income' ? (
                              <TrendingUpIcon fontSize="small" />
                            ) : rule.type === 'investment' ? (
                              <AutoAwesomeIcon fontSize="small" />
                            ) : (
                              <EventRepeatIcon fontSize="small" />
                            )}
                          </Box>

                          <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                                {rule.name}
                              </Typography>
                              {!rule.active ? (
                                <Chip label="Paused" size="small" sx={{ height: 18, fontSize: '0.625rem' }} />
                              ) : isExpired ? (
                                <Chip label={`Ended (${formatRuleEndDate(rule.endDate)})`} size="small" sx={{ height: 18, fontSize: '0.625rem' }} />
                              ) : isDue ? (
                                <Chip label="Due Now" size="small" color="primary" sx={{ height: 18, fontSize: '0.625rem', fontWeight: 700 }} />
                              ) : isLoggedThisMonth ? (
                                <Chip label="Logged this month" size="small" color="success" sx={{ height: 18, fontSize: '0.625rem' }} />
                              ) : (
                                <Chip label="Scheduled" size="small" sx={{ height: 18, fontSize: '0.625rem' }} />
                              )}
                            </Box>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              {rule.category}
                              {rule.investmentType ? ` • ${rule.investmentType}` : ''}
                              {' • '}
                              {formatRecurrenceDay(rule.dayOfMonth)}
                              {rule.endDate && !isExpired ? ` • Ends ${formatRuleEndDate(rule.endDate)}` : ''}
                            </Typography>
                          </Box>
                        </Box>

                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                          {formatCurrency(rule.amount)}
                        </Typography>
                      </Box>

                      {/* Card Actions Bar */}
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 1, borderTop: 1, borderColor: 'divider' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Button
                            size="small"
                            onClick={() => void handleToggle(rule.id)}
                            startIcon={rule.active ? <PauseIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
                            sx={{ textTransform: 'none', fontSize: '0.75rem', p: 0.5 }}
                          >
                            {rule.active ? 'Pause' : 'Resume'}
                          </Button>
                          <Button
                            size="small"
                            onClick={() => startEdit(rule)}
                            startIcon={<EditIcon fontSize="small" />}
                            sx={{ textTransform: 'none', fontSize: '0.75rem', p: 0.5 }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            onClick={() => void handleDelete(rule.id)}
                            startIcon={<DeleteOutlineIcon fontSize="small" />}
                            sx={{ textTransform: 'none', fontSize: '0.75rem', p: 0.5 }}
                          >
                            Delete
                          </Button>
                        </Box>

                        {rule.active && onLogSingleRule && (
                          <Button
                            variant={isDue ? 'contained' : 'outlined'}
                            size="small"
                            disabled={logging}
                            onClick={() => void onLogSingleRule(rule)}
                            startIcon={<BoltIcon />}
                            sx={{ borderRadius: 2, textTransform: 'none', fontSize: '0.75rem', fontWeight: 700 }}
                          >
                            {isLoggedThisMonth ? 'Log Again' : 'Log Now'}
                          </Button>
                        )}
                      </Box>
                    </Paper>
                  );
                })}
              </Box>
            )}
          </Box>
        )}

        {/* ADD / EDIT FORM MODE */}
        {formMode !== 'list' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            {/* Type Toggle */}
            <ToggleButtonGroup
              value={type}
              exclusive
              onChange={(_, val) => val && setType(val)}
              fullWidth
              size="small"
            >
              <ToggleButton value="expense" sx={{ fontWeight: 700, textTransform: 'none' }}>
                Expense
              </ToggleButton>
              <ToggleButton value="investment" sx={{ fontWeight: 700, textTransform: 'none' }}>
                Investment
              </ToggleButton>
              <ToggleButton value="income" sx={{ fontWeight: 700, textTransform: 'none' }}>
                Income
              </ToggleButton>
            </ToggleButtonGroup>

            {/* Rule Name */}
            <TextField
              label="Rule Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={type === 'income' ? 'e.g. Monthly Salary' : type === 'investment' ? 'e.g. Mutual Fund SIP' : 'e.g. Apartment Rent'}
              fullWidth
              size="small"
            />

            {/* Category / Investment Asset Name */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <TextField
                label={type === 'investment' ? 'Investment Asset / Fund Name' : 'Category'}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder={type === 'investment' ? 'e.g. Nifty 50 Index Fund' : type === 'income' ? 'e.g. Salary' : 'e.g. Rent, Electricity'}
                fullWidth
                size="small"
              />
              {categoryChips.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {categoryChips.map((chip) => (
                    <Chip
                      key={chip}
                      label={chip}
                      size="small"
                      onClick={() => setCategory(chip)}
                      color={category.toLowerCase() === chip.toLowerCase() ? 'primary' : 'default'}
                      variant={category.toLowerCase() === chip.toLowerCase() ? 'filled' : 'outlined'}
                      sx={{ fontSize: '0.6875rem' }}
                    />
                  ))}
                </Box>
              )}
            </Box>

            {/* Investment Type (if investment) */}
            {type === 'investment' && (
              <Autocomplete
                freeSolo
                value={investmentType}
                onChange={(_, newValue) => setInvestmentType(newValue || '')}
                filterOptions={(options, params) => {
                  const filtered = filter(options, params);
                  const { inputValue } = params;
                  const isExisting = options.some((option) => inputValue === option);
                  if (inputValue !== '' && !isExisting) {
                    filtered.push(inputValue);
                  }
                  return filtered;
                }}
                options={typeOptions}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Investment Type"
                    size="small"
                    helperText="Pick from existing types or type a new one (e.g. SIP, Stocks, PF)"
                  />
                )}
              />
            )}

            {/* Amount */}
            <TextField
              label="Amount"
              type="number"
              value={amountText}
              onChange={(e) => setAmountText(e.target.value)}
              fullWidth
              size="small"
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                },
              }}
            />

            {/* Day of Month Selector */}
            <Box sx={{ px: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 0.8 }}>
                  Day of Month
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main' }}>
                  {formatRecurrenceDay(dayOfMonth)}
                </Typography>
              </Box>
              <Slider
                value={dayOfMonth}
                min={1}
                max={31}
                step={1}
                onChange={(_, val) => setDayOfMonth(val as number)}
                valueLabelDisplay="auto"
              />
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                For months with fewer days (e.g., Feb 28/29, Apr 30), it triggers on the month&apos;s last day.
              </Typography>
            </Box>

            {/* Comment / Notes */}
            <TextField
              label="Notes / Comment (Optional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="e.g. Auto-debit via HDFC Netbanking"
              fullWidth
              size="small"
            />

            {/* End Date Configuration */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={hasEndDate}
                    onChange={(e) => {
                      setHasEndDate(e.target.checked);
                      if (e.target.checked && !endDate) {
                        const nextYear = new Date();
                        nextYear.setFullYear(nextYear.getFullYear() + 1);
                        const y = nextYear.getFullYear();
                        const m = String(nextYear.getMonth() + 1).padStart(2, '0');
                        setEndDate(`${y}-${m}`);
                      }
                    }}
                  />
                }
                label={
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Set End Date / Duration
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Automatically stop recurring after a fixed period (EMIs, loans)
                    </Typography>
                  </Box>
                }
              />

              {hasEndDate && (
                <TextField
                  label="Recurring End Month (YYYY-MM)"
                  type="month"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  fullWidth
                  size="small"
                  slotProps={{
                    inputLabel: { shrink: true },
                  }}
                />
              )}
            </Paper>

            {/* Auto Prompt Switch */}
            {formMode === 'edit' && (
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
                <FormControlLabel
                  control={<Switch checked={autoPrompt} onChange={(e) => setAutoPrompt(e.target.checked)} />}
                  label={
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        Auto-prompt in Due Banner
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Display in top due banner when scheduled date arrives
                      </Typography>
                    </Box>
                  }
                />
              </Paper>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, display: 'flex', gap: 1 }}>
        {formMode === 'list' ? (
          <Button
            variant="contained"
            onClick={onClose}
            fullWidth
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
          >
            Done
          </Button>
        ) : (
          <>
            <Button
              variant="outlined"
              onClick={() => setFormMode('list')}
              disabled={saving}
              sx={{ flex: 1, borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={() => void handleSaveForm()}
              disabled={saving}
              sx={{ flex: 1, borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
            >
              {saving ? 'Saving…' : 'Save Rule'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

