import { lazy, Suspense } from 'react';
import {
  createBrowserRouter,
  type RouteObject,
} from 'react-router-dom';
import { AppShell } from '@/shared/components/layout/AppShell';
import { ProtectedRoute } from '@/shared/components/ProtectedRoute';
import { ROUTES } from '@/shared/constants/routes.constants';

// ── Lazy-loaded pages ──────────────────────────────────────────────────────
// Auth
const LoginPage          = lazy(() => import('@/features/auth/pages/LoginPage'));
const TwoFactorPage      = lazy(() => import('@/features/auth/pages/TwoFactorPage'));
const ForgotPasswordPage = lazy(() => import('@/features/auth/pages/ForgotPasswordPage'));

// Dashboard (role-switched automatically inside component)
const DashboardRouter = lazy(() => import('@/features/dashboard/pages/DashboardRouter'));

// Patients
const PatientListPage         = lazy(() => import('@/features/patients/pages/PatientListPage'));
const PatientRegistrationPage = lazy(() => import('@/features/patients/pages/PatientRegistrationPage'));
const PatientDetailPage       = lazy(() => import('@/features/patients/pages/PatientDetailPage'));

// Referrals
const ReferralListPage   = lazy(() => import('@/features/referrals/pages/ReferralListPage'));
const CreateReferralPage = lazy(() => import('@/features/referrals/pages/CreateReferralPage'));
const ReferralDetailPage = lazy(() => import('@/features/referrals/pages/ReferralDetailPage'));

// Chat
const ChatPage = lazy(() => import('@/features/chat/pages/ChatPage'));

// Notifications
const NotificationsPage = lazy(() => import('@/features/notifications/pages/NotificationsPage'));

// Hospitals
const HospitalListPage   = lazy(() => import('@/features/hospitals/pages/HospitalListPage'));
const HospitalDetailPage = lazy(() => import('@/features/hospitals/pages/HospitalDetailPage'));

// Users (Staff)
const StaffListPage = lazy(() => import('@/features/users/pages/StaffListPage'));
const AddStaffPage  = lazy(() => import('@/features/users/pages/AddStaffPage'));
const EditStaffPage = lazy(() => import('@/features/users/pages/EditStaffPage'));

// Reports
const ReportsPage = lazy(() => import('@/features/reports/pages/ReportsPage'));

// Audit Logs
const AuditLogPage = lazy(() => import('@/features/audit-logs/pages/AuditLogPage'));

// Shared pages
const ProfilePage      = lazy(() => import('@/shared/pages/ProfilePage'));
const UnauthorizedPage = lazy(() => import('@/shared/pages/UnauthorizedPage'));
const NotFoundPage     = lazy(() => import('@/shared/pages/NotFoundPage'));

// ── Spinner shown during lazy-load ────────────────────────────────────────
const PageFallback = () => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '100vh', fontSize: '1.5rem',
  }}>
    🏥
  </div>
);

