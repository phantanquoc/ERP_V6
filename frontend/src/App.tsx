import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { usePermissionSync } from './hooks/usePermissionSync';
import { SystemSettingsProvider } from './contexts/SystemSettingsContext';
import ProtectedLayout from './components/ProtectedLayout';
import ProtectedSubRoute from './components/ProtectedSubRoute';
import ProtectedModuleRoute from './components/ProtectedModuleRoute';
import AdminRoute from './components/AdminRoute';
import Dashboard1 from './pages/Dashboard1';
import { usePageTitle } from './hooks/usePageTitle';

const Login = React.lazy(() => import('./pages/Login'));
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword'));
const LayoutLabelTool = React.lazy(() => import('./components/LayoutLabelTool'));

// Common Management
const CommonManagement = React.lazy(() => import('./pages/CommonManagement'));

// Quality Management
const QualityManagement = React.lazy(() => import('./pages/QualityManagement'));
const QualityPersonnel = React.lazy(() => import('./pages/quality/QualityPersonnel'));
const QualityOffice = React.lazy(() => import('./pages/quality/QualityOffice'));
const QualityProduction = React.lazy(() => import('./pages/quality/QualityProduction'));
const QualityProcess = React.lazy(() => import('./pages/quality/QualityProcess'));
const ProcessList = React.lazy(() => import('./pages/quality/ProcessList'));
const ProcessTypeSettings = React.lazy(() => import('./pages/quality/ProcessTypeSettings'));

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
const ProductionData = React.lazy(() => import('./pages/production/ProductionData'));
const ProductionWarehouse = React.lazy(() => import('./pages/production/ProductionWarehouse'));

// Technical Management
const TechnicalManagement = React.lazy(() => import('./pages/TechnicalManagement'));
const TechnicalQuality = React.lazy(() => import('./pages/technical/TechnicalQuality'));
const TechnicalProjects = React.lazy(() => import('./pages/technical/TechnicalProjects'));

// System Settings
const SystemSettingsPage = React.lazy(() => import('./pages/SystemSettingsPage'));

// Face Attendance
const FaceAdminPage = React.lazy(() => import('./pages/face/FaceAdminPage'));
const FaceKioskPage = React.lazy(() => import('./pages/face/FaceKioskPage'));
const FaceKioskPageV2 = React.lazy(() => import('./pages/face/FaceKioskPageV2'));
const FaceKioskPageV3 = React.lazy(() => import('./pages/face/FaceKioskPageV3'));

// Documentation
const DocumentationGuide = React.lazy(() => import('./pages/DocumentationGuide'));

// Evaluation Calibration
const EvaluationCalibrationPage = React.lazy(() => import('./pages/EvaluationCalibrationPage'));

// My History
const MyHistory = React.lazy(() => import('./pages/MyHistory'));

// My Notifications
const MyNotifications = React.lazy(() => import('./pages/MyNotifications'));

// Production Data Entry (tablet, full-screen)
const DataEntryHub = React.lazy(() => import('./pages/production/DataEntryHub'));
const ProductionDataEntry = React.lazy(() => import('./pages/production/ProductionDataEntry'));
const ProductionMaterialEvaluationEntry = React.lazy(() => import('./pages/production/ProductionMaterialEvaluationEntry'));
const ProductionSystemOperationEntry = React.lazy(() => import('./pages/production/ProductionSystemOperationEntry'));
const DataEntryPositionConfig = React.lazy(() => import('./pages/production/DataEntryPositionConfig'));
const RuleManagement = React.lazy(() => import('./pages/RuleManagement'));

function PageTitleUpdater() {
  usePageTitle();
  return null;
}

function PermissionSyncBridge() {
  usePermissionSync();
  return null;
}

