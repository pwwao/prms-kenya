/**
 * Referral Detail Screen
 * Per PRMS_API_Reference §4.3, §4.4 — full detail + status transitions.
 * Per PRMS_UserRoles_UserFlows_UITeam.md §5 / Appendix C — role×status actions.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Feather from 'react-native-vector-icons/Feather';
import Modal from 'react-native-modal';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ReferralStackParamList } from '@navigation/types';
import Screen from '@components/common/Screen';
import { LoadingView, ErrorState } from '@components/common/States';
import { StatusBadge, UrgencyBadge } from '@components/common/Badge';
import Button from '@components/common/Button';
import TextField from '@components/common/TextField';
import { Colors, Typography, Spacing, Radius, Shadows, IconSize } from '@theme/tokens';
import { referralsApi } from '@api/services';
import { queryKeys } from '@api/queryClient';
import { formatDateTime, extractApiError, getUrgencyColor } from '@utils/helpers';
import { useAuth } from '@hooks/useAuth';
import { APP_CONFIG } from '@constants/index';
import { chatSocket } from '@api/socket';
import Toast from 'react-native-toast-message';
import type { ReferralStatus } from '@types/index';

type Props = NativeStackScreenProps<ReferralStackParamList, 'ReferralDetail'>;

export default function ReferralDetailScreen({ navigation, route }: Props) {
  const { referralId } = route.params;
  const { permissions } = useAuth();
  const queryClient = useQueryClient();

  const [activeModal, setActiveModal] = useState<'accept' | 'reject' | 'complete' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');

  const { data: referral, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.referrals.detail(referralId),
    queryFn: async () => {
      const res = await referralsApi.getById(referralId);
      return res.data.data;
    },
  });

  // Listen for real-time status changes
  useEffect(() => {
    const unsubscribe = chatSocket.onReferralStatusChanged((data) => {
      if (data.referralId === referralId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.referrals.detail(referralId) });
      }
    });
    return unsubscribe;
  }, [referralId, queryClient]);

  const statusMutation = useMutation({
    mutationFn: (params: { status: ReferralStatus; notes?: string; rejectionReason?: string }) =>
      referralsApi.updateStatus(referralId, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.referrals.detail(referralId) });
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
      setActiveModal(null);
      setRejectionReason('');
      setCompletionNotes('');
    },
    onError: (err) => {
      Toast.show({ type: 'error', text1: 'Action Failed', text2: extractApiError(err) });
    },
  });

  if (isLoading) return <LoadingView message="Loading referral..." />;
  if (error || !referral) {
    return <ErrorState message="Could not load this referral." onRetry={refetch} />;
  }

  const patientName =
    'displayName' in referral.patient
      ? referral.patient.displayName
      : 'fullName' in referral.patient
      ? referral.patient.fullName
      : 'Unknown';

  const handleDispatch = () => {
    statusMutation.mutate({ status: 'Dispatched' });
  };

  const handleMarkReceived = () => {
    statusMutation.mutate({ status: 'Received' });
  };

  const handleAccept = () => {
    statusMutation.mutate({ status: 'Accepted' });
    setActiveModal(null);
  };

  const handleReject = () => {
    if (rejectionReason.trim().length < APP_CONFIG.MIN_REJECTION_REASON_LENGTH) {
      Toast.show({
        type: 'error',
        text1: `Reason must be at least ${APP_CONFIG.MIN_REJECTION_REASON_LENGTH} characters`,
      });
      return;
    }
    statusMutation.mutate({ status: 'Rejected', rejectionReason: rejectionReason.trim() });
  };

  const handleComplete = () => {
    statusMutation.mutate({ status: 'Completed', notes: completionNotes.trim() || undefined });
  };

  return (
    <Screen edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.headerCard}>
          <View style={styles.headerTopRow}>
            <Text style={styles.referralCode}>{referral.referralCode}</Text>
            <StatusBadge status={referral.status} />
          </View>
          <UrgencyBadge urgency={referral.urgencyLevel} />
        </View>

        {/* Patient */}
        <Section title="Patient">
          <Text style={styles.patientName}>{patientName}</Text>
          {'age' in referral.patient && (
            <Text style={styles.subtext}>
              {referral.patient.gender} · {referral.patient.age} years
            </Text>
          )}
        </Section>

        {/* Facilities */}
        <Section title="Referral Route">
          <View style={styles.routeRow}>
            <View style={styles.routeNode}>
              <Feather name="map-pin" size={IconSize.sm} color={Colors.gray500} />
              <Text style={styles.routeLabel}>From</Text>
              <Text style={styles.routeValue}>{referral.sourceHospital.name}</Text>
            </View>
            <Feather name="arrow-right" size={IconSize.md} color={Colors.gray400} />
            <View style={styles.routeNode}>
              <Feather name="map-pin" size={IconSize.sm} color={Colors.primary} />
              <Text style={styles.routeLabel}>To</Text>
              <Text style={styles.routeValue}>{referral.destinationHospital.name}</Text>
            </View>
          </View>
        </Section>

        {/* Clinical Info */}
        {referral.reasonForReferral && (
          <Section title="Reason for Referral">
            <Text style={styles.bodyText}>{referral.reasonForReferral}</Text>
          </Section>
        )}

        {referral.clinicalSummary && (
          <Section title="Clinical Summary">
            <Text style={styles.bodyText}>{referral.clinicalSummary}</Text>
          </Section>
        )}

        {referral.status === 'Rejected' && referral.rejectionReason && (
          <Section title="Rejection Reason" tint="error">
            <Text style={[styles.bodyText, { color: Colors.error }]}>
              {referral.rejectionReason}
            </Text>
          </Section>
        )}

        {/* Metadata */}
        <Section title="Details">
          <DetailLine label="Created by" value={referral.createdByUser?.fullName ?? '—'} />
          <DetailLine label="Created" value={formatDateTime(referral.createdAt)} />
          <DetailLine label="Last updated" value={formatDateTime(referral.updatedAt)} />
        </Section>

        {/* Action Links */}
        <View style={styles.linksRow}>
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('ReferralTimeline', { referralId })}
          >
            <Feather name="clock" size={IconSize.sm} color={Colors.primary} />
            <Text style={styles.linkButtonText}>View Timeline</Text>
          </TouchableOpacity>

          {permissions.canChat && (
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() =>
                navigation.navigate('Chat', {
                  referralId,
                  referralCode: referral.referralCode,
                })
              }
            >
              <Feather name="message-circle" size={IconSize.sm} color={Colors.primary} />
              <Text style={styles.linkButtonText}>Open Chat</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Status Action Bar */}
      <View style={styles.actionBar}>
        {permissions.canDispatch(referral.status) && (
          <Button
            title="Dispatch Referral"
            onPress={handleDispatch}
            loading={statusMutation.isPending}
          />
        )}

        {permissions.canMarkReceived(referral.status) && (
          <Button
            title="Mark as Received"
            onPress={handleMarkReceived}
            loading={statusMutation.isPending}
          />
        )}

        {permissions.canAcceptOrReject(referral.status) && (
          <View style={styles.actionRow}>
            <Button
              title="Reject"
              variant="outline"
              onPress={() => setActiveModal('reject')}
              style={styles.actionRowButton}
            />
            <Button
              title="Accept"
              onPress={() => setActiveModal('accept')}
              style={styles.actionRowButton}
            />
          </View>
        )}

        {permissions.canMarkComplete(referral.status) && (
          <Button
            title="Mark as Completed"
            variant="secondary"
            onPress={() => setActiveModal('complete')}
            loading={statusMutation.isPending}
          />
        )}

        {permissions.canRedispatch(referral.status) && (
          <Button
            title="Edit & Re-dispatch"
            onPress={() => Toast.show({ type: 'info', text1: 'Edit flow coming soon' })}
          />
        )}
      </View>

      {/* Accept Confirmation Modal */}
      <ConfirmModal
        visible={activeModal === 'accept'}
        title="Accept Referral"
        message={`Confirm acceptance of ${referral.referralCode}? The originating facility will be notified.`}
        confirmLabel="Confirm Accept"
        confirmVariant="primary"
        onConfirm={handleAccept}
        onCancel={() => setActiveModal(null)}
        loading={statusMutation.isPending}
      />

      {/* Reject Modal */}
      <Modal
        isVisible={activeModal === 'reject'}
        onBackdropPress={() => setActiveModal(null)}
        style={styles.modal}
      >
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>Reject Referral</Text>
          <Text style={styles.modalSubtitle}>
            Provide a reason — this will be shared with the originating clinician.
          </Text>
          <TextField
            placeholder="e.g. No available ICU beds at this time"
            value={rejectionReason}
            onChangeText={setRejectionReason}
            multiline
            numberOfLines={4}
            style={styles.modalTextArea}
            hint={`${rejectionReason.length}/${APP_CONFIG.MIN_REJECTION_REASON_LENGTH} min characters`}
          />
          <View style={styles.modalActions}>
            <Button title="Cancel" variant="outline" onPress={() => setActiveModal(null)} style={styles.modalActionButton} />
            <Button
              title="Confirm Reject"
              variant="danger"
              onPress={handleReject}
              loading={statusMutation.isPending}
              style={styles.modalActionButton}
            />
          </View>
        </View>
      </Modal>

      {/* Complete Modal */}
      <Modal
        isVisible={activeModal === 'complete'}
        onBackdropPress={() => setActiveModal(null)}
        style={styles.modal}
      >
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>Mark as Completed</Text>
          <Text style={styles.modalSubtitle}>
            Add any final notes for this referral (optional).
          </Text>
          <TextField
            placeholder="Final outcome notes..."
            value={completionNotes}
            onChangeText={setCompletionNotes}
            multiline
            numberOfLines={3}
            style={styles.modalTextArea}
          />
          <View style={styles.modalActions}>
            <Button title="Cancel" variant="outline" onPress={() => setActiveModal(null)} style={styles.modalActionButton} />
            <Button
              title="Confirm Complete"
              variant="secondary"
              onPress={handleComplete}
              loading={statusMutation.isPending}
              style={styles.modalActionButton}
            />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({
  title,
  children,
  tint,
}: {
  title: string;
  children: React.ReactNode;
  tint?: 'error';
}) {
  return (
    <View style={[styles.section, tint === 'error' && styles.sectionError]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailLine}>
      <Text style={styles.detailLineLabel}>{label}</Text>
      <Text style={styles.detailLineValue}>{value}</Text>
    </View>
  );
}

