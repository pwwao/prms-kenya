import React from 'react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import type { ReferralTrendRow } from '@/types/report.types';

interface ReferralTrendsChartProps {
  data: ReferralTrendRow[];
  loading?: boolean;
}

/** Referral volume over time, broken down by urgency — design tokens: teal/amber/danger */
export const ReferralTrendsChart: React.FC<ReferralTrendsChartProps> = ({ data, loading }) => (
  <Card variant="outlined">
    <CardContent>
      <Typography variant="subtitle1" mb={2}>Referral Volume Trends</Typography>
      {loading ? (
        <Skeleton variant="rounded" height={280} />
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorRoutine" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#16834B" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#16834B" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorUrgent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#C97A15" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#C97A15" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorEmergent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#B91C1C" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#B91C1C" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8EDF2" />
            <XAxis dataKey="period" tick={{ fontSize: 12, fill: '#6E8499' }} />
            <YAxis tick={{ fontSize: 12, fill: '#6E8499' }} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: '1px solid #D8E2EA', fontSize: '0.8125rem' }}
            />
            <Legend wrapperStyle={{ fontSize: '0.8125rem' }} />
            <Area type="monotone" dataKey="routine" name="Routine" stroke="#16834B" fill="url(#colorRoutine)" strokeWidth={2} />
            <Area type="monotone" dataKey="urgent" name="Urgent" stroke="#C97A15" fill="url(#colorUrgent)" strokeWidth={2} />
            <Area type="monotone" dataKey="emergent" name="Emergent" stroke="#B91C1C" fill="url(#colorEmergent)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </CardContent>
  </Card>
);
