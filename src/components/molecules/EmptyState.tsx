import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <Paper
      variant="outlined"
      className={className}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        borderRadius: 4,
        borderStyle: 'dashed',
        borderColor: 'divider',
        p: 4,
        textAlign: 'center',
        bgcolor: 'background.paper',
      }}
    >
      {icon && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 48,
            height: 48,
            borderRadius: 3,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            opacity: 0.9,
          }}
        >
          {icon}
        </Box>
      )}
      <Box sx={{ maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}>
          {description}
        </Typography>
      </Box>
      {action && (
        <Button
          variant="contained"
          size="small"
          onClick={action.onClick}
          sx={{
            mt: 0.5,
            borderRadius: 2.5,
            textTransform: 'none',
            fontWeight: 700,
            fontSize: '0.75rem',
            px: 2,
          }}
        >
          {action.label}
        </Button>
      )}
    </Paper>
  );
}

