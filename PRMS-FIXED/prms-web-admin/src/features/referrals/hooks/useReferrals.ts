import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { referralsApi } from '../api/referrals.api';
import { ROUTES } from '@/shared/constants/routes.constants';
import type {
  ReferralListParams,
  CreateReferralRequest,
  UpdateReferralRequest,
  TransitionReferralRequest,
} from '@/types/referral.types';

const REFERRALS_KEY = 'referrals';

export function useReferralsList(params: ReferralListParams) {
  return useQuery({
    queryKey: [REFERRALS_KEY, params],
    queryFn: () => referralsApi.list(params),
    placeholderData: (prev) => prev,
  });
}

export function useReferralDetail(referralId: number | undefined) {
  return useQuery({
    queryKey: [REFERRALS_KEY, referralId],
    queryFn: () => referralsApi.getById(referralId!),
    enabled: !!referralId,
  });
}

export function useReferralTimeline(referralId: number | undefined) {
  return useQuery({
    queryKey: [REFERRALS_KEY, referralId, 'timeline'],
    queryFn: () => referralsApi.timeline(referralId!),
    enabled: !!referralId,
  });
}

export function useReferralAttachments(referralId: number | undefined) {
  return useQuery({
    queryKey: [REFERRALS_KEY, referralId, 'attachments'],
    queryFn: () => referralsApi.attachments(referralId!),
    enabled: !!referralId,
  });
}

export function useCreateReferral() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (payload: CreateReferralRequest) => referralsApi.create(payload),
    onSuccess: (referral) => {
      queryClient.invalidateQueries({ queryKey: [REFERRALS_KEY] });
      navigate(ROUTES.REFERRAL_DETAIL(referral.id));
    },
  });
}

export function useUpdateReferral(referralId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateReferralRequest) => referralsApi.update(referralId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [REFERRALS_KEY, referralId] });
    },
  });
}

export function useTransitionReferral(referralId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: TransitionReferralRequest) => referralsApi.transition(referralId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [REFERRALS_KEY, referralId] });
      queryClient.invalidateQueries({ queryKey: [REFERRALS_KEY, referralId, 'timeline'] });
      queryClient.invalidateQueries({ queryKey: [REFERRALS_KEY] });
    },
  });
}

export function useDeleteReferral() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (referralId: number) => referralsApi.remove(referralId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [REFERRALS_KEY] });
      navigate(ROUTES.REFERRALS);
    },
  });
}
