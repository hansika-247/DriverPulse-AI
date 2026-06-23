import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const Ambient3DBackground = React.lazy(() => import('./Ambient3DBackground'));

const AppLayout = () => {
  return (
    <div className="flex h-screen bg-transparent overflow-hidden text-textLight relative">
      <Suspense fallback={null}>
        <Ambient3DBackground />
      </Suspense>
      <div className="flex h-screen w-full relative z-10">
        <Sidebar />
        <main className="flex-1 overflow-y-auto relative bg-transparent">
          <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
