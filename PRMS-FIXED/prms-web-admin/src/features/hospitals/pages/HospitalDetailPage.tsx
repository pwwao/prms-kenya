import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Divider from '@mui/material/Divider';
import { PageHeader, StatusBadge, Button } from '@/shared/components/ui';
import { HospitalStatusDialog } from '../components/HospitalStatusDialog';
import { useHospitalDetail } from '../hooks/useHospitals';
import { ROUTES } from '@/shared/constants/routes.constants';
import type { HospitalStatus } from '@/types/hospital.types';

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box display="flex" justifyContent="space-between" py={1.25} borderBottom="1px solid" borderColor="divider">
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" fontWeight={600}>{value}</Typography>
    </Box>
  );
}

const HospitalDetailPage: React.FC = () => {
  const { hospitalId } = useParams<{ hospitalId: string }>();
  const { data: hospital, isLoading } = useHospitalDetail(Number(hospitalId));
  const [dialogTarget, setDialogTarget] = useState<HospitalStatus | null>(null);

  if (isLoading || !hospital) {
    return (
      <Box>
        <Skeleton variant="text" width={240} height={40} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={320} />
      </Box>
    );
  }

  const actionsByStatus: Record<string, { label: string; target: HospitalStatus; variant: 'primary' | 'danger' }[]> = {
    Pending:   [
      { label: '✅ Approve Hospital', target: 'Approved', variant: 'primary' },
      { label: '❌ Reject Application', target: 'Rejected', variant: 'danger' },
    ],
    Approved:  [{ label: 'Suspend Hospital', target: 'Suspended', variant: 'danger' }],
    Suspended: [{ label: 'Reinstate Hospital', target: 'Approved', variant: 'primary' }],
    Rejected:  [{ label: 'Return to Pending', target: 'Pending', variant: 'primary' }],
  };

  const actions = actionsByStatus[hospital.status] ?? [];

  return (
    <>
      <PageHeader
        title={hospital.name}
        breadcrumbs={[
          { label: 'Hospitals', href: ROUTES.HOSPITALS },
          { label: hospital.name },
        ]}
        actions={<StatusBadge status={hospital.status} size="medium" />}
      />

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" mb={1}>Registration Details</Typography>
              <DetailRow label="MoH Code" value={<span className="text-code">{hospital.mohCode}</span>} />
              <DetailRow label="Facility Level" value={hospital.facilityLevel} />
              <DetailRow label="County" value={hospital.county} />
              <DetailRow label="Sub-County" value={hospital.subCounty} />
              <DetailRow label="Submitted" value={new Date(hospital.createdAt).toLocaleDateString()} />

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle1" mb={1}>Facility Activity</Typography>
              <DetailRow label="Total Staff" value={hospital.totalStaff ?? '—'} />
              <DetailRow label="Referrals Received" value={hospital.totalReferralsIn ?? '—'} />
              <DetailRow label="Referrals Sent" value={hospital.totalReferralsOut ?? '—'} />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography variant="subtitle1" mb={0.5}>Actions</Typography>
              {actions.length === 0 && (
                <Typography variant="body2" color="text.secondary">No actions available.</Typography>
              )}
              {actions.map((action) => (
                <Button
                  key={action.target}
                  variant={action.variant}
                  fullWidth
                  onClick={() => setDialogTarget(action.target)}
                >
                  {action.label}
                </Button>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {dialogTarget && (
        <HospitalStatusDialog
          open={!!dialogTarget}
          onClose={() => setDialogTarget(null)}
          hospital={hospital}
          targetStatus={dialogTarget}
        />
      )}
    </>
  );
};

export default HospitalDetailPage;
