import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { patientsApi } from '../api/patients.api';
import { ROUTES } from '@/shared/constants/routes.constants';
import type {
  PatientListParams,
  PatientSearchParams,
  CreatePatientRequest,
  UpdatePatientRequest,
} from '@/types/patient.types';

const PATIENTS_KEY = 'patients';

export function usePatientsList(params: PatientListParams) {
  return useQuery({
    queryKey: [PATIENTS_KEY, params],
    queryFn: () => patientsApi.list(params),
    placeholderData: (prev) => prev,
  });
}

export function usePatientSearch(params: PatientSearchParams, enabled: boolean) {
  return useQuery({
    queryKey: [PATIENTS_KEY, 'search', params],
    queryFn: () => patientsApi.search(params),
    enabled,
  });
}

export function usePatientDetail(patientId: number | undefined) {
  return useQuery({
    queryKey: [PATIENTS_KEY, patientId],
    queryFn: () => patientsApi.getById(patientId!),
    enabled: !!patientId,
  });
}

export function usePatientReferralHistory(patientId: number | undefined) {
  return useQuery({
    queryKey: [PATIENTS_KEY, patientId, 'referral-history'],
    queryFn: () => patientsApi.referralHistory(patientId!),
    enabled: !!patientId,
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (payload: CreatePatientRequest) => patientsApi.create(payload),
    onSuccess: (patient) => {
      queryClient.invalidateQueries({ queryKey: [PATIENTS_KEY] });
      navigate(ROUTES.PATIENT_DETAIL(patient.id));
    },
  });
}

export function useUpdatePatient(patientId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdatePatientRequest) => patientsApi.update(patientId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PATIENTS_KEY] });
    },
  });
}
