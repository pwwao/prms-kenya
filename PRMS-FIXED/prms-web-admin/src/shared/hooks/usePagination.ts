import { useState, useCallback } from 'react';

export interface PaginationState {
  page: number;
  limit: number;
}

export function usePagination(initialLimit = 20) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(initialLimit);

  const onLimitChange = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1); // Reset to first page when page size changes
  }, []);

  const reset = useCallback(() => setPage(1), []);

  return { page, limit, setPage, onLimitChange, reset };
}
