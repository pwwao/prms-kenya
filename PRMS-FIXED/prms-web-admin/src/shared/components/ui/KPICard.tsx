import React, { type ReactNode } from 'react';
import Card from '@mui/material/Card';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

interface TrendInfo { value: number; label: string; positive: boolean; }

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: TrendInfo;
  icon?: ReactNode;
  accent?: 'teal' | 'amber' | 'success' | 'danger' | 'info';
  onClick?: () => void;
}

const accentColorMap: Record<string, string> = {
  teal: '#0B6B5D', amber: '#C97A15', success: '#16834B', danger: '#B91C1C', info: '#1E56A0',
};

/** Dashboard KPI tile — see PRMS_Design_System_Complete.md §5.4 and §8 */
export const KPICard: React.FC<KPICardProps> = ({
  title, value, subtitle, trend, icon, accent = 'teal', onClick,
}) => {
  const accentColor = accentColorMap[accent];

  return (
    <Card
      onClick={onClick}
      variant="outlined"
      sx={{
        p: 2.5,
        borderTop: `3px solid ${accentColor}`,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 200ms ease, transform 200ms ease',
        '&:hover': onClick ? { boxShadow: 3, transform: 'translateY(-1px)' } : {},
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
        <Typography variant="overline">{title}</Typography>
        {icon && <Box sx={{ color: accentColor, opacity: 0.85 }}>{icon}</Box>}
      </Box>
      <Typography variant="h2" sx={{ fontSize: '2rem', lineHeight: 1.1 }}>{value}</Typography>
      {subtitle && (
        <Typography variant="body2" color="text.secondary" mt={0.5}>{subtitle}</Typography>
      )}
      {trend && (
        <Box display="flex" alignItems="center" gap={0.5} mt={1.5} fontSize="0.75rem">
          <Typography
            component="span"
            fontWeight={600}
            fontSize="inherit"
            color={trend.positive ? 'success.main' : 'error.main'}
          >
            {trend.positive ? '▲' : '▼'} {Math.abs(trend.value)}%
          </Typography>
          <Typography component="span" fontSize="inherit" color="text.secondary">
            {trend.label}
          </Typography>
        </Box>
      )}
    </Card>
  );
};
