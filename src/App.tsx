import { useState, useCallback, lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Routes, Route, useLocation, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import AppShell from '@/components/AppShell';
import ErrorBoundary from '@/components/ErrorBoundary';
import LoginPage from '@/components/LoginPage';
import BootScreen from '@/components/BootScreen';
import { AccessDenied, NotFound } from '@/components/StatusPage';
import { resolveModuleTrail } from '@/utils/modules';
import { MODULE_KEYS, type ModuleKey } from '@/utils/permissions';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '@/styles/toast.css';
import { TooltipProvider, LoadingBlock } from '@/ui';

import DashboardPage from '@/pages/Dashboard';
import UsersPage from '@/pages/Users';
import ProfilePage from '@/pages/Profile';
import ModulesPage from '@/pages/Modules';
import RolesPage from '@/pages/Roles';
import AuditLogPage from '@/pages/AuditLog';
import GenericModulePage, { ModulesLoading } from '@/pages/GenericModulePage';
import CreateFirstEntry from '@/pages/CreateFirstEntry';
import CreateFirstEntrySurveyBooking from '@/pages/CreateFirstEntrySurveyBooking';
import CreateFirstEntrySurveyReport from '@/pages/CreateFirstEntrySurveyReport';
import ChecklistManagement from '@/pages/ChecklistManagement';
import FirstEntryFullReportPage from '@/pages/FirstEntryFullReportPage';
import VesselEquipmentRecordPage from '@/pages/VesselEquipmentRecordPage';
import EditSurveyReport from '@/pages/EditSurveyReport';
import QuotationForm from '@/pages/finance/QuotationForm';
import QuotationDetails from '@/pages/finance/QuotationDetails';

const UiKitPage = lazy(() => import('@/pages/dev/UiKitPage'));

/** Internal pages (style guide etc.) for super admins only. */
function SuperAdminGate({ children }: { children: React.ReactNode }) {
  const { isSuperAdmin } = useAuth();
  return isSuperAdmin ? <Suspense fallback={<LoadingBlock />}>{children}</Suspense> : <NotFound />;
}


/** Renders the page only when the user holds `action` on the module with this key. */
function PermissionGate({ module, action = 'read', children }: { module: ModuleKey; action?: string; children: React.ReactNode }) {
  const { modulesLoaded, can } = useAuth();
  if (!modulesLoaded) return <ModulesLoading />;
  if (!can(module, action)) return <AccessDenied />;
  return <>{children}</>;
}

/**
 * Guards the explicit First Entry routes, which bypass GenericModulePage's module access check:
 * every level of the path must be readable, plus the sub-module permission the page needs.
 */
function FirstEntryGate({ module: required, action = 'read', children }: { module: ModuleKey; action?: string; children: React.ReactNode }) {
  const { module } = useParams();
  const { modules, modulesLoaded, canAccessModule, can } = useAuth();
  if (!modulesLoaded) return <ModulesLoading />;
  const { trail, matched } = resolveModuleTrail(modules, [module || '', 'marine', 'first-entry']);
  if (matched < 3) return <NotFound />;
  if (trail.some(m => !canAccessModule(m._id)) || !can(required, action)) return <AccessDenied />;
  return <>{children}</>;
}

const fe = (required: ModuleKey, action: string, page: React.ReactNode) => (
  <FirstEntryGate module={required} action={action}>{page}</FirstEntryGate>
);

/** Guards the quotation routes: the first path segment must be the Finance module, readable, plus the quotation action. */
function FinanceGate({ action = 'read', children }: { action?: string; children: React.ReactNode }) {
  const { module } = useParams();
  const { modules, modulesLoaded, canAccessModule, can } = useAuth();
  if (!modulesLoaded) return <ModulesLoading />;
  const { trail, matched } = resolveModuleTrail(modules, [module || '']);
  if (matched < 1 || trail[0].key !== MODULE_KEYS.finance) return <NotFound />;
  if (!canAccessModule(trail[0]._id) || !can(MODULE_KEYS.financeQuotations, action)) return <AccessDenied />;
  return <>{children}</>;
}

const BOOT_FLAG = 'uqms_backend_booted';

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [booting, setBooting] = useState(() => sessionStorage.getItem(BOOT_FLAG) !== 'true');

  const finishBoot = useCallback(() => {
    sessionStorage.setItem(BOOT_FLAG, 'true');
    setBooting(false);
  }, []);

  if (!user) {
    if (booting) {
      return <BootScreen onDone={finishBoot} />;
    }
    return <LoginPage />;
  }

  return (
    <AppShell>
      <ErrorBoundary resetKey={pathname}>{children}</ErrorBoundary>
    </AppShell>
  );
}

