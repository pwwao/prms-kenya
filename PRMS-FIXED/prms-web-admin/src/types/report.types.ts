export interface CountyReportRow {
  county: string;
  totalReferrals: number;
  accepted: number;
  rejected: number;
  completed: number;
  pending: number;
  averageResponseTimeHours: number;
}

export interface ReferralTrendRow {
  period: string;
  total: number;
  urgent: number;
  emergent: number;
  routine: number;
}

export interface FacilityPerformanceRow {
  hospitalId: number;
  hospitalName: string;
  facilityLevel: string;
  county: string;
  referralsSent: number;
  referralsReceived: number;
  acceptanceRate: number;
  rejectionRate: number;
  averageResponseTimeHours: number;
  completionRate: number;
}

export interface ReportDateRange {
  startDate: string;
  endDate: string;
}
