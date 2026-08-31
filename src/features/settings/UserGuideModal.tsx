import { useState, type SyntheticEvent } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Grid from '@mui/material/Grid';
import Divider from '@mui/material/Divider';

import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import StorageIcon from '@mui/icons-material/Storage';
import CalculateIcon from '@mui/icons-material/Calculate';
import PieChartIcon from '@mui/icons-material/PieChart';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlineOutlined';
import CloseIcon from '@mui/icons-material/Close';

import { evaluateAmountExpression } from '../../domain/evaluateAmount';
import { MuffinIcon } from '../../components/ui/MuffinIcon';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReplayTour?: () => void;
}

export function UserGuideModal({
  isOpen,
  onClose,
  onReplayTour,
}: UserGuideModalProps) {
  const [tabIndex, setTabIndex] = useState(0);
  const [calcInput, setCalcInput] = useState('1000 * 18%');
  const calcResult = evaluateAmountExpression(calcInput);

  const handleTabChange = (_: SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="md"
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
            <MuffinIcon className="h-6 w-6" />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Interactive User Guide
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Learn essentials, formulas, recurring rules, and Google Sheets setup
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
        <Tabs
          value={tabIndex}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab icon={<AutoAwesomeIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Overview" sx={{ textTransform: 'none', fontWeight: 700 }} />
          <Tab icon={<EventRepeatIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Recurring" sx={{ textTransform: 'none', fontWeight: 700 }} />
          <Tab icon={<StorageIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Sheet Setup" sx={{ textTransform: 'none', fontWeight: 700 }} />
          <Tab icon={<CalculateIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Calculator" sx={{ textTransform: 'none', fontWeight: 700 }} />
          <Tab icon={<PieChartIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Touch Charts" sx={{ textTransform: 'none', fontWeight: 700 }} />
          <Tab icon={<HelpOutlineIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="FAQ" sx={{ textTransform: 'none', fontWeight: 700 }} />
        </Tabs>
      </Box>

      <DialogContent sx={{ py: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {tabIndex === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, borderColor: 'primary.main', bgcolor: 'action.hover' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main', mb: 0.5 }}>
                Welcome to Muffin!
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: 'text.secondary', lineHeight: 1.6 }}>
                Muffin connects your Google Sheet to a mobile dashboard. Log income, expenses, and investments with category chips, amount math, and live net-worth tracking. Home greets you by name; Settings shows your signed-in Google account. Customize with 12 muffin themes and 7 typography styles.
              </Typography>
            </Paper>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main', mb: 0.5 }}>
                    Real-time Balance Cards
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                    Track Cash / Bank, Liquid Reserves, Total Invested, and Overall Net Worth calculated live from your sheet.
                  </Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main', mb: 0.5 }}>
                    Smart Amount Input
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                    Evaluate math equations on the fly inside the amount field like <code>5000 * 3</code> or <code>1200 + 18%</code>.
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}

        {tabIndex === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                Monthly Due Smart Alert
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: 'text.secondary', lineHeight: 1.6 }}>
                Muffin automatically compares your configured recurring rules against actual transactions logged in the current calendar month. When recurring expenses or SIPs are pending, a glowing banner appears with a 1-click <strong>Log All Due</strong> button.
              </Typography>
            </Paper>
          </Box>
        )}

        {tabIndex === 2 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                Required Google Sheets Tabs
              </Typography>
              <Typography variant="body2" component="div" sx={{ fontSize: '0.8125rem', color: 'text.secondary', lineHeight: 1.6 }}>
                Muffin structures your data across 4 dedicated tabs:
                <ul>
                  <li><strong>Income</strong>: Date, Category, Amount, Comment, Id</li>
                  <li><strong>Expense</strong>: Date, Category, Amount, Comment, Id</li>
                  <li><strong>Investment</strong>: Date, Type, Amount, Comment, Id</li>
                  <li><strong>Recipe</strong>: Starting balances and recurring rules configuration</li>
                </ul>
              </Typography>
            </Paper>
          </Box>
        )}

        {tabIndex === 3 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Try Amount Expression Math
              </Typography>
              <TextField
                label="Expression"
                value={calcInput}
                onChange={(e) => setCalcInput(e.target.value)}
                size="small"
                fullWidth
                helperText="Supports +, -, *, /, % (e.g. 5000*3, 1000-15%)"
                sx={{ mb: 2 }}
              />
              <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Evaluated Result:
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main' }}>
                  {calcResult !== null && typeof calcResult === 'object' && 'value' in calcResult ? `₹${calcResult.value.toLocaleString('en-IN')}` : 'Invalid syntax'}
                </Typography>
              </Box>
            </Paper>
          </Box>
        )}

        {tabIndex === 4 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                Interactive Analytics
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: 'text.secondary', lineHeight: 1.6 }}>
                Tap any KPI card on Home or any month on Insights to open detailed bottom sheet drawers with smooth animated SVGs and breakdown percentages.
              </Typography>
            </Paper>
          </Box>
        )}

        {tabIndex === 5 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                Frequently Asked Questions
              </Typography>
              <Typography variant="body2" component="div" sx={{ fontSize: '0.8125rem', color: 'text.secondary', lineHeight: 1.6 }}>
                <p><strong>Where is my financial data stored?</strong><br />Directly on your private Google Drive sheet. Muffin has no server database.</p>
                <Divider sx={{ my: 1 }} />
                <p><strong>Can I use Muffin offline?</strong><br />Yes, Muffin caches your recent transactions and opens instantly as an installable PWA.</p>
              </Typography>
            </Paper>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
        {onReplayTour ? (
          <Button onClick={onReplayTour} color="primary" sx={{ textTransform: 'none', fontWeight: 700 }}>
            Replay Interactive Tour
          </Button>
        ) : <Box />}
        <Button onClick={onClose} variant="contained" sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, px: 3 }}>
          Got It
        </Button>
      </DialogActions>
    </Dialog>
  );
}
