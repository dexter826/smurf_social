import React, { useState } from 'react';
import { ReportsView } from '../components/admin/ReportsView';
import { ReportDetailOverlay } from '../components/admin/ReportDetailOverlay';

const AdminReportsPage: React.FC = () => {
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  return (
    <div className="h-full relative overflow-hidden">
      <ReportsView onSelectReport={setSelectedReportId} />
      
      {selectedReportId && (
        <ReportDetailOverlay 
          reportId={selectedReportId} 
          onClose={() => setSelectedReportId(null)} 
        />
      )}
    </div>
  );
};

export default AdminReportsPage;
