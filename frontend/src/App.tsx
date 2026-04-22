import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SystemSettingsProvider } from './contexts/SystemSettingsContext';
import ProtectedLayout from './components/ProtectedLayout';
import ProtectedSubRoute from './components/ProtectedSubRoute';
import Dashboard1 from './pages/Dashboard1';

const Login = React.lazy(() => import('./pages/Login'));
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword'));

// Common Management
const CommonManagement = React.lazy(() => import('./pages/CommonManagement'));

// Quality Management
const QualityManagement = React.lazy(() => import('./pages/QualityManagement'));
const QualityPersonnel = React.lazy(() => import('./pages/quality/QualityPersonnel'));
const QualityOffice = React.lazy(() => import('./pages/quality/QualityOffice'));
const QualityProduction = React.lazy(() => import('./pages/quality/QualityProduction'));
const QualityProcess = React.lazy(() => import('./pages/quality/QualityProcess'));
const ProcessList = React.lazy(() => import('./pages/quality/ProcessList'));

// General Management
const GeneralManagement = React.lazy(() => import('./pages/GeneralManagement'));
const GeneralPricing = React.lazy(() => import('./pages/general/GeneralPricing'));
const GeneralPartners = React.lazy(() => import('./pages/general/GeneralPartners'));

// Business Management
const BusinessManagement = React.lazy(() => import('./pages/BusinessManagement'));
const BusinessInternational = React.lazy(() => import('./pages/business/BusinessInternational'));
const BusinessDomestic = React.lazy(() => import('./pages/business/BusinessDomestic'));
const BusinessReport = React.lazy(() => import('./pages/BusinessReport'));

// Accounting Management
const AccountingManagement = React.lazy(() => import('./pages/AccountingManagement'));
const AccountingAdmin = React.lazy(() => import('./pages/accounting/AccountingAdmin'));
const AccountingTax = React.lazy(() => import('./pages/accounting/AccountingTax'));

// Purchasing Management
const PurchasingManagement = React.lazy(() => import('./pages/PurchasingManagement'));
const PurchasingMaterials = React.lazy(() => import('./pages/purchasing/PurchasingMaterials'));
const PurchasingEquipment = React.lazy(() => import('./pages/purchasing/PurchasingEquipment'));

// Production Management
const ProductionManagement = React.lazy(() => import('./pages/ProductionManagement'));
const ProductionDepartment = React.lazy(() => import('./pages/production/ProductionDepartment'));
const ProductionWarehouse = React.lazy(() => import('./pages/production/ProductionWarehouse'));
const ProductionData = React.lazy(() => import('./pages/production/ProductionData'));

// Technical Management
const TechnicalManagement = React.lazy(() => import('./pages/TechnicalManagement'));
const TechnicalQuality = React.lazy(() => import('./pages/technical/TechnicalQuality'));
const TechnicalMechanical = React.lazy(() => import('./pages/technical/TechnicalMechanical'));

// System Settings
const SystemSettingsPage = React.lazy(() => import('./pages/SystemSettingsPage'));

// Face Attendance
const FaceAdminPage = React.lazy(() => import('./pages/face/FaceAdminPage'));
const FaceKioskPage = React.lazy(() => import('./pages/face/FaceKioskPage'));

function App() {
  return (
    <Router>
      <AuthProvider>
        <SystemSettingsProvider>
        <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>}>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/diemdanh/nhanvien" element={<FaceKioskPage />} />

          {/* Protected Routes — single Layout instance, never unmounts */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route element={<ProtectedLayout />}>
            <Route path="/dashboard" element={<Dashboard1 />} />

            {/* Common Management Routes */}
            <Route path="/common" element={<CommonManagement />} />

            {/* Quality Management Routes */}
            <Route path="/quality" element={<QualityManagement />} />
            <Route path="/quality/personnel" element={
              <ProtectedSubRoute department="quality" subModule="personnel">
                <QualityPersonnel />
              </ProtectedSubRoute>
            } />
            <Route path="/quality/office" element={<QualityOffice />} />
            <Route path="/quality/production" element={<QualityProduction />} />
            <Route path="/quality/process" element={
              <ProtectedSubRoute department="quality" subModule="process">
                <QualityProcess />
              </ProtectedSubRoute>
            } />
            <Route path="/quality/process-list" element={
              <ProtectedSubRoute department="quality" subModule="process">
                <ProcessList />
              </ProtectedSubRoute>
            } />

            {/* General Management Routes */}
            <Route path="/general" element={<GeneralManagement />} />
            <Route path="/general/pricing" element={<GeneralPricing />} />
            <Route path="/general/partners" element={<GeneralPartners />} />

            {/* Business Management Routes */}
            <Route path="/business" element={<BusinessReport />} />
            <Route path="/business/management" element={<BusinessManagement />} />
            <Route path="/business/international" element={<BusinessInternational />} />
            <Route path="/business/domestic" element={<BusinessDomestic />} />

            {/* Accounting Management Routes */}
            <Route path="/accounting" element={<AccountingManagement />} />
            <Route path="/accounting/admin" element={<AccountingAdmin />} />
            <Route path="/accounting/tax" element={<AccountingTax />} />

            {/* Purchasing Management Routes */}
            <Route path="/purchasing" element={<PurchasingManagement />} />
            <Route path="/purchasing/materials" element={<PurchasingMaterials />} />
            <Route path="/purchasing/equipment" element={<PurchasingEquipment />} />

            {/* Production Management Routes */}
            <Route path="/production" element={<ProductionManagement />} />
            <Route path="/production/management" element={<ProductionDepartment />} />
            <Route path="/production/warehouse" element={<ProductionWarehouse />} />
            <Route path="/production/data" element={<ProductionData />} />

            {/* Technical Management Routes */}
            <Route path="/technical" element={<TechnicalManagement />} />
            <Route path="/technical/quality" element={<TechnicalQuality />} />
            <Route path="/technical/mechanical" element={<TechnicalMechanical />} />

            {/* System Settings (Admin Only) */}
            <Route path="/system-settings" element={<SystemSettingsPage />} />

            {/* Face Attendance Admin */}
            <Route path="/diemdanh/admin" element={<FaceAdminPage />} />
          </Route>
        </Routes>
        </Suspense>
        </SystemSettingsProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
