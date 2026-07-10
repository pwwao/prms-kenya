import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import Menu from '@mui/material/Menu';
import AddIcon from '@mui/icons-material/Add';
import { PageHeader, DataTable, PaginationBar, StatusBadge, Button, type Column } from '@/shared/components/ui';
import { StaffStatusDialog } from '../components/StaffStatusDialog';
import { useStaffList } from '../hooks/useUsers';
import { usePagination } from '@/shared/hooks/usePagination';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { ROUTES } from '@/shared/constants/routes.constants';
import type { StaffMember } from '@/types/user.types';
import type { UserRole, UserStatus } from '@/types/auth.types';

const StaffListPage: React.FC = () => {
  const navigate = useNavigate();
  const { page, limit, setPage, onLimitChange } = usePagination(20);
  const [role, setRole] = useState<'' | 'Clinician' | 'Receptionist'>('');
  const [status, setStatus] = useState<UserStatus | ''>('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [menuStaff, setMenuStaff] = useState<StaffMember | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [statusDialogStaff, setStatusDialogStaff] = useState<StaffMember | null>(null);

  const { data, isLoading } = useStaffList({
    page, limit,
    role: role || undefined,
    status: status || undefined,
    q: debouncedSearch || undefined,
  });

  const columns: Column<StaffMember>[] = [
    { key: 'fullName', label: 'Name' },
    { key: 'username', label: 'Username' },
    { key: 'role', label: 'Role' },
    { key: 'phoneNumber', label: 'Phone' },
    {
      key: 'status', label: 'Status',
      render: (v) => <StatusBadge status={v as UserStatus} />,
    },
    {
      key: 'lastLoginAt', label: 'Last Login',
      render: (v) => (v ? new Date(v as string).toLocaleDateString() : '—'),
    },
    {
      key: 'actions', label: '', align: 'right',
      render: (_v, row) => (
        <IconButton
          size="small"
          onClick={(e) => { e.stopPropagation(); setMenuStaff(row); setMenuAnchor(e.currentTarget); }}
          aria-label={`Actions for ${row.fullName}`}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Staff"
        subtitle="Manage Clinician and Receptionist accounts for your facility"
        actions={
          <Button variant="primary" startIcon={<AddIcon />} onClick={() => navigate(ROUTES.USER_NEW)}>
            Add Staff Member
          </Button>
        }
      />

      <Box display="flex" gap={1.5} flexWrap="wrap" mb={2}>
        <TextField
          size="small" placeholder="Search by name or username…"
          value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          sx={{ minWidth: 260 }}
        />
        <TextField
          size="small" select label="Role" value={role}
          onChange={(e) => { setRole(e.target.value as UserRole as any); setPage(1); }}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All roles</MenuItem>
          <MenuItem value="Clinician">Clinician</MenuItem>
          <MenuItem value="Receptionist">Receptionist</MenuItem>
        </TextField>
        <TextField
          size="small" select label="Status" value={status}
          onChange={(e) => { setStatus(e.target.value as UserStatus | ''); setPage(1); }}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All statuses</MenuItem>
          <MenuItem value="Active">Active</MenuItem>
          <MenuItem value="Suspended">Suspended</MenuItem>
        </TextField>
      </Box>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        loading={isLoading}
        emptyTitle="No staff members added yet"
        emptyBody="Add your first Clinician or Receptionist account to get started."
      />

      {data?.meta.pagination && (
        <PaginationBar meta={data.meta.pagination} onPageChange={setPage} onLimitChange={onLimitChange} />
      )}

      <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={() => { navigate(ROUTES.USER_EDIT(menuStaff!.id)); setMenuAnchor(null); }}>
          Edit Profile
        </MenuItem>
        <MenuItem onClick={() => { setStatusDialogStaff(menuStaff); setMenuAnchor(null); }}>
          {menuStaff?.status === 'Suspended' ? 'Reactivate Account' : 'Suspend Account'}
        </MenuItem>
      </Menu>

      {statusDialogStaff && (
        <StaffStatusDialog
          open={!!statusDialogStaff}
          onClose={() => setStatusDialogStaff(null)}
          staff={statusDialogStaff}
        />
      )}
    </>
  );
};

export default StaffListPage;
