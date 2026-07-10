/**
 * DatabaseProvider — wraps app with WatermelonDB context
 */
import React from 'react';
import { DatabaseProvider as WatermelonProvider } from '@nozbe/watermelondb/react';
import { database } from './database';

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  return <WatermelonProvider database={database}>{children}</WatermelonProvider>;
}
