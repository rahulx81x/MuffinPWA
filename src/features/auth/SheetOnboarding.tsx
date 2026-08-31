import { useRef, useState, type FormEvent } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';

import LinkIcon from '@mui/icons-material/Link';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutlineOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import { MuffinIcon } from '../../components/ui/MuffinIcon';
import { createSheet, linkSheet } from '../../api/client';

interface SheetOnboardingProps {
  userName?: string;
  onLinked: (info: { spreadsheetId: string; spreadsheetTitle: string }) => void;
}

const DEFAULT_SHEET_TITLE = 'Muffin Finances';

export function SheetOnboarding({ userName, onLinked }: SheetOnboardingProps) {
  const [mode, setMode] = useState<'choose' | 'link' | 'create'>('choose');
  const [sheetTitle, setSheetTitle] = useState('');
  const [sheetInput, setSheetInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const linkingRef = useRef(false);

  function goChoose() {
    setMode('choose');
    setError(null);
  }

  async function handleLink(e: FormEvent) {
    e.preventDefault();
    if (busy || linkingRef.current) return;
    const raw = sheetInput.trim();
    if (!raw) {
      setError('Please paste a spreadsheet URL or ID.');
      return;
    }

    setBusy(true);
    setError(null);
    linkingRef.current = true;

    try {
      const res = await linkSheet(raw);
      onLinked(res);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not link spreadsheet.';
      setError(message);
    } finally {
      setBusy(false);
      linkingRef.current = false;
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (busy || linkingRef.current) return;

    setBusy(true);
    setError(null);
    linkingRef.current = true;

    try {
      const res = await createSheet(sheetTitle.trim() || DEFAULT_SHEET_TITLE);
      onLinked(res);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not create spreadsheet.';
      setError(message);
    } finally {
      setBusy(false);
      linkingRef.current = false;
    }
  }

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default', color: 'text.primary', display: 'flex', alignItems: 'center', justifyContent: 'center', px: 3, py: 6 }}>
      <Container maxWidth="xs">
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: 'text.secondary', display: 'block' }}>
            Almost ready{userName ? `, ${userName.split(' ')[0]}` : ''}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, my: 1 }}>
            <MuffinIcon className="muffin-icon h-9 w-9" />
            <Typography variant="h5" component="h1" sx={{ fontWeight: 800 }}>
              Connect your Sheet
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem', mt: 1 }}>
            Use a workbook you already keep, or let Muffin create one with Income, Expense, and Investment tabs.
          </Typography>
        </Box>

        {error && (
          <Alert severity="warning" sx={{ mb: 3, borderRadius: 2.5 }}>
            {error}
          </Alert>
        )}

        {mode === 'choose' ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardActionArea disabled={busy} onClick={() => setMode('link')} sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ width: 40, height: 40, borderRadius: 2.5, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'primary.main', flexShrink: 0 }}>
                    <LinkIcon />
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      I already have a sheet
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                      Paste the spreadsheet URL or ID
                    </Typography>
                  </Box>
                </Box>
              </CardActionArea>
            </Card>

            <Card variant="outlined" sx={{ borderRadius: 3, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
              <CardActionArea
                disabled={busy}
                onClick={() => {
                  setMode('create');
                  setError(null);
                }}
                sx={{ p: 2.5 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ width: 40, height: 40, borderRadius: 2.5, bgcolor: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'inherit', flexShrink: 0 }}>
                    <AddCircleOutlineIcon />
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'inherit' }}>
                      Create a sheet for me
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)', display: 'block' }}>
                      New workbook in your Google Drive
                    </Typography>
                  </Box>
                </Box>
              </CardActionArea>
            </Card>
          </Box>
        ) : mode === 'create' ? (
          <Box component="form" onSubmit={(e) => void handleCreate(e)} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              label="Sheet name"
              value={sheetTitle}
              onChange={(e) => setSheetTitle(e.target.value)}
              placeholder={DEFAULT_SHEET_TITLE}
              slotProps={{ htmlInput: { maxLength: 120 } }}
              disabled={busy}
              autoFocus
              fullWidth
              size="small"
              helperText="Muffin will create Income, Expense, and Investment tabs in this workbook."
            />

            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button
                variant="outlined"
                disabled={busy}
                onClick={goChoose}
                startIcon={<ArrowBackIcon />}
                sx={{ flex: 1, borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}
              >
                Back
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={busy}
                sx={{ flex: 1, borderRadius: 2.5, textTransform: 'none', fontWeight: 800 }}
              >
                {busy ? <CircularProgress size={20} color="inherit" /> : 'Create sheet'}
              </Button>
            </Box>
          </Box>
        ) : (
          <Box component="form" onSubmit={(e) => void handleLink(e)} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              label="Spreadsheet URL or ID"
              value={sheetInput}
              onChange={(e) => setSheetInput(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/…"
              required
              disabled={busy}
              autoFocus
              fullWidth
              size="small"
              helperText="Tabs must be named exactly Income, Expense, and Investment."
            />

            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button
                variant="outlined"
                disabled={busy}
                onClick={goChoose}
                startIcon={<ArrowBackIcon />}
                sx={{ flex: 1, borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}
              >
                Back
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={busy || !sheetInput.trim()}
                sx={{ flex: 1, borderRadius: 2.5, textTransform: 'none', fontWeight: 800 }}
              >
                {busy ? <CircularProgress size={20} color="inherit" /> : 'Link sheet'}
              </Button>
            </Box>
          </Box>
        )}
      </Container>
    </Box>
  );
}

