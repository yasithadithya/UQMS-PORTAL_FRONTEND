import { useState, useCallback } from 'react';
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

import DashboardPage from '@/pages/Dashboard';
import UsersPage from '@/pages/Users';
import ProfilePage from '@/pages/Profile';
import ModulesPage from '@/pages/Modules';
import RolesPage from '@/pages/Roles';
import GenericModulePage, { ModulesLoading } from '@/pages/GenericModulePage';
import CreateFirstEntry from '@/pages/CreateFirstEntry';
import CreateFirstEntrySurveyBooking from '@/pages/CreateFirstEntrySurveyBooking';
import CreateFirstEntrySurveyReport from '@/pages/CreateFirstEntrySurveyReport';
import ChecklistManagement from '@/pages/ChecklistManagement';
import FirstEntryFullReportPage from '@/pages/FirstEntryFullReportPage';
import VesselEquipmentRecordPage from '@/pages/VesselEquipmentRecordPage';
import EditSurveyReport from '@/pages/EditSurveyReport';


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
      <AuthGate>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/users" element={<PermissionGate module={MODULE_KEYS.adminUsers}><UsersPage /></PermissionGate>} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/modules" element={<PermissionGate module={MODULE_KEYS.adminModules}><ModulesPage /></PermissionGate>} />
          <Route path="/roles" element={<PermissionGate module={MODULE_KEYS.adminRoles}><RolesPage /></PermissionGate>} />
          <Route path="/checklist-management" element={<PermissionGate module={MODULE_KEYS.adminMasterData}><ChecklistManagement /></PermissionGate>} />

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

          {/* Catch-all dynamic route for DB modules (supports unlimited nesting) */}
          <Route path="/:module" element={<GenericModulePage />} />
          <Route path="/:module/*" element={<GenericModulePage />} />
        </Routes>
      </AuthGate>
      <ToastContainer position="top-right" autoClose={4000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="colored" style={{ fontSize: '13px' }} />
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
