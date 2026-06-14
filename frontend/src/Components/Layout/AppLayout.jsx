import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const AppLayout = () => {
  return (
    <div className="flex h-screen bg-bgDark overflow-hidden text-textLight">
      <Sidebar />
      <main className="flex-1 overflow-y-auto relative">
        <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
