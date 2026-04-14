"use client";

import { Suspense } from 'react';
import SettingsPage from './SettingsPage';

export default function Page() {
  return (
    <Suspense>
      <SettingsPage />
    </Suspense>
  );
}