// ── Route definitions ──────────────────────────────────────────────────────
const routes: RouteObject[] = [
  // ── Public routes (unauthenticated) ──────────────────────────────────────
  {
    path: ROUTES.LOGIN,
    element: <Suspense fallback={<PageFallback />}><LoginPage /></Suspense>,
  },
  {
    path: ROUTES.VERIFY_2FA,
    element: <Suspense fallback={<PageFallback />}><TwoFactorPage /></Suspense>,
  },
  {
    path: ROUTES.FORGOT_PASSWORD,
    element: <Suspense fallback={<PageFallback />}><ForgotPasswordPage /></Suspense>,
  },

  // ── Authenticated shell ───────────────────────────────────────────────────
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Suspense fallback={<PageFallback />}><DashboardRouter /></Suspense> },
      {
        path: ROUTES.DASHBOARD,
        element: <Suspense fallback={<PageFallback />}><DashboardRouter /></Suspense>,
      },

      // Patients — Clinician, Receptionist, Hospital Admin, System Admin
      {
        path: ROUTES.PATIENTS,
        element: (
          <ProtectedRoute allowedRoles={['Clinician', 'Receptionist', 'Hospital Admin', 'System Admin']}>
            <Suspense fallback={<PageFallback />}><PatientListPage /></Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.PATIENT_NEW,
        element: (
          <ProtectedRoute allowedRoles={['Clinician', 'Receptionist', 'Hospital Admin', 'System Admin']}>
            <Suspense fallback={<PageFallback />}><PatientRegistrationPage /></Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.PATIENT_DETAIL(),
        element: (
          <ProtectedRoute allowedRoles={['Clinician', 'Receptionist', 'Hospital Admin', 'System Admin']}>
            <Suspense fallback={<PageFallback />}><PatientDetailPage /></Suspense>
          </ProtectedRoute>
        ),
      },

      // Referrals — Clinician, Receptionist, Hospital Admin, System Admin
      {
        path: ROUTES.REFERRALS,
        element: (
          <ProtectedRoute allowedRoles={['Clinician', 'Receptionist', 'Hospital Admin', 'System Admin']}>
            <Suspense fallback={<PageFallback />}><ReferralListPage /></Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.REFERRAL_NEW,
        element: (
          <ProtectedRoute allowedRoles={['Clinician', 'Hospital Admin']}>
            <Suspense fallback={<PageFallback />}><CreateReferralPage /></Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.REFERRAL_DETAIL(),
        element: (
          <ProtectedRoute allowedRoles={['Clinician', 'Receptionist', 'Hospital Admin', 'System Admin']}>
            <Suspense fallback={<PageFallback />}><ReferralDetailPage /></Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.REFERRAL_CHAT(),
        element: (
          <ProtectedRoute allowedRoles={['Clinician']}>
            <Suspense fallback={<PageFallback />}><ChatPage /></Suspense>
          </ProtectedRoute>
        ),
      },

      // Notifications — any authenticated user, own inbox only
      {
        path: ROUTES.NOTIFICATIONS,
        element: (
          <Suspense fallback={<PageFallback />}><NotificationsPage /></Suspense>
        ),
      },

      // Hospitals — System Admin only
      {
        path: ROUTES.HOSPITALS,
        element: (
          <ProtectedRoute allowedRoles={['System Admin']}>
            <Suspense fallback={<PageFallback />}><HospitalListPage /></Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.HOSPITAL_DETAIL(),
        element: (
          <ProtectedRoute allowedRoles={['System Admin']}>
            <Suspense fallback={<PageFallback />}><HospitalDetailPage /></Suspense>
          </ProtectedRoute>
        ),
      },

      // Staff — Hospital Admin only
      {
        path: ROUTES.USERS,
        element: (
          <ProtectedRoute allowedRoles={['Hospital Admin']}>
            <Suspense fallback={<PageFallback />}><StaffListPage /></Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.USER_NEW,
        element: (
          <ProtectedRoute allowedRoles={['Hospital Admin']}>
            <Suspense fallback={<PageFallback />}><AddStaffPage /></Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.USER_EDIT(),
        element: (
          <ProtectedRoute allowedRoles={['Hospital Admin']}>
            <Suspense fallback={<PageFallback />}><EditStaffPage /></Suspense>
          </ProtectedRoute>
        ),
      },

      // Reports — System Admin + Hospital Admin
      {
        path: ROUTES.REPORTS,
        element: (
          <ProtectedRoute allowedRoles={['System Admin', 'Hospital Admin']}>
            <Suspense fallback={<PageFallback />}><ReportsPage /></Suspense>
          </ProtectedRoute>
        ),
      },

      // Audit Logs — System Admin only
      {
        path: ROUTES.AUDIT_LOGS,
        element: (
          <ProtectedRoute allowedRoles={['System Admin']}>
            <Suspense fallback={<PageFallback />}><AuditLogPage /></Suspense>
          </ProtectedRoute>
        ),
      },

      // Profile — any authenticated user
      {
        path: ROUTES.PROFILE,
        element: (
          <Suspense fallback={<PageFallback />}><ProfilePage /></Suspense>
        ),
      },

      // Utility
      {
        path: ROUTES.UNAUTHORIZED,
        element: <Suspense fallback={<PageFallback />}><UnauthorizedPage /></Suspense>,
      },
    ],
  },

  // ── 404 catch-all ─────────────────────────────────────────────────────────
  {
    path: '*',
    element: <Suspense fallback={<PageFallback />}><NotFoundPage /></Suspense>,
  },
];

export const router = createBrowserRouter(routes);
