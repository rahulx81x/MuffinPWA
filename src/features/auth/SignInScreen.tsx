import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import Link from '@mui/material/Link';

import LinkIcon from '@mui/icons-material/Link';
import TableChartIcon from '@mui/icons-material/TableChart';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';

import { AUTH_START_URL } from '../../api/client';
import { MuffinIcon } from '../../components/ui/MuffinIcon';

interface SignInScreenProps {
  authError?: string | null;
}

const STEPS = [
  {
    title: 'Connect your sheet',
    body: 'Link an existing Google Sheet or let Muffin create Income, Expense, and Investment tabs for you.',
    icon: <LinkIcon sx={{ fontSize: 22 }} />,
  },
  {
    title: 'Log money your way',
    body: 'Add transactions in the app or edit the sheet directly — both stay in sync automatically.',
    icon: <TableChartIcon sx={{ fontSize: 22 }} />,
  },
  {
    title: 'See the full picture',
    body: 'Balances, spending, and net worth on an installable PWA dashboard that works offline.',
    icon: <DashboardIcon sx={{ fontSize: 22 }} />,
  },
] as const;

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"
      />
    </svg>
  );
}

export function SignInScreen({ authError }: SignInScreenProps) {
  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default', color: 'text.primary', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', py: { xs: 4, sm: 8 } }}>
      <Container maxWidth="lg">
        <Grid container spacing={{ xs: 5, lg: 8 }} sx={{ alignItems: 'center' }}>
          {/* Hero & CTA */}
          <Grid size={{ xs: 12, lg: 6 }} sx={{ textAlign: { xs: 'center', lg: 'left' } }}>
            <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: 'primary.main', display: 'block', mb: 1 }}>
              Personal finance · Google Sheets
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'center', lg: 'flex-start' }, gap: 1.5, my: 1 }}>
              <MuffinIcon className="muffin-icon h-11 w-11" />
              <Typography variant="h3" component="h1" sx={{ fontWeight: 900, color: 'primary.main' }}>
                Muffin
              </Typography>
            </Box>

            <Typography variant="h5" sx={{ fontWeight: 800, mt: 2, mb: 1 }}>
              Your sheet, baked into a live dashboard
            </Typography>

            <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 480, mx: { xs: 'auto', lg: 0 }, mb: 3 }}>
              Track income, expenses, and investments with a Google Sheet you own. Muffin turns that workbook into a cozy installable app — your records stay in Drive, not on our servers.
            </Typography>

            {authError && (
              <Alert severity="warning" sx={{ mb: 3, maxWidth: 420, mx: { xs: 'auto', lg: 0 }, textAlign: 'left', borderRadius: 2.5 }}>
                {authError}
              </Alert>
            )}

            <Button
              component="a"
              href={AUTH_START_URL}
              variant="contained"
              size="large"
              startIcon={<GoogleMark />}
              sx={{
                py: 1.75,
                px: 4,
                borderRadius: 3,
                fontSize: '1rem',
                fontWeight: 800,
                textTransform: 'none',
                maxWidth: 420,
                width: '100%',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                boxShadow: 3,
              }}
            >
              Sign in with Google
            </Button>

            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1.5 }}>
              Free Google account required · Your sheet stays in your Drive
            </Typography>
          </Grid>

          {/* Info Panels */}
          <Grid size={{ xs: 12, lg: 6 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {STEPS.map((step) => (
                <Card key={step.title} variant="outlined" sx={{ borderRadius: 3, p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    <Box
                      sx={{
                        width: 42,
                        height: 42,
                        borderRadius: 2.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'primary.lighter',
                        color: 'primary.main',
                        flexShrink: 0,
                      }}
                    >
                      {step.icon}
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                        {step.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8125rem', mt: 0.25 }}>
                        {step.body}
                      </Typography>
                    </Box>
                  </Box>
                </Card>
              ))}

              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, bgcolor: 'action.hover' }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <Box
                    sx={{
                      width: 42,
                      height: 42,
                      borderRadius: 2.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'success.lighter',
                      color: 'success.main',
                      flexShrink: 0,
                    }}
                  >
                    <ShieldOutlinedIcon sx={{ fontSize: 22 }} />
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      Why Google access is needed
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8125rem', mt: 0.5 }}>
                      Sign-in authenticates you and grants access only to the spreadsheet you choose. We use your email for login and Sheets solely to sync personal finance entries. We don’t sell your data or keep transaction history on our servers.
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>
                      Independently built by Rahul Gouri ·{' '}
                      <Link href="/guide.html" target="_blank" rel="noopener noreferrer" sx={{ fontWeight: 700 }}>
                        User Guide
                      </Link>
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Box>
          </Grid>
        </Grid>
      </Container>

      <Box sx={{ borderTop: 1, borderColor: 'divider', mt: 6, pt: 3, textAlign: 'center' }}>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          By signing in, you agree to Muffin’s{' '}
          <Link href="/terms.html" target="_blank" rel="noopener noreferrer" sx={{ fontWeight: 700 }}>
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy.html" target="_blank" rel="noopener noreferrer" sx={{ fontWeight: 700 }}>
            Privacy Policy
          </Link>
          .
        </Typography>
      </Box>
    </Box>
  );
}

