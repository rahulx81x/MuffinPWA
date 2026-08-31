import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import { useMask } from '../../hooks/useMask';
import type { RecurringDueSummary } from '../../domain/recurring';

interface RecurringDueBannerProps {
  summary: RecurringDueSummary;
  logging?: boolean;
  onLogAll: () => Promise<unknown>;
  onReview: () => void;
  onDismiss: () => void;
}

export function RecurringDueBanner({
  summary,
  logging = false,
  onLogAll,
  onReview,
  onDismiss,
}: RecurringDueBannerProps) {
  const { formatCurrency } = useMask();
  const { dueItems, totalDueAmount } = summary;

  if (dueItems.length === 0) return null;

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 3,
        borderColor: 'primary.main',
        bgcolor: 'background.paper',
        boxShadow: 2,
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
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
              <EventRepeatIcon fontSize="small" />
            </Box>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: 'primary.main', letterSpacing: 0.8 }}>
                  Monthly Due
                </Typography>
                <Chip
                  label={`${dueItems.length} ${dueItems.length === 1 ? 'item' : 'items'}`}
                  size="small"
                  color="primary"
                  sx={{ height: 20, fontSize: '0.6875rem', fontWeight: 700 }}
                />
              </Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {formatCurrency(totalDueAmount)} scheduled for this month
              </Typography>
            </Box>
          </Box>

          <IconButton size="small" onClick={onDismiss} aria-label="Dismiss banner" sx={{ color: 'text.secondary' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Due Items Chips */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          {dueItems.slice(0, 4).map((item) => (
            <Chip
              key={item.id}
              variant="outlined"
              size="small"
              label={
                <Box component="span" sx={{ display: 'flex', gap: 0.5 }}>
                  <Box component="span" sx={{ maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.name}
                  </Box>
                  <Box component="strong">{formatCurrency(item.amount)}</Box>
                </Box>
              }
              sx={{ borderRadius: 1.5, fontSize: '0.75rem' }}
            />
          ))}
          {dueItems.length > 4 && (
            <Chip
              size="small"
              variant="outlined"
              label={`+${dueItems.length - 4} more`}
              sx={{ borderRadius: 1.5, fontSize: '0.75rem', color: 'text.secondary' }}
            />
          )}
        </Box>

        {/* Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pt: 0.5 }}>
          <Button
            variant="contained"
            color="primary"
            disabled={logging}
            onClick={() => void onLogAll()}
            startIcon={logging ? <CircularProgress size={16} color="inherit" /> : <FlashOnIcon />}
            sx={{ flex: 1, textTransform: 'none', borderRadius: 2, fontWeight: 700, fontSize: '0.8125rem' }}
          >
            {logging ? 'Logging to Sheet...' : `Log All Due (${formatCurrency(totalDueAmount)})`}
          </Button>

          <Button
            variant="outlined"
            color="inherit"
            disabled={logging}
            onClick={onReview}
            endIcon={<ChevronRightIcon />}
            sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600, fontSize: '0.8125rem' }}
          >
            Review
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}

