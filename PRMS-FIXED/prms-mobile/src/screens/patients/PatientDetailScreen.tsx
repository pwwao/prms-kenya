/**
 * Patient Detail Screen
 * Per PRMS_API_Reference §3.3
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import Feather from 'react-native-vector-icons/Feather';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DashboardStackParamList } from '@navigation/types';
import Screen from '@components/common/Screen';
import { LoadingView, ErrorState } from '@components/common/States';
import Button from '@components/common/Button';
import { Colors, Typography, Spacing, Radius, Shadows, IconSize } from '@theme/tokens';
import { patientsApi } from '@api/services';
import { queryKeys } from '@api/queryClient';
import { formatDate } from '@utils/helpers';
import { useAuth } from '@hooks/useAuth';

type Props = NativeStackScreenProps<DashboardStackParamList, 'PatientDetail'>;

export default function PatientDetailScreen({ navigation, route }: Props) {
  const { patientId } = route.params;
  const { isClinician } = useAuth();

  const { data: patient, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.patients.detail(patientId),
    queryFn: async () => {
      const res = await patientsApi.getById(patientId);
      return res.data.data;
    },
  });

  if (isLoading) return <LoadingView message="Loading patient record..." />;
  if (error || !patient) {
    return (
      <ErrorState
        message="Could not load this patient's record."
        onRetry={refetch}
      />
    );
  }

  return (
    <Screen edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerCard}>
          <View style={styles.avatarCircleLarge}>
            <Text style={styles.avatarTextLarge}>{patient.fullName.charAt(0)}</Text>
          </View>
          <Text style={styles.patientName}>{patient.fullName}</Text>
          <Text style={styles.patientMeta}>
            {patient.gender} · {patient.age} years old
          </Text>
        </View>

        <View style={styles.detailsCard}>
          <DetailRow icon="hash" label="National ID" value={patient.nationalId} />
          <DetailRow icon="calendar" label="Date of Birth" value={patient.dateOfBirth ? formatDate(patient.dateOfBirth) : '—'} />
          <DetailRow icon="map-pin" label="County" value={patient.county} />
          {patient.phoneNumber && (
            <DetailRow icon="phone" label="Phone Number" value={patient.phoneNumber} />
          )}
        </View>

        {isClinician && (
          <Button
            title="Create Referral for this Patient"
            onPress={() => navigation.navigate('CreateReferral', { patientId: patient.id })}
            icon={<Feather name="send" size={IconSize.sm} color={Colors.white} />}
            style={styles.referralButton}
          />
        )}
      </ScrollView>
    </Screen>
  );
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIconCircle}>
        <Feather name={icon} size={IconSize.sm} color={Colors.gray500} />
      </View>
      <View>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.base, paddingBottom: Spacing['3xl'] },
  headerCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.base,
    ...Shadows.sm,
  },
  avatarCircleLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  avatarTextLarge: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },
  patientName: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
  },
  patientMeta: { fontSize: Typography.fontSize.base, color: Colors.textSecondary, marginTop: 2 },
  detailsCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    ...Shadows.sm,
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm },
  detailIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  detailLabel: { fontSize: Typography.fontSize.xs, color: Colors.textTertiary },
  detailValue: {
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.medium,
    marginTop: 1,
  },
  referralButton: { marginTop: Spacing.lg },
});
