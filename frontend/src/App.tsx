import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedLayout from './components/ProtectedLayout';
import ProtectedSubRoute from './components/ProtectedSubRoute';

const Login = React.lazy(() => import('./pages/Login'));
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword'));
const Dashboard1 = React.lazy(() => import('./pages/Dashboard1'));

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

// Technical Management
const TechnicalManagement = React.lazy(() => import('./pages/TechnicalManagement'));
const TechnicalQuality = React.lazy(() => import('./pages/technical/TechnicalQuality'));
const TechnicalMechanical = React.lazy(() => import('./pages/technical/TechnicalMechanical'));

function App() {
  return (
    <Router>
      <AuthProvider>
        <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>}>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Protected Routes */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={
            <ProtectedLayout>
              <Dashboard1 />
            </ProtectedLayout>
          } />

          {/* Common Management Routes */}
          <Route path="/common" element={<ProtectedLayout><CommonManagement /></ProtectedLayout>} />

          {/* Quality Management Routes */}
          <Route path="/quality" element={<ProtectedLayout><QualityManagement /></ProtectedLayout>} />
          <Route path="/quality/personnel" element={
            <ProtectedLayout>
              <ProtectedSubRoute department="quality" subModule="personnel">
                <QualityPersonnel />
              </ProtectedSubRoute>
            </ProtectedLayout>
          } />
          <Route path="/quality/office" element={<ProtectedLayout><QualityOffice /></ProtectedLayout>} />
          <Route path="/quality/production" element={<ProtectedLayout><QualityProduction /></ProtectedLayout>} />
          <Route path="/quality/process" element={
            <ProtectedLayout>
              <ProtectedSubRoute department="quality" subModule="process">
                <QualityProcess />
              </ProtectedSubRoute>
            </ProtectedLayout>
          } />
          <Route path="/quality/process-list" element={
            <ProtectedLayout>
              <ProtectedSubRoute department="quality" subModule="process">
                <ProcessList />
              </ProtectedSubRoute>
            </ProtectedLayout>
          } />

          {/* General Management Routes */}
          <Route path="/general" element={<ProtectedLayout><GeneralManagement /></ProtectedLayout>} />
          <Route path="/general/pricing" element={<ProtectedLayout><GeneralPricing /></ProtectedLayout>} />
          <Route path="/general/partners" element={<ProtectedLayout><GeneralPartners /></ProtectedLayout>} />

          {/* Business Management Routes */}
          <Route path="/business" element={<ProtectedLayout><BusinessReport /></ProtectedLayout>} />
          <Route path="/business/management" element={<ProtectedLayout><BusinessManagement /></ProtectedLayout>} />
          <Route path="/business/international" element={<ProtectedLayout><BusinessInternational /></ProtectedLayout>} />
          <Route path="/business/domestic" element={<ProtectedLayout><BusinessDomestic /></ProtectedLayout>} />

          {/* Accounting Management Routes */}
          <Route path="/accounting" element={<ProtectedLayout><AccountingManagement /></ProtectedLayout>} />
          <Route path="/accounting/admin" element={<ProtectedLayout><AccountingAdmin /></ProtectedLayout>} />
          <Route path="/accounting/tax" element={<ProtectedLayout><AccountingTax /></ProtectedLayout>} />

          {/* Purchasing Management Routes */}
          <Route path="/purchasing" element={<ProtectedLayout><PurchasingManagement /></ProtectedLayout>} />
          <Route path="/purchasing/materials" element={<ProtectedLayout><PurchasingMaterials /></ProtectedLayout>} />
          <Route path="/purchasing/equipment" element={<ProtectedLayout><PurchasingEquipment /></ProtectedLayout>} />

          {/* Production Management Routes */}
          <Route path="/production" element={<ProtectedLayout><ProductionManagement /></ProtectedLayout>} />
          <Route path="/production/management" element={<ProtectedLayout><ProductionDepartment /></ProtectedLayout>} />
          <Route path="/production/warehouse" element={<ProtectedLayout><ProductionWarehouse /></ProtectedLayout>} />

          {/* Technical Management Routes */}
          <Route path="/technical" element={<ProtectedLayout><TechnicalManagement /></ProtectedLayout>} />
          <Route path="/technical/quality" element={<ProtectedLayout><TechnicalQuality /></ProtectedLayout>} />
          <Route path="/technical/mechanical" element={<ProtectedLayout><TechnicalMechanical /></ProtectedLayout>} />
        </Routes>
        </Suspense>
      </AuthProvider>
    </Router>
  );
}

export default App;


