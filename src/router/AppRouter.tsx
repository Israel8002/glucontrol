import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Spinner } from '@/components/ui/Spinner/Spinner';

// Lazy loading de todas las páginas
const Dashboard = lazy(() => import('@/pages/Dashboard/Dashboard').then(m => ({ default: m.Dashboard })));
const GlucosePage = lazy(() => import('@/pages/Glucose/GlucosePage').then(m => ({ default: m.GlucosePage })));
const GlucoseForm = lazy(() => import('@/pages/Glucose/GlucoseForm').then(m => ({ default: m.GlucoseForm })));
const MedicationsPage = lazy(() => import('@/pages/Medications/MedicationsPage').then(m => ({ default: m.MedicationsPage })));
const InsulinPage = lazy(() => import('@/pages/Insulin/InsulinPage').then(m => ({ default: m.InsulinPage })));
const StatisticsPage = lazy(() => import('@/pages/Statistics/StatisticsPage').then(m => ({ default: m.StatisticsPage })));
const WeightPage = lazy(() => import('@/pages/Weight/WeightPage').then(m => ({ default: m.WeightPage })));
const BloodPressurePage = lazy(() => import('@/pages/BloodPressure/BloodPressurePage').then(m => ({ default: m.BloodPressurePage })));
const CalendarPage = lazy(() => import('@/pages/Calendar/CalendarPage').then(m => ({ default: m.CalendarPage })));
const RemindersPage = lazy(() => import('@/pages/Reminders/RemindersPage').then(m => ({ default: m.RemindersPage })));
const SettingsPage = lazy(() => import('@/pages/Settings/SettingsPage').then(m => ({ default: m.SettingsPage })));
const BackupPage = lazy(() => import('@/pages/Backup/BackupPage').then(m => ({ default: m.BackupPage })));
const ReportsPage = lazy(() => import('@/pages/Reports/ReportsPage').then(m => ({ default: m.ReportsPage })));

const PageLoader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
    <Spinner size="lg" />
  </div>
);

export const AppRouter: React.FC = () => {
  return (
    <AppLayout>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/glucosa" element={<GlucosePage />} />
          <Route path="/glucosa/nueva" element={<GlucoseForm />} />
          <Route path="/glucosa/editar/:id" element={<GlucoseForm />} />
          <Route path="/medicamentos" element={<MedicationsPage />} />
          <Route path="/insulina" element={<InsulinPage />} />
          <Route path="/estadisticas" element={<StatisticsPage />} />
          <Route path="/peso" element={<WeightPage />} />
          <Route path="/presion" element={<BloodPressurePage />} />
          <Route path="/calendario" element={<CalendarPage />} />
          <Route path="/recordatorios" element={<RemindersPage />} />
          <Route path="/configuracion" element={<SettingsPage />} />
          <Route path="/configuracion/respaldo" element={<BackupPage />} />
          <Route path="/reportes" element={<ReportsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppLayout>
  );
};
// Trigger reports compile
