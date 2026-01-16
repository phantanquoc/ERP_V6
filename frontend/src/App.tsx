import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedLayout from './components/ProtectedLayout';
import ProtectedSubRoute from './components/ProtectedSubRoute';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard1 from './pages/Dashboard1';

// Common Management
import CommonManagement from './pages/CommonManagement';

// Quality Management
import QualityManagement from './pages/QualityManagement';
import QualityPersonnel from './pages/quality/QualityPersonnel';
import QualityOffice from './pages/quality/QualityOffice';
import QualityProduction from './pages/quality/QualityProduction';
import QualityProcess from './pages/quality/QualityProcess';
import ProcessList from './pages/quality/ProcessList';

// General Management
import GeneralManagement from './pages/GeneralManagement';
import GeneralPricing from './pages/general/GeneralPricing';
import GeneralPartners from './pages/general/GeneralPartners';

// Business Management
import BusinessManagement from './pages/BusinessManagement';
import BusinessInternational from './pages/business/BusinessInternational';
import BusinessDomestic from './pages/business/BusinessDomestic';
import BusinessReport from './pages/BusinessReport';

// Accounting Management
import AccountingManagement from './pages/AccountingManagement';
import AccountingAdmin from './pages/accounting/AccountingAdmin';
import AccountingTax from './pages/accounting/AccountingTax';

// Purchasing Management
import PurchasingManagement from './pages/PurchasingManagement';
import PurchasingMaterials from './pages/purchasing/PurchasingMaterials';
import PurchasingEquipment from './pages/purchasing/PurchasingEquipment';

// Production Management
import ProductionManagement from './pages/ProductionManagement';
import ProductionDepartment from './pages/production/ProductionDepartment';
import ProductionWarehouse from './pages/production/ProductionWarehouse';

// Technical Management
import TechnicalManagement from './pages/TechnicalManagement';
import TechnicalQuality from './pages/technical/TechnicalQuality';
import TechnicalMechanical from './pages/technical/TechnicalMechanical';

function App() {
  return (
    <Router>
      <AuthProvider>
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
      </AuthProvider>
    </Router>
  );
}

export default App;


