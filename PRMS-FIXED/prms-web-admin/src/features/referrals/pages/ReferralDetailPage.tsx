import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import ChatBubbleOutlineOutlinedIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import { PageHeader, Button, ConfirmDialog } from '@/shared/components/ui';
import { ReferralStatusBadge, UrgencyBadge } from '../components/ReferralStatusBadge';
import { ReferralTimeline } from '../components/ReferralTimeline';
import { TransitionDialog } from '../components/TransitionDialog';
import { useReferralDetail, useReferralTimeline, useDeleteReferral } from '../hooks/useReferrals';
import { getAvailableTransitions, transitionLabel, isDangerousTransition } from '../utils/transitions';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { ROUTES } from '@/shared/constants/routes.constants';
import type { ReferralStatus } from '@/types/referral.types';

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box display="flex" justifyContent="space-between" py={1.25} borderBottom="1px solid" borderColor="divider">
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" fontWeight={600} textAlign="right">{value}</Typography>
    </Box>
  );
}

const ReferralDetailPage: React.FC = () => {
  const { referralId } = useParams<{ referralId: string }>();
  const id = Number(referralId);
  const navigate = useNavigate();
  const { user, isClinician } = usePermissions();
  const { data: referral, isLoading } = useReferralDetail(id);
  const { data: timeline, isLoading: timelineLoading } = useReferralTimeline(id);
  const deleteMutation = useDeleteReferral();
  const [transitionTarget, setTransitionTarget] = useState<ReferralStatus | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (isLoading || !referral) {
    return (
      <Box>
        <Skeleton variant="text" width={240} height={40} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={320} />
      </Box>
    );
  }

  const availableTransitions = user ? getAvailableTransitions(referral.status, user.role) : [];
  const canDelete = referral.status === 'Draft' && user?.role !== 'Receptionist';

  return (
    <>
      <PageHeader
        title={`Referral ${referral.referralCode}`}
        breadcrumbs={[{ label: 'Referrals', href: ROUTES.REFERRALS }, { label: referral.referralCode }]}
        actions={
          <Box display="flex" gap={1} alignItems="center">
            <UrgencyBadge urgency={referral.urgencyLevel} size="medium" />
            <ReferralStatusBadge status={referral.status} size="medium" />
          </Box>
        }
      />

      {referral.status === 'Rejected' && referral.rejectionReason && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <strong>Rejection reason:</strong> {referral.rejectionReason}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" mb={1}>Referral Details</Typography>
              <DetailRow label="Patient" value={referral.patient.displayName} />
              <DetailRow label="From" value={referral.sourceHospital.name} />
              <DetailRow label="To" value={referral.destinationHospital.name} />
              <DetailRow label="Reason for Referral" value={referral.reasonForReferral} />
              {referral.clinicalSummary && (
                <DetailRow label="Clinical Summary" value={referral.clinicalSummary} />
              )}
              {referral.createdByUser && (
                <DetailRow label="Created By" value={`${referral.createdByUser.fullName} (${referral.createdByUser.role})`} />
              )}
              <DetailRow label="Created" value={new Date(referral.createdAt).toLocaleString()} />

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle1" mb={1.5}>Timeline</Typography>
              <ReferralTimeline entries={timeline} loading={timelineLoading} />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography variant="subtitle1" mb={0.5}>Actions</Typography>
              {isClinician && (
                <Button
                  variant="outline"
                  fullWidth
                  startIcon={<ChatBubbleOutlineOutlinedIcon fontSize="small" />}
                  onClick={() => navigate(ROUTES.REFERRAL_CHAT(referral.id))}
                >
                  Open Chat
                </Button>
              )}
              {availableTransitions.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No actions available for this referral in its current state.
                </Typography>
              )}
              {availableTransitions.map((target) => (
                <Button
                  key={target}
                  variant={isDangerousTransition(target) ? 'danger' : 'primary'}
                  fullWidth
                  onClick={() => setTransitionTarget(target)}
                >
                  {transitionLabel(target)}
                </Button>
              ))}
              {canDelete && (
                <Button variant="outline" fullWidth onClick={() => setConfirmDelete(true)}>
                  Delete Draft
                </Button>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {transitionTarget && (
        <TransitionDialog
          open={!!transitionTarget}
          onClose={() => setTransitionTarget(null)}
          referralId={referral.id}
          target={transitionTarget}
        />
      )}

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => deleteMutation.mutate(referral.id)}
        title="Delete this draft referral?"
        body="This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </>
  );
};

export default ReferralDetailPage;
