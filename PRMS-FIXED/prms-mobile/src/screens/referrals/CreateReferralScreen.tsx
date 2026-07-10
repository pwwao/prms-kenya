/**
 * Create Referral Screen
 * Per PRMS_API_Reference §4.1 — patientId, destinationHospitalId, urgencyLevel,
 * reasonForReferral (min 20 chars), clinicalSummary (min 50 chars).
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DashboardStackParamList } from '@navigation/types';
import Screen from '@components/common/Screen';
import TextField from '@components/common/TextField';
import SelectField from '@components/common/SelectField';
import Button from '@components/common/Button';
import { LoadingView } from '@components/common/States';
import { Colors, Typography, Spacing, Radius, Shadows } from '@theme/tokens';
import { URGENCY_LEVELS, APP_CONFIG } from '@constants/index';
import { useSelector } from 'react-redux';
import type { RootState } from '@store/index';
import { patientsApi, hospitalsApi, referralsApi } from '@api/services';
import { queryKeys } from '@api/queryClient';
import { generateLocalId, extractApiError, getUrgencyColor } from '@utils/helpers';
import { database, collections } from '@db/database';
import { enqueueOfflineMutation } from '@db/sync';
import Toast from 'react-native-toast-message';
import type { CreateReferralRequest, UrgencyLevel } from '@types/index';
import { useDebounce } from '@hooks/useDebounce';

type Props = NativeStackScreenProps<DashboardStackParamList, 'CreateReferral'>;

export default function CreateReferralScreen({ navigation, route }: Props) {
  const { patientId } = route.params;
  const isOnline = useSelector((s: RootState) => s.connectivity.isOnline);

  const [destinationHospitalId, setDestinationHospitalId] = useState<number | null>(null);
  const [destinationHospitalName, setDestinationHospitalName] = useState('');
  const [hospitalQuery, setHospitalQuery] = useState('');
  const debouncedHospitalQuery = useDebounce(hospitalQuery, 350);
  const [urgencyLevel, setUrgencyLevel] = useState<UrgencyLevel | null>(null);
  const [reasonForReferral, setReasonForReferral] = useState('');
  const [clinicalSummary, setClinicalSummary] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: patient } = useQuery({
    queryKey: queryKeys.patients.detail(patientId ?? 0),
    queryFn: async () => {
      const res = await patientsApi.getById(patientId!);
      return res.data.data;
    },
    enabled: !!patientId,
  });

  const { data: hospitals = [] } = useQuery({
    queryKey: queryKeys.hospitals.search(debouncedHospitalQuery || 'all'),
    queryFn: async () => {
      const res = await hospitalsApi.search({ q: debouncedHospitalQuery || undefined });
      return res.data.data ?? [];
    },
  });

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!destinationHospitalId) next.destinationHospital = 'Select a destination facility';
    if (!urgencyLevel) next.urgencyLevel = 'Urgency level is required';
    if (reasonForReferral.trim().length < APP_CONFIG.MIN_REFERRAL_REASON_LENGTH) {
      next.reasonForReferral = `Minimum ${APP_CONFIG.MIN_REFERRAL_REASON_LENGTH} characters required`;
    }
    if (clinicalSummary.trim().length < APP_CONFIG.MIN_CLINICAL_SUMMARY_LENGTH) {
      next.clinicalSummary = `Minimum ${APP_CONFIG.MIN_CLINICAL_SUMMARY_LENGTH} characters required`;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!patientId) {
      Toast.show({ type: 'error', text1: 'Select a patient first' });
      return;
    }
    if (!validate()) return;

    setIsSubmitting(true);

    const payload: CreateReferralRequest = {
      patientId,
      destinationHospitalId: destinationHospitalId!,
      urgencyLevel: urgencyLevel!,
      reasonForReferral: reasonForReferral.trim(),
      clinicalSummary: clinicalSummary.trim(),
    };

    try {
      if (isOnline) {
        const response = await referralsApi.create(payload);
        const referral = response.data.data;

        Toast.show({ type: 'success', text1: 'Referral created as Draft' });
        navigation.getParent()?.navigate('ReferralsTab', {
          screen: 'ReferralDetail',
          params: { referralId: referral.id },
        });
      } else {
        const localId = generateLocalId();
        await database.write(async () => {
          await collections.referrals.create((r) => {
            r.status = 'Draft';
            r.urgencyLevel = payload.urgencyLevel;
            r.direction = 'outgoing';
            r.reasonForReferral = payload.reasonForReferral;
            r.clinicalSummary = payload.clinicalSummary;
            r.patientIdServer = payload.patientId;
            r.patientDisplayName = patient?.fullName ?? '';
            r.destHospitalId = payload.destinationHospitalId;
            r.destHospitalName = destinationHospitalName;
            r.updatedAtLocal = Date.now();
            r.syncStatus = 'pending';
          });
        });
        await enqueueOfflineMutation('referral', 'create', localId, payload);

        Toast.show({
          type: 'success',
          text1: 'Saved Offline',
          text2: 'Referral will be created when you reconnect',
        });
        navigation.popToTop();
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Could Not Create Referral', text2: extractApiError(err) });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {!isOnline && (
          <View style={styles.offlineNotice}>
            <Text style={styles.offlineNoticeText}>
              You're offline. This referral will be saved as a draft and created when you reconnect.
            </Text>
          </View>
        )}

        {patient && (
          <View style={styles.patientCard}>
            <Text style={styles.patientCardLabel}>Patient</Text>
            <Text style={styles.patientCardName}>{patient.fullName}</Text>
            <Text style={styles.patientCardMeta}>
              {patient.gender} · {patient.age} yrs · {patient.county}
            </Text>
          </View>
        )}

        <SelectField
          label="Destination Facility"
          required
          placeholder="Search for a hospital"
          value={destinationHospitalId ? String(destinationHospitalId) : null}
          options={(hospitals ?? []).map((h) => ({
            label: `${h.name} (${h.facilityLevel})`,
            value: String(h.id),
          }))}
          onSelect={(v) => {
            const hospital = hospitals?.find((h) => String(h.id) === v);
            setDestinationHospitalId(Number(v));
            setDestinationHospitalName(hospital?.name ?? '');
          }}
          error={errors.destinationHospital}
          searchable
        />

        <SelectField
          label="Urgency Level"
          required
          placeholder="Select urgency"
          value={urgencyLevel}
          options={URGENCY_LEVELS.map((u) => ({ label: u, value: u }))}
          onSelect={(v) => setUrgencyLevel(v as UrgencyLevel)}
          error={errors.urgencyLevel}
        />

        {urgencyLevel === 'Emergent' && (
          <View style={[styles.urgencyWarning, { borderColor: getUrgencyColor('Emergent') }]}>
            <Text style={[styles.urgencyWarningText, { color: getUrgencyColor('Emergent') }]}>
              Emergent referrals trigger immediate notification to the receiving facility.
            </Text>
          </View>
        )}

        <TextField
          label="Reason for Referral"
          required
          placeholder="Brief reason for this referral..."
          value={reasonForReferral}
          onChangeText={(t) => {
            setReasonForReferral(t);
            setErrors((e) => ({ ...e, reasonForReferral: undefined as never }));
          }}
          error={errors.reasonForReferral}
          hint={`${reasonForReferral.length}/${APP_CONFIG.MIN_REFERRAL_REASON_LENGTH} min characters`}
          multiline
          numberOfLines={3}
          style={styles.textArea}
        />

        <TextField
          label="Clinical Summary"
          required
          placeholder="Patient history, vitals, findings, treatment given..."
          value={clinicalSummary}
          onChangeText={(t) => {
            setClinicalSummary(t);
            setErrors((e) => ({ ...e, clinicalSummary: undefined as never }));
          }}
          error={errors.clinicalSummary}
          hint={`${clinicalSummary.length}/${APP_CONFIG.MIN_CLINICAL_SUMMARY_LENGTH} min characters`}
          multiline
          numberOfLines={6}
          style={[styles.textArea, styles.textAreaLarge]}
        />

        <Button
          title="Create Referral (Draft)"
          onPress={handleSubmit}
          loading={isSubmitting}
          style={styles.submitButton}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.base, paddingBottom: Spacing['3xl'] },
  offlineNotice: {
    backgroundColor: Colors.warningLight,
    borderRadius: 8,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  offlineNoticeText: { fontSize: Typography.fontSize.sm, color: Colors.warning, lineHeight: 20 },
  patientCard: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.lg,
  },
  patientCardLabel: { fontSize: Typography.fontSize.xs, color: Colors.primary, fontWeight: '600' },
  patientCardName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  patientCardMeta: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  urgencyWarning: {
    borderWidth: 1.5,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.base,
  },
  urgencyWarningText: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium },
  textArea: { textAlignVertical: 'top', minHeight: 80 },
  textAreaLarge: { minHeight: 140 },
  submitButton: { marginTop: Spacing.md },
});
