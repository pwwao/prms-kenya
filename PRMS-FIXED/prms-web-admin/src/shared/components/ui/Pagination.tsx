import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import MuiPagination from '@mui/material/Pagination';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import type { Pagination as PaginationMeta } from '@/types/api.types';

interface PaginationBarProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

export const PaginationBar: React.FC<PaginationBarProps> = ({ meta, onPageChange, onLimitChange }) => {
  const { page, limit, total, totalPages } = meta;
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      px={2}
      py={1.5}
      flexWrap="wrap"
      gap={2}
    >
      <Typography variant="body2" color="text.secondary">
        {total === 0 ? 'No records' : `${start}–${end} of ${total.toLocaleString()}`}
      </Typography>

      <MuiPagination
        page={page}
        count={Math.max(totalPages, 1)}
        onChange={(_, value) => onPageChange(value)}
        color="primary"
        shape="rounded"
        size="small"
      />

      <Box display="flex" alignItems="center" gap={1}>
        <Typography variant="body2" color="text.secondary">Rows per page</Typography>
        <Select
          size="small"
          value={limit}
          onChange={(e) => onLimitChange(Number(e.target.value))}
          sx={{ minWidth: 70 }}
        >
          {[10, 20, 50, 100].map((n) => (
            <MenuItem key={n} value={n}>{n}</MenuItem>
          ))}
        </Select>
      </Box>
    </Box>
  );
};
