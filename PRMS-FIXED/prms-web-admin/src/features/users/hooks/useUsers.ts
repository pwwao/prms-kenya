import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { usersApi } from '../api/users.api';
import type {
  StaffListParams, CreateStaffRequest, UpdateStaffRequest, UpdateStaffStatusRequest,
} from '@/types/user.types';
import { ROUTES } from '@/shared/constants/routes.constants';

const USERS_KEY = 'staff';

export function useStaffList(params: StaffListParams) {
  return useQuery({
    queryKey: [USERS_KEY, params],
    queryFn: () => usersApi.list(params),
    placeholderData: (prev) => prev,
  });
}

export function useStaffDetail(userId: number | undefined) {
  return useQuery({
    queryKey: [USERS_KEY, userId],
    queryFn: () => usersApi.getById(userId!),
    enabled: !!userId,
  });
}

export function useCreateStaff() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (payload: CreateStaffRequest) => usersApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [USERS_KEY] });
      navigate(ROUTES.USERS);
    },
  });
}

export function useUpdateStaff(userId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateStaffRequest) => usersApi.update(userId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [USERS_KEY] }),
  });
}

export function useUpdateStaffStatus(userId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateStaffStatusRequest) => usersApi.updateStatus(userId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [USERS_KEY] }),
  });
}
