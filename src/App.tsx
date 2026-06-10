import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import AppShell from '@/components/AppShell';
import LoginPage from '@/components/LoginPage';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import DashboardPage from '@/pages/Dashboard';
import UsersPage from '@/pages/Users';
import ModulesPage from '@/pages/Modules';
import RolesPage from '@/pages/Roles';
import GenericModulePage from '@/pages/GenericModulePage';
import CreateFirstEntry from '@/pages/CreateFirstEntry';
import CreateFirstEntrySurveyBooking from '@/pages/CreateFirstEntrySurveyBooking';
import CreateFirstEntrySurveyReport from '@/pages/CreateFirstEntrySurveyReport';
import ChecklistManagement from '@/pages/ChecklistManagement';
import FirstEntryFullReportPage from '@/pages/FirstEntryFullReportPage';

function AdminGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const roleName = typeof user?.role === 'object' && user.role ? user.role.roleName : String(user?.role || '');
  if (roleName.toLowerCase() !== 'admin') {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--muted)' }}>
        <h2 style={{ marginBottom: '1rem', color: 'var(--text)' }}>Access Denied</h2>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }
  return <>{children}</>;
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (!user) {
    return <LoginPage />;
  }

  return <AppShell>{children}</AppShell>;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AuthGate>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/modules" element={<AdminGate><ModulesPage /></AdminGate>} />
            <Route path="/roles" element={<AdminGate><RolesPage /></AdminGate>} />
            <Route path="/checklist-management" element={<AdminGate><ChecklistManagement /></AdminGate>} />
            
            {/* First Entry Sub-Sub-Module Custom Routes (under Marine) */}
            <Route path="/:module/marine/first-entry/create" element={<CreateFirstEntry />} />
            <Route path="/:module/marine/first-entry/edit/:id" element={<CreateFirstEntry />} />
            <Route path="/:module/marine/first-entry/survey-booking/create" element={<CreateFirstEntrySurveyBooking />} />
            <Route path="/:module/marine/first-entry/survey-booking/edit/:id" element={<CreateFirstEntrySurveyBooking />} />
            <Route path="/:module/marine/first-entry/survey-report/create" element={<CreateFirstEntrySurveyReport />} />
            <Route path="/:module/marine/first-entry/survey-report/edit/:id" element={<CreateFirstEntrySurveyReport />} />
            <Route path="/:module/marine/first-entry/survey-report/full/:id" element={<FirstEntryFullReportPage />} />

            {/* Catch-all dynamic route for DB modules (supports unlimited nesting) */}
            <Route path="/:module" element={<GenericModulePage />} />
            <Route path="/:module/*" element={<GenericModulePage />} />
          </Routes>
        </AuthGate>
        <ToastContainer position="top-right" autoClose={4000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="colored" style={{ fontSize: '13px' }} />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
