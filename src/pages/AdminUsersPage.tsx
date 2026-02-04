import React from 'react';
import { UsersView } from '../components/admin/UsersView';

const AdminUsersPage: React.FC = () => {
  return (
    <div className="h-full overflow-hidden">
      <UsersView />
    </div>
  );
};

export default AdminUsersPage;
