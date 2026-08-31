import MuiSkeleton, { type SkeletonProps } from '@mui/material/Skeleton';

export function Skeleton({
  className = '',
  sx,
  variant = 'rounded',
  ...props
}: SkeletonProps) {
  return (
    <MuiSkeleton
      variant={variant}
      className={className}
      sx={{
        borderRadius: 2,
        ...sx,
      }}
      {...props}
    />
  );
}

