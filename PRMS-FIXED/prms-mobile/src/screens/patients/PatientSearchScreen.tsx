/**
 * Patient Search Screen
 * Per PRMS_API_Reference §3.2 — search by name or masked national ID.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import Feather from 'react-native-vector-icons/Feather';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DashboardStackParamList } from '@navigation/types';
import Screen from '@components/common/Screen';
import TextField from '@components/common/TextField';
import { LoadingView, EmptyState } from '@components/common/States';
import { Colors, Typography, Spacing, Radius, Shadows, IconSize } from '@theme/tokens';
import { useDebounce } from '@hooks/useDebounce';
import { patientsApi } from '@api/services';
import { queryKeys } from '@api/queryClient';
import type { Patient } from '@types/index';

type Props = NativeStackScreenProps<DashboardStackParamList, 'PatientSearch'>;

export default function PatientSearchScreen({ navigation, route }: Props) {
  const { fromCreateReferral } = route.params ?? {};
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 400);

  const { data: patients, isLoading } = useQuery({
    queryKey: queryKeys.patients.search(debouncedQuery),
    queryFn: async () => {
      const res = await patientsApi.search({ q: debouncedQuery, limit: 20 });
      return res.data.data;
    },
    enabled: debouncedQuery.trim().length >= 2,
  });

  const handleSelectPatient = (patient: Patient) => {
    if (fromCreateReferral) {
      navigation.navigate('CreateReferral', { patientId: patient.id });
    } else {
      navigation.navigate('PatientDetail', { patientId: patient.id });
    }
  };

  return (
    <Screen edges={['bottom']}>
      <View style={styles.searchContainer}>
        <TextField
          placeholder="Search by name or National ID"
          value={query}
          onChangeText={setQuery}
          leftIcon="search"
          autoFocus
          containerStyle={styles.searchField}
        />
      </View>

      {debouncedQuery.trim().length < 2 ? (
        <EmptyState
          icon="search"
          title="Search for a patient"
          message="Enter at least 2 characters of the patient's name or national ID"
        />
      ) : isLoading ? (
        <LoadingView message="Searching..." />
      ) : !patients || patients.length === 0 ? (
        <EmptyState
          icon="user-x"
          title="No patients found"
          message="This patient may not be registered yet."
          actionLabel="Register New Patient"
          onAction={() => navigation.navigate('PatientRegistration', {})}
        />
      ) : (
        <FlatList
          data={patients}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <PatientResultCard patient={item} onPress={() => handleSelectPatient(item)} />
          )}
          ListFooterComponent={
            <TouchableOpacity
              style={styles.registerNewCard}
              onPress={() => navigation.navigate('PatientRegistration', {})}
            >
              <Feather name="user-plus" size={IconSize.md} color={Colors.primary} />
              <Text style={styles.registerNewText}>Register a new patient instead</Text>
            </TouchableOpacity>
          }
        />
      )}
    </Screen>
  );
}

function PatientResultCard({ patient, onPress }: { patient: Patient; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.resultCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarText}>{patient.fullName.charAt(0)}</Text>
      </View>
      <View style={styles.resultInfo}>
        <Text style={styles.resultName}>{patient.fullName}</Text>
        <Text style={styles.resultMeta}>
          {patient.gender} · {patient.age} yrs{patient.nationalId ? ` · ${patient.nationalId}` : ''}
        </Text>
        <Text style={styles.resultCounty}>{patient.county} County</Text>
      </View>
      <Feather name="chevron-right" size={IconSize.md} color={Colors.gray400} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  searchContainer: { padding: Spacing.base, paddingBottom: 0 },
  searchField: { marginBottom: 0 },
  listContent: { padding: Spacing.base },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  avatarText: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },
  resultInfo: { flex: 1 },
  resultName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.textPrimary,
  },
  resultMeta: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  resultCounty: { fontSize: Typography.fontSize.xs, color: Colors.textTertiary, marginTop: 2 },
  registerNewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.base,
    marginTop: Spacing.sm,
  },
  registerNewText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.medium,
    marginLeft: Spacing.sm,
  },
});
