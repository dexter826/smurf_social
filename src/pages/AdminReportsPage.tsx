import React, { useState } from 'react';
import { ReportsView } from '../components/admin/ReportsView';
import { ReportDetailModal } from '../components/admin/ReportDetailModal';
import { useAuthStore } from '../store/authStore';
import { Skeleton } from '../components/ui';

const AdminReportsPage: React.FC = () => {
  const { user, isInitialized } = useAuthStore();
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  if (!isInitialized) {
    return (
      <div className="p-6 space-y-6 bg-bg-secondary/20 h-full">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-20 w-full rounded-2xl" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') return null;

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
