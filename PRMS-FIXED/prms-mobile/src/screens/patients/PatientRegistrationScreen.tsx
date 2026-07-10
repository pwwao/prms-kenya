/**
 * Patient Registration Screen
 * Per PRMS_API_Reference §3.1 and PRMS_UserRoles_UserFlows_UITeam.md §6.
 * Works offline — queues to WatermelonDB sync_queue when no connection.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSelector } from 'react-redux';
import type { RootState } from '@store/index';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DashboardStackParamList } from '@navigation/types';
import Screen from '@components/common/Screen';
import TextField from '@components/common/TextField';
import SelectField from '@components/common/SelectField';
import Button from '@components/common/Button';
import { Colors, Typography, Spacing } from '@theme/tokens';
import { KENYA_COUNTIES, ID_TYPES } from '@constants/index';
import { isValidNationalId, isValidKenyanPhone, generateLocalId, extractApiError } from '@utils/helpers';
import { patientsApi } from '@api/services';
import { collections, database } from '@db/database';
import { enqueueOfflineMutation } from '@db/sync';
import Toast from 'react-native-toast-message';
import type { Gender, IdType, CreatePatientRequest } from '@types/index';

type Props = NativeStackScreenProps<DashboardStackParamList, 'PatientRegistration'>;

interface FormState {
  idType: IdType | null;
  nationalId: string;
  fullName: string;
  gender: Gender | null;
  dateOfBirth: string; // YYYY-MM-DD
  county: string | null;
  phoneNumber: string;
}

const initialForm: FormState = {
  idType: null,
  nationalId: '',
  fullName: '',
  gender: null,
  dateOfBirth: '',
  county: null,
  phoneNumber: '',
};

export default function PatientRegistrationScreen({ navigation }: Props) {
  const isOnline = useSelector((s: RootState) => s.connectivity.isOnline);
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {};

    if (form.nationalId.trim() && !form.idType) next.idType = 'Select an ID type for the ID number entered';
    if (form.nationalId.trim() && form.idType === 'National ID' && !isValidNationalId(form.nationalId)) {
      next.nationalId = 'Must be 7-8 digits';
    }
    if (!form.fullName.trim() || form.fullName.trim().split(' ').length < 2) {
      next.fullName = 'Enter full name (first and last)';
    }
    if (!form.gender) next.gender = 'Gender is required';
    if (!form.dateOfBirth) {
      next.dateOfBirth = 'Date of birth is required';
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(form.dateOfBirth)) {
      next.dateOfBirth = 'Use format YYYY-MM-DD';
    }
    if (!form.county) next.county = 'County is required';
    if (form.phoneNumber && !isValidKenyanPhone(form.phoneNumber)) {
      next.phoneNumber = 'Use format +254XXXXXXXXX';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);

    const payload: CreatePatientRequest = {
      idType: form.idType ?? undefined,
      nationalId: form.nationalId.trim() || undefined,
      fullName: form.fullName.trim(),
      gender: form.gender!,
      dateOfBirth: form.dateOfBirth,
      county: form.county!,
      phoneNumber: form.phoneNumber.trim() || undefined,
    };

    try {
      if (isOnline) {
        const response = await patientsApi.create(payload);
        const newPatient = response.data.data;

        Toast.show({ type: 'success', text1: 'Patient registered successfully' });
        navigation.replace('PatientDetail', { patientId: newPatient.id });
      } else {
        // Offline: write locally and queue for sync
        const localId = generateLocalId();
        await database.write(async () => {
          await collections.patients.create((p) => {
            p.fullName = payload.fullName;
            p.nationalId = payload.nationalId ?? '';
            p.idType = payload.idType ?? null;
            p.gender = payload.gender;
            p.dateOfBirth = payload.dateOfBirth;
            p.county = payload.county;
            p.phoneNumber = payload.phoneNumber ?? '';
            p.updatedAtLocal = Date.now();
            p.syncStatus = 'pending';
          });
        });
        await enqueueOfflineMutation('patient', 'create', localId, payload);

        Toast.show({
          type: 'success',
          text1: 'Saved Offline',
          text2: 'Patient will sync when you reconnect',
        });
        navigation.goBack();
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Registration Failed', text2: extractApiError(err) });
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
              You're offline. This patient will be saved locally and synced automatically.
            </Text>
          </View>
        )}

        <SelectField
          label="ID Type"
          placeholder="Select ID type"
          value={form.idType}
          options={ID_TYPES.map((t) => ({ label: t, value: t }))}
          onSelect={(v) => updateField('idType', v as IdType)}
          error={errors.idType}
        />

        <TextField
          label="ID Number"
          placeholder="e.g. 12345678"
          value={form.nationalId}
          onChangeText={(t) => updateField('nationalId', t)}
          error={errors.nationalId}
          keyboardType="number-pad"
          hint="Optional"
        />

        <TextField
          label="Full Name"
          required
          placeholder="e.g. Jane Wanjiru Mwangi"
          value={form.fullName}
          onChangeText={(t) => updateField('fullName', t)}
          error={errors.fullName}
          autoCapitalize="words"
        />

        <SelectField
          label="Gender"
          required
          placeholder="Select gender"
          value={form.gender}
          options={[
            { label: 'Male', value: 'Male' },
            { label: 'Female', value: 'Female' },
            { label: 'Other', value: 'Other' },
          ]}
          onSelect={(v) => updateField('gender', v as Gender)}
          error={errors.gender}
        />

        <TextField
          label="Date of Birth"
          required
          placeholder="YYYY-MM-DD"
          value={form.dateOfBirth}
          onChangeText={(t) => updateField('dateOfBirth', t)}
          error={errors.dateOfBirth}
          keyboardType="numbers-and-punctuation"
        />

        <SelectField
          label="County"
          required
          placeholder="Select county"
          value={form.county}
          options={KENYA_COUNTIES.map((c) => ({ label: c, value: c }))}
          onSelect={(v) => updateField('county', v)}
          error={errors.county}
          searchable
        />

        <TextField
          label="Phone Number"
          placeholder="+254712345678"
          value={form.phoneNumber}
          onChangeText={(t) => updateField('phoneNumber', t)}
          error={errors.phoneNumber}
          keyboardType="phone-pad"
          hint="Optional, used for SMS referral updates"
        />

        <Button
          title="Register Patient"
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
  offlineNoticeText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.warning,
    lineHeight: Typography.fontSize.sm * 1.4,
  },
  submitButton: { marginTop: Spacing.md },
});
