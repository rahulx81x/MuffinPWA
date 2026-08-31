import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import { Skeleton } from './Skeleton';

export function SkeletonKpiGrid() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }} aria-busy="true" aria-label="Loading financial data">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Skeleton sx={{ height: 16, width: 120 }} />
        <Skeleton sx={{ height: 32, width: 200 }} />
      </Box>

      {/* Hero Card Skeleton */}
      <Card
        sx={{
          p: 3,
          borderRadius: 4,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          opacity: 0.9,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Skeleton sx={{ height: 16, width: 100, bgcolor: 'rgba(255,255,255,0.3)' }} />
          <Skeleton variant="circular" sx={{ height: 24, width: 24, bgcolor: 'rgba(255,255,255,0.3)' }} />
        </Box>
        <Skeleton sx={{ height: 40, width: 180, bgcolor: 'rgba(255,255,255,0.3)' }} />
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 1.5,
            pt: 1.5,
            borderTop: '1px solid rgba(255,255,255,0.2)',
          }}
        >
          <Box sx={{ borderRadius: 2, p: 1.5, bgcolor: 'rgba(255,255,255,0.15)', display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Skeleton sx={{ height: 14, width: 70, bgcolor: 'rgba(255,255,255,0.3)' }} />
            <Skeleton sx={{ height: 20, width: 90, bgcolor: 'rgba(255,255,255,0.3)' }} />
          </Box>
          <Box sx={{ borderRadius: 2, p: 1.5, bgcolor: 'rgba(255,255,255,0.15)', display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Skeleton sx={{ height: 14, width: 70, bgcolor: 'rgba(255,255,255,0.3)' }} />
            <Skeleton sx={{ height: 20, width: 90, bgcolor: 'rgba(255,255,255,0.3)' }} />
          </Box>
        </Box>
      </Card>

      {/* Grid Cards Skeleton */}
      <Grid container spacing={2}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Grid key={i} size={{ xs: 6, sm: 6, md: 3 }}>
            <Card sx={{ p: 2, borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Skeleton sx={{ height: 14, width: 70 }} />
                <Skeleton variant="circular" sx={{ height: 20, width: 20 }} />
              </Box>
              <Skeleton sx={{ height: 28, width: 110 }} />
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