function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel,
  confirmVariant,
  onConfirm,
  onCancel,
  loading,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmVariant: 'primary' | 'danger' | 'secondary';
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <Modal isVisible={visible} onBackdropPress={onCancel} style={styles.modal}>
      <View style={styles.modalSheet}>
        <Text style={styles.modalTitle}>{title}</Text>
        <Text style={styles.modalSubtitle}>{message}</Text>
        <View style={styles.modalActions}>
          <Button title="Cancel" variant="outline" onPress={onCancel} style={styles.modalActionButton} />
          <Button
            title={confirmLabel}
            variant={confirmVariant}
            onPress={onConfirm}
            loading={loading}
            style={styles.modalActionButton}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.base, paddingBottom: Spacing['4xl'] },
  headerCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    ...Shadows.sm,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  referralCode: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
  },
  section: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  sectionError: { backgroundColor: Colors.errorLight },
  sectionTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.textTertiary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  patientName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.textPrimary,
  },
  subtext: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  routeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  routeNode: { flex: 1, alignItems: 'flex-start' },
  routeLabel: { fontSize: Typography.fontSize.xs, color: Colors.textTertiary, marginTop: Spacing.xs },
  routeValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  bodyText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    lineHeight: Typography.fontSize.base * Typography.lineHeight.relaxed,
  },
  detailLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  detailLineLabel: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary },
  detailLineValue: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.medium,
  },
  linksRow: { flexDirection: 'row', gap: Spacing.md },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
  },
  linkButtonText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.medium,
    marginLeft: Spacing.xs,
  },
  actionBar: {
    padding: Spacing.base,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  actionRow: { flexDirection: 'row', gap: Spacing.md },
  actionRowButton: { flex: 1 },
  modal: { justifyContent: 'flex-end', margin: 0 },
  modalSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
  },
  modalTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  modalSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  modalTextArea: { textAlignVertical: 'top', minHeight: 90 },
  modalActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  modalActionButton: { flex: 1 },
});
