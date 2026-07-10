/**
 * Reports API — maps to PRMS_API_Reference_v1.0.md "MODULE 8 — REPORTS"
 */

import { apiClient } from '@/shared/api/api-client';
import type { ApiSuccess } from '@/types/api.types';
import type {
  CountyReportRow, ReferralTrendRow, FacilityPerformanceRow, ReportDateRange,
} from '@/types/report.types';

export const reportsApi = {
  getCountyReport: async (params: ReportDateRange & { county?: string }) => {
    const { data } = await apiClient.get<ApiSuccess<CountyReportRow[]>>('/reports/county', { params });
    return data.data;
  },

  getReferralTrends: async (params: ReportDateRange & { groupBy?: 'day' | 'week' }) => {
    const { data } = await apiClient.get<ApiSuccess<ReferralTrendRow[]>>('/reports/referral-trends', { params });
    return data.data;
  },

  getFacilityPerformance: async (params: ReportDateRange & { hospitalId?: number }) => {
    const { data } = await apiClient.get<ApiSuccess<FacilityPerformanceRow[]>>(
      '/reports/facility-performance',
      { params }
    );
    return data.data;
  },

  /**
   * BUG FIX: Export the currently-visible report as a PDF.
   * Streams the binary PDF from the backend and triggers a browser download.
   */
  exportPdf: async (
    params: ReportDateRange & {
      reportType: 'county' | 'referral-trends' | 'facility-performance';
      groupBy?: 'day' | 'week';
      hospitalId?: number;
      county?: string;
    },
  ): Promise<void> => {
    const response = await apiClient.get('/reports/export-pdf', {
      params,
      responseType: 'blob',
    });
    const blob = new Blob([response.data as BlobPart], { type: 'application/pdf' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `prms-${params.reportType}-${params.startDate}-${params.endDate}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
