import { useState, useCallback } from 'react';
import { createBrowserRouter, RouterProvider, Routes, Route, useLocation, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import AppShell from '@/components/AppShell';
import ErrorBoundary from '@/components/ErrorBoundary';
import LoginPage from '@/components/LoginPage';
import BootScreen from '@/components/BootScreen';
import { AccessDenied, NotFound } from '@/components/StatusPage';
import { resolveModuleTrail } from '@/utils/modules';
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


function AdminGate({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <AccessDenied />;
  return <>{children}</>;
}

/** Guards the explicit First Entry routes, which bypass GenericModulePage's module access check. */
function FirstEntryGate({ children }: { children: React.ReactNode }) {
  const { module } = useParams();
  const { modules, modulesLoaded, canAccessModule } = useAuth();
  if (!modulesLoaded) return <ModulesLoading />;
  const { trail, matched } = resolveModuleTrail(modules, [module || '', 'marine', 'first-entry']);
  if (matched < 3) return <NotFound />;
  if (trail.some(m => !canAccessModule(m._id))) return <AccessDenied />;
  return <>{children}</>;
}

const fe = (page: React.ReactNode) => <FirstEntryGate>{page}</FirstEntryGate>;

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
          <Route path="/users" element={<AdminGate><UsersPage /></AdminGate>} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/modules" element={<AdminGate><ModulesPage /></AdminGate>} />
          <Route path="/roles" element={<AdminGate><RolesPage /></AdminGate>} />
          <Route path="/checklist-management" element={<AdminGate><ChecklistManagement /></AdminGate>} />

          {/* First Entry Sub-Sub-Module Custom Routes (under Marine) */}
          <Route path="/:module/marine/first-entry/create" element={fe(<CreateFirstEntry />)} />
          <Route path="/:module/marine/first-entry/edit/:id" element={fe(<CreateFirstEntry />)} />
          <Route path="/:module/marine/first-entry/survey-booking/create" element={fe(<CreateFirstEntrySurveyBooking />)} />
          <Route path="/:module/marine/first-entry/survey-booking/edit/:id" element={fe(<CreateFirstEntrySurveyBooking />)} />
          <Route path="/:module/marine/first-entry/survey-report/create" element={fe(<CreateFirstEntrySurveyReport />)} />
          <Route path="/:module/marine/first-entry/survey-report/edit/:id" element={fe(<CreateFirstEntrySurveyReport />)} />
          <Route path="/:module/marine/first-entry/survey-report/equipment-record/:id" element={fe(<VesselEquipmentRecordPage />)} />
          <Route path="/:module/marine/first-entry/survey-report/full/:id" element={fe(<FirstEntryFullReportPage />)} />
          <Route path="/:module/marine/first-entry/survey-report/final/:id" element={fe(<EditSurveyReport />)} />

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
