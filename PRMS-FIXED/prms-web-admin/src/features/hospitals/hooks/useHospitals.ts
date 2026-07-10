import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hospitalsApi } from '../api/hospitals.api';
import type { HospitalListParams, UpdateHospitalStatusRequest } from '@/types/hospital.types';

const HOSPITALS_KEY = 'hospitals';

export function useHospitalsList(params: HospitalListParams) {
  return useQuery({
    queryKey: [HOSPITALS_KEY, params],
    queryFn: () => hospitalsApi.list(params),
    placeholderData: (prev) => prev, // Keep showing old page while next page loads
  });
}

export function useHospitalDetail(hospitalId: number | undefined) {
  return useQuery({
    queryKey: [HOSPITALS_KEY, hospitalId],
    queryFn: () => hospitalsApi.getById(hospitalId!),
    enabled: !!hospitalId,
  });
}

export function useUpdateHospitalStatus(hospitalId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateHospitalStatusRequest) =>
      hospitalsApi.updateStatus(hospitalId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [HOSPITALS_KEY] });
    },
  });
}
