import React from 'react';
import { useNavigate } from 'react-router-dom';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import SwapHorizOutlinedIcon from '@mui/icons-material/SwapHorizOutlined';
import CallReceivedOutlinedIcon from '@mui/icons-material/CallReceivedOutlined';
import CallMadeOutlinedIcon from '@mui/icons-material/CallMadeOutlined';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import { PageHeader, KPICard, Button, EmptyState } from '@/shared/components/ui';
import { ReferralStatusBadge, UrgencyBadge } from '@/features/referrals/components/ReferralStatusBadge';
import { useReferralsList } from '@/features/referrals/hooks/useReferrals';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { ROUTES } from '@/shared/constants/routes.constants';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** Clinician / Receptionist landing page — web parity with mobile DashboardScreen. */
const StaffDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isClinician } = usePermissions();

  const incomingQuery = useReferralsList({
    hospitalRole: 'destination',
    status: 'Dispatched',
    limit: 1,
  });
  const outgoingQuery = useReferralsList({
    hospitalRole: 'source',
    status: 'Draft',
    limit: 1,
  });
  const urgentQuery = useReferralsList({
    urgencyLevel: 'Emergent',
    limit: 5,
    sortBy: 'created_at',
    sortDir: 'desc',
  });

  const urgentReferrals = urgentQuery.data?.data ?? [];

  return (
    <>
      <PageHeader
        title={`${getGreeting()}, ${user?.fullName ?? 'there'}`}
        subtitle={user?.hospitalName ?? undefined}
      />

      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} lg={4}>
          <KPICard
            title="Incoming Pending"
            value={incomingQuery.data?.meta.pagination?.total ?? '—'}
            accent="info"
            icon={<CallReceivedOutlinedIcon />}
            onClick={() => navigate(ROUTES.REFERRALS)}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={4}>
          <KPICard
            title="Outgoing Drafts"
            value={outgoingQuery.data?.meta.pagination?.total ?? '—'}
            accent="amber"
            icon={<CallMadeOutlinedIcon />}
            onClick={() => navigate(ROUTES.REFERRALS)}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={4}>
          <KPICard
            title="Urgent Cases"
            value={urgentReferrals.length}
            accent="teal"
            icon={<SwapHorizOutlinedIcon />}
            onClick={() => navigate(ROUTES.REFERRALS)}
          />
        </Grid>
      </Grid>

      <Box display="flex" gap={1.5} mb={3} flexWrap="wrap">
        {isClinician && (
          <Button variant="primary" startIcon={<SwapHorizOutlinedIcon />} onClick={() => navigate(ROUTES.REFERRAL_NEW)}>
            New Referral
          </Button>
        )}
        <Button variant="outline" startIcon={<PersonAddOutlinedIcon />} onClick={() => navigate(ROUTES.PATIENT_NEW)}>
          Register Patient
        </Button>
      </Box>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" mb={1.5}>Urgent &amp; Emergent Referrals</Typography>
          {urgentQuery.isLoading ? (
            <Skeleton variant="rounded" height={160} />
          ) : urgentReferrals.length === 0 ? (
            <EmptyState title="No urgent referrals" body="You're all caught up for now." />
          ) : (
            <Box display="flex" flexDirection="column" gap={1}>
              {urgentReferrals.map((referral) => (
                <Box
                  key={referral.id}
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  p={1.5}
                  border="1px solid"
                  borderColor="divider"
                  borderRadius={1.5}
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(ROUTES.REFERRAL_DETAIL(referral.id))}
                >
                  <Box>
                    <Typography variant="body2" fontWeight={600}>{referral.referralCode}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {referral.patient.displayName} · {referral.destinationHospital.name}
                    </Typography>
                  </Box>
                  <Box display="flex" gap={1}>
                    <UrgencyBadge urgency={referral.urgencyLevel} />
                    <ReferralStatusBadge status={referral.status} />
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default StaffDashboardPage;
