import { Box, Button, Stack, Typography } from '@mui/material';

export default function EmptyState({
  icon = null,
  title,
  description,
  actionLabel = '',
  onAction = null,
  compact = false,
}) {
  return (
    <Box
      className={`empty-state-surface ${compact ? 'empty-state-surface--compact' : ''}`}
      role="status"
      aria-live="polite"
    >
      <Stack spacing={1.25} alignItems="center" textAlign="center" sx={{ maxWidth: 420, mx: 'auto' }}>
        {icon ? <Box className="empty-state-icon">{icon}</Box> : null}
        <Typography variant={compact ? 'subtitle1' : 'h6'} fontWeight={700}>
          {title}
        </Typography>
        {description ? (
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        ) : null}
        {actionLabel && onAction ? (
          <Button variant="outlined" size="small" onClick={onAction} sx={{ mt: 0.5 }}>
            {actionLabel}
          </Button>
        ) : null}
      </Stack>
    </Box>
  );
}
