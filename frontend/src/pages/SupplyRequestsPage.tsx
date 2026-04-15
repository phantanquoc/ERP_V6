import React from 'react';
import SupplyRequestManagement from '../components/SupplyRequestManagement';

const SupplyRequestsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6 rounded-lg">
        <h1 className="text-2xl font-bold">Danh sách yêu cầu bổ sung/cung cấp</h1>
        <p className="text-emerald-100 mt-2">
          Vật tư và thiết bị đi theo luồng mua hàng/kho. Yêu cầu nhân lực được tách riêng và không đi qua mua hàng/kho.
        </p>
      </div>

      <SupplyRequestManagement />
    </div>
  );
};

export default SupplyRequestsPage;
