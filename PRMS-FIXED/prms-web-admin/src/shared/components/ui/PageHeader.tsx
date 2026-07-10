import React, { type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link';

interface Crumb { label: string; href?: string; }

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: Crumb[];
  actions?: ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, breadcrumbs, actions }) => (
  <Box mb={3}>
    {breadcrumbs && breadcrumbs.length > 0 && (
      <Breadcrumbs sx={{ mb: 1, fontSize: '0.8125rem' }} aria-label="breadcrumb">
        {breadcrumbs.map((crumb, i) =>
          crumb.href ? (
            <Link key={i} href={crumb.href} underline="hover" color="primary">
              {crumb.label}
            </Link>
          ) : (
            <Typography key={i} color="text.primary" fontSize="inherit">
              {crumb.label}
            </Typography>
          )
        )}
      </Breadcrumbs>
    )}
    <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={2} flexWrap="wrap">
      <Box>
        <Typography variant="h3">{title}</Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions && <Box display="flex" gap={1.5} alignItems="center" flexShrink={0}>{actions}</Box>}
    </Box>
  </Box>
);
