import Button, { type ButtonProps } from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import type { ReactNode } from 'react';

export interface SoftButtonProps extends Omit<ButtonProps, 'children'> {
  children?: ReactNode;
  glow?: boolean;
  loading?: boolean;
}

/** Material UI button with ripple, loading spinner, and theme styling. */
export function SoftButton({
  children,
  className = '',
  loading = false,
  disabled,
  variant = 'text',
  color = 'primary',
  sx,
  ...props
}: SoftButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Button
      disabled={isDisabled}
      variant={variant}
      color={color}
      className={className}
      sx={{
        textTransform: 'none',
        borderRadius: 2.5,
        fontWeight: 600,
        ...sx,
      }}
      {...props}
    >
      {loading ? (
        <CircularProgress size={18} color="inherit" sx={{ mr: children ? 1 : 0 }} />
      ) : null}
      {children}
    </Button>
  );
}


