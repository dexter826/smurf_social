import React, { useState } from 'react';
import { ReportsView } from '../components/admin/ReportsView';
import { ReportDetailModal } from '../components/admin/ReportDetailModal';

const AdminReportsPage: React.FC = () => {
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  return (
    <div className="h-full relative overflow-hidden">
      <ReportsView onSelectReport={setSelectedReportId} />
      
      {selectedReportId && (
        <ReportDetailModal 
          reportId={selectedReportId} 
          onClose={() => setSelectedReportId(null)} 
        />
      )}
    </div>
  );
};

export default AdminReportsPage;