function Root() {
  return (
    <AuthProvider>
      <TooltipProvider>
        <AuthGate>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/users" element={<PermissionGate module={MODULE_KEYS.adminUsers}><UsersPage /></PermissionGate>} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/modules" element={<PermissionGate module={MODULE_KEYS.adminModules}><ModulesPage /></PermissionGate>} />
            <Route path="/roles" element={<PermissionGate module={MODULE_KEYS.adminRoles}><RolesPage /></PermissionGate>} />
            <Route path="/audit-log" element={<PermissionGate module={MODULE_KEYS.adminAuditLog}><AuditLogPage /></PermissionGate>} />
            <Route path="/checklist-management" element={<PermissionGate module={MODULE_KEYS.adminMasterData}><ChecklistManagement /></PermissionGate>} />
            <Route path="/dev/ui" element={<SuperAdminGate><UiKitPage /></SuperAdminGate>} />

            {/* First Entry Sub-Sub-Module Custom Routes (under Marine) */}
            <Route path="/:module/marine/first-entry/create" element={fe(MODULE_KEYS.marineEntries, 'create', <CreateFirstEntry />)} />
            <Route path="/:module/marine/first-entry/edit/:id" element={fe(MODULE_KEYS.marineEntries, 'read', <CreateFirstEntry />)} />
            <Route path="/:module/marine/first-entry/survey-booking/create" element={fe(MODULE_KEYS.marineBookings, 'create', <CreateFirstEntrySurveyBooking />)} />
            <Route path="/:module/marine/first-entry/survey-booking/edit/:id" element={fe(MODULE_KEYS.marineBookings, 'read', <CreateFirstEntrySurveyBooking />)} />
            <Route path="/:module/marine/first-entry/survey-report/create" element={fe(MODULE_KEYS.marineReports, 'create', <CreateFirstEntrySurveyReport />)} />
            <Route path="/:module/marine/first-entry/survey-report/edit/:id" element={fe(MODULE_KEYS.marineReports, 'read', <CreateFirstEntrySurveyReport />)} />
            <Route path="/:module/marine/first-entry/survey-report/equipment-record/:id" element={fe(MODULE_KEYS.marineReports, 'read', <VesselEquipmentRecordPage />)} />
            <Route path="/:module/marine/first-entry/survey-report/full/:id" element={fe(MODULE_KEYS.marineReports, 'read', <FirstEntryFullReportPage />)} />
            <Route path="/:module/marine/first-entry/survey-report/final/:id" element={fe(MODULE_KEYS.marineCertificates, 'read', <EditSurveyReport />)} />

            {/* Finance quotations (the list itself is a tab on the Finance module page) */}
            <Route path="/:module/quotations/new" element={<FinanceGate action="create"><QuotationForm key="new" /></FinanceGate>} />
            <Route path="/:module/quotations/:id" element={<FinanceGate><QuotationDetails /></FinanceGate>} />
            <Route path="/:module/quotations/:id/edit" element={<FinanceGate><QuotationForm key="edit" /></FinanceGate>} />

            {/* Catch-all dynamic route for DB modules (supports unlimited nesting) */}
            <Route path="/:module" element={<GenericModulePage />} />
            <Route path="/:module/*" element={<GenericModulePage />} />
          </Routes>
        </AuthGate>
      </TooltipProvider>
      <ToastContainer position="top-right" autoClose={4000} newestOnTop closeOnClick pauseOnFocusLoss draggable pauseOnHover />
    </AuthProvider>
  );
}

// A data router (rather than <BrowserRouter>) so pages can use useBlocker for unsaved-changes prompts.
const router = createBrowserRouter([{ path: '*', element: <Root /> }]);

function App() {
  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
}

export default App;
