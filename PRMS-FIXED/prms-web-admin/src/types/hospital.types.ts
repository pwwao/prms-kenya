export type HospitalStatus = 'Pending' | 'Approved' | 'Suspended' | 'Rejected';
export type FacilityLevel = 'Level 2' | 'Level 3' | 'Level 4' | 'Level 5' | 'Level 6';

export interface Hospital {
  id: number;
  mohCode: string;
  name: string;
  facilityLevel: FacilityLevel;
  county: string;
  subCounty: string;
  status: HospitalStatus;
  totalStaff?: number;
  totalReferralsIn?: number;
  totalReferralsOut?: number;
  createdAt: string;
  updatedAt: string;
}

export interface HospitalListParams {
  status?: HospitalStatus;
  county?: string;
  facilityLevel?: FacilityLevel;
  q?: string;
  page?: number;
  limit?: number;
  sortBy?: 'created_at' | 'name';
  sortDir?: 'asc' | 'desc';
}

export interface UpdateHospitalStatusRequest {
  status: HospitalStatus;
  reason?: string;
}
