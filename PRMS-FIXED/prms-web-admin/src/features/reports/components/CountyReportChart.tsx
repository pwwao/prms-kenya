import React from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import type { CountyReportRow } from '@/types/report.types';

interface CountyReportChartProps {
  data: CountyReportRow[];
  loading?: boolean;
}

/** Accepted vs Rejected vs Pending referrals by county */
export const CountyReportChart: React.FC<CountyReportChartProps> = ({ data, loading }) => (
  <Card variant="outlined">
    <CardContent>
      <Typography variant="subtitle1" mb={2}>Referral Outcomes by County</Typography>
      {loading ? (
        <Skeleton variant="rounded" height={320} />
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8EDF2" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 12, fill: '#6E8499' }} />
            <YAxis type="category" dataKey="county" width={90} tick={{ fontSize: 12, fill: '#2B3D52' }} />
            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #D8E2EA', fontSize: '0.8125rem' }} />
            <Legend wrapperStyle={{ fontSize: '0.8125rem' }} />
            <Bar dataKey="accepted" name="Accepted" fill="#16834B" radius={[0, 4, 4, 0]} stackId="a" />
            <Bar dataKey="pending" name="Pending" fill="#B85C00" radius={[0, 4, 4, 0]} stackId="a" />
            <Bar dataKey="rejected" name="Rejected" fill="#B91C1C" radius={[0, 4, 4, 0]} stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </CardContent>
  </Card>
);