function App() {
  return (
    <Router>
      <PageTitleUpdater />
      <AuthProvider>
        <PermissionSyncBridge />
        <SystemSettingsProvider>
        <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>}>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/diemdanh/nhanvien" element={<FaceKioskPage />} />
          <Route path="/diemdanh/nhanvien-v2" element={<FaceKioskPageV2 />} />
          <Route path="/diemdanh/nhanvien-v3" element={<FaceKioskPageV3 />} />

          {/* Dev tool — sắp xếp chữ trên bản đồ kho */}
          <Route path="/dev/layout-tool" element={<LayoutLabelTool />} />

          {/* Production data entry kiosk — full-screen (tablet), public with self-guard */}
          <Route path="/production/nhap-lieu-hub" element={<DataEntryHub />} />
          <Route path="/production/nhap-lieu" element={<ProductionDataEntry />} />
          <Route path="/production/nhap-lieu-danh-gia" element={<ProductionMaterialEvaluationEntry />} />
          <Route path="/production/nhap-lieu-van-hanh" element={<ProductionSystemOperationEntry />} />

          {/* Protected Routes — single Layout instance, never unmounts */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route element={<ProtectedLayout />}>
            <Route path="/dashboard" element={<Dashboard1 />} />

            {/* Common Management Routes */}
            <Route path="/common" element={
              <ProtectedModuleRoute module="common">
                <CommonManagement />
              </ProtectedModuleRoute>
            } />

            {/* Quality Management Routes */}
            <Route path="/quality" element={
              <ProtectedModuleRoute module="quality">
                <QualityManagement />
              </ProtectedModuleRoute>
            } />
            <Route path="/quality/personnel" element={
              <ProtectedSubRoute department="quality" subModule="personnel">
                <QualityPersonnel />
              </ProtectedSubRoute>
            } />
            <Route path="/quality/office" element={
              <ProtectedSubRoute department="quality" subModule="office">
                <QualityOffice />
              </ProtectedSubRoute>
            } />
            <Route path="/quality/production" element={
              <ProtectedSubRoute department="quality" subModule="production">
                <QualityProduction />
              </ProtectedSubRoute>
            } />
            <Route path="/quality/process" element={
              <ProtectedSubRoute department="quality" subModule="process">
                <QualityProcess />
              </ProtectedSubRoute>
            } />
            <Route path="/quality/process-types" element={
              <ProtectedSubRoute department="quality" subModule="process">
                <ProcessTypeSettings />
              </ProtectedSubRoute>
            } />
            <Route path="/quality/process-list" element={
              <ProtectedSubRoute department="quality" subModule="process">
                <ProcessList />
              </ProtectedSubRoute>
            } />

            {/* General Management Routes */}
            <Route path="/general" element={
              <ProtectedModuleRoute module="general">
                <GeneralManagement />
              </ProtectedModuleRoute>
            } />
            <Route path="/general/pricing" element={
              <ProtectedSubRoute department="general" subModule="pricing">
                <GeneralPricing />
              </ProtectedSubRoute>
            } />
            <Route path="/general/partners" element={
              <ProtectedSubRoute department="general" subModule="partners">
                <GeneralPartners />
              </ProtectedSubRoute>
            } />

            {/* Business Management Routes */}
            <Route path="/business" element={
              <ProtectedModuleRoute module="business">
                <BusinessReport />
              </ProtectedModuleRoute>
            } />
            <Route path="/business/management" element={
              <ProtectedSubRoute department="business" subModule="management">
                <BusinessManagement />
              </ProtectedSubRoute>
            } />
            <Route path="/business/international" element={
              <ProtectedSubRoute department="business" subModule="international">
                <BusinessInternational />
              </ProtectedSubRoute>
            } />
            <Route path="/business/domestic" element={
              <ProtectedSubRoute department="business" subModule="domestic">
                <BusinessDomestic />
              </ProtectedSubRoute>
            } />

            {/* Accounting Management Routes */}
            <Route path="/accounting" element={
              <ProtectedModuleRoute module="accounting">
                <AccountingManagement />
              </ProtectedModuleRoute>
            } />
            <Route path="/accounting/admin" element={
              <ProtectedSubRoute department="accounting" subModule="admin">
                <AccountingAdmin />
              </ProtectedSubRoute>
            } />
            <Route path="/accounting/tax" element={
              <ProtectedSubRoute department="accounting" subModule="tax">
                <AccountingTax />
              </ProtectedSubRoute>
            } />

            {/* Purchasing Management Routes */}
            <Route path="/purchasing" element={
              <ProtectedModuleRoute module="purchasing">
                <PurchasingManagement />
              </ProtectedModuleRoute>
            } />
            <Route path="/purchasing/materials" element={
              <ProtectedSubRoute department="purchasing" subModule="materials">
                <PurchasingMaterials />
              </ProtectedSubRoute>
            } />
            <Route path="/purchasing/equipment" element={
              <ProtectedSubRoute department="purchasing" subModule="equipment">
                <PurchasingEquipment />
              </ProtectedSubRoute>
            } />

            {/* Production Management Routes */}
            <Route path="/production" element={
              <ProtectedModuleRoute module="production">
                <ProductionManagement />
              </ProtectedModuleRoute>
            } />
            <Route path="/production/management" element={
              <ProtectedSubRoute department="production" subModule="management">
                <ProductionDepartment />
              </ProtectedSubRoute>
            } />
            <Route path="/production/data" element={
              <ProtectedSubRoute department="production" subModule="data">
                <ProductionData />
              </ProtectedSubRoute>
            } />
            <Route path="/production/warehouse" element={
              <ProtectedSubRoute department="production" subModule="warehouse">
                <ProductionWarehouse />
              </ProtectedSubRoute>
            } />

            {/* Technical Management Routes */}
            <Route path="/technical" element={
              <ProtectedModuleRoute module="technical">
                <TechnicalManagement />
              </ProtectedModuleRoute>
            } />
            <Route path="/technical/quality" element={
              <ProtectedSubRoute department="technical" subModule="quality">
                <TechnicalQuality />
              </ProtectedSubRoute>
            } />
            <Route path="/technical/mechanical" element={<Navigate to="/technical/quality?tab=repairAndFault" replace />} />
            <Route path="/technical/projects" element={
              <ProtectedSubRoute department="technical" subModule="projects">
                <TechnicalProjects />
              </ProtectedSubRoute>
            } />

            {/* System Settings (Admin Only) */}
            <Route path="/system-settings" element={
              <AdminRoute>
                <SystemSettingsPage />
              </AdminRoute>
            } />

            {/* Face Attendance Admin */}
            <Route path="/diemdanh/admin" element={
              <AdminRoute>
                <FaceAdminPage />
              </AdminRoute>
            } />

            {/* Production Data Entry — Admin preview and config */}
            <Route path="/production/tablet-hub-preview" element={
              <AdminRoute>
                <DataEntryHub />
              </AdminRoute>
            } />
            <Route path="/production/tablet-system-operation-preview" element={
              <AdminRoute>
                <ProductionSystemOperationEntry />
              </AdminRoute>
            } />
            <Route path="/production/data-entry-config" element={
              <AdminRoute>
                <DataEntryPositionConfig />
              </AdminRoute>
            } />

            {/* Documentation Guide */}
            <Route path="/huong-dan" element={<DocumentationGuide />} />

            {/* Rule Management — ADMIN only */}
            <Route path="/admin/rules" element={
              <AdminRoute>
                <RuleManagement />
              </AdminRoute>
            } />

            {/* My History */}
            <Route path="/my-history" element={<MyHistory />} />

            {/* My Notifications */}
            <Route path="/my-notifications" element={<MyNotifications />} />

            {/* Evaluation Calibration — ADMIN and DEPARTMENT_HEAD only */}
            <Route path="/dashboard/evaluation-calibration" element={<EvaluationCalibrationPage />} />
          </Route>
        </Routes>
        </Suspense>
        </SystemSettingsProvider>
      </AuthProvider>
      {/* z-index above modal overlay (Modal uses z-[9999]) so toasts are never hidden behind a form */}
      <Toaster position="top-right" containerStyle={{ zIndex: 10000 }} />
    </Router>
  );
}

export default App;
