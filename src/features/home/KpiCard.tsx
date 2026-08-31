import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import type { ReactNode } from 'react';
import type { KpiIconHint } from '../../domain/types';

export type KpiTone =
  | 'default'
  | 'success'
  | 'destructive'
  | 'teal'
  | 'violet'
  | 'hero';

interface KpiCardProps {
  label: string;
  value?: string;
  subtext?: ReactNode;
  tone?: KpiTone;
  iconHint?: KpiIconHint;
  interactive?: boolean;
  children?: ReactNode;
  className?: string;
  onClick?: () => void;
}

function HintIcon({
  hint,
  hero,
}: {
  hint: KpiIconHint;
  hero: boolean;
}) {
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 24,
        height: 24,
        borderRadius: '50%',
        bgcolor: hero ? 'rgba(255,255,255,0.2)' : 'action.selected',
        color: hero ? 'inherit' : 'text.secondary',
      }}
    >
      {hint === 'list' ? (
        <FormatListBulletedIcon sx={{ fontSize: 14 }} />
      ) : (
        <ShowChartIcon sx={{ fontSize: 14 }} />
      )}
    </Box>
  );
}

export function KpiCard({
  label,
  value,
  subtext,
  tone = 'default',
  iconHint,
  interactive = false,
  children,
  className = '',
  onClick,
}: KpiCardProps) {
  const isHero = tone === 'hero';

  const toneColor =
    tone === 'success'
      ? 'success.main'
      : tone === 'destructive'
      ? 'error.main'
      : tone === 'teal' || tone === 'violet'
      ? 'primary.main'
      : 'text.primary';

  const cardContent = (
    <CardContent sx={{ p: isHero ? 2.5 : 2, '&:last-child': { pb: isHero ? 2.5 : 2 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: 1.1,
            color: isHero ? 'inherit' : 'text.secondary',
            opacity: isHero ? 0.9 : 1,
          }}
        >
          {label}
        </Typography>
        {interactive && iconHint && <HintIcon hint={iconHint} hero={isHero} />}
      </Box>

      {value !== undefined && (
        <Typography
          variant={isHero ? 'h4' : 'h5'}
          sx={{
            mt: 1,
            fontWeight: 800,
            fontFeatureSettings: '"tnum"',
            fontVariantNumeric: 'tabular-nums',
            color: isHero ? 'inherit' : toneColor,
          }}
        >
          {value}
        </Typography>
      )}

      {subtext !== undefined && (
        <Box
          sx={{
            mt: 0.5,
            fontSize: '0.8125rem',
            fontWeight: 600,
            fontFeatureSettings: '"tnum"',
            fontVariantNumeric: 'tabular-nums',
            color: isHero ? 'inherit' : 'text.secondary',
            opacity: isHero ? 0.85 : 1,
          }}
        >
          {subtext}
        </Box>
      )}

      {children}
    </CardContent>
  );

  const cardStyle = {
    borderRadius: isHero ? 4 : 3,
    border: '1px solid',
    borderColor: isHero ? 'primary.main' : 'divider',
    bgcolor: isHero ? 'primary.main' : 'background.paper',
    color: isHero ? 'primary.contrastText' : 'text.primary',
    boxShadow: isHero ? 4 : 1,
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    '&:hover': interactive ? { transform: 'translateY(-2px)', boxShadow: isHero ? 6 : 3 } : undefined,
  };

  if (interactive) {
    return (
      <Card sx={cardStyle} className={className}>
        <CardActionArea onClick={onClick} sx={{ height: '100%' }}>
          {cardContent}
        </CardActionArea>
      </Card>
    );
  }

  return (
    <Card sx={cardStyle} className={className}>
      {cardContent}
    </Card>
  );
}

