import { useState } from 'react';
import { Menu, Activity } from 'lucide-react';
import Sidebar from './Sidebar';

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Mobile Top Navigation Bar */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-blue-800 text-white z-40 px-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <Activity className="w-5 h-5 text-blue-700" />
          </div>
          <span className="font-bold text-sm tracking-wide">Reconnect Physio</span>
        </div>
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
          className="p-2 rounded-lg hover:bg-blue-700 transition-colors text-white focus:outline-hidden"
        >
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {/* Backdrop overlay for mobile drawer */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Responsive Sidebar Drawer */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <main className="flex-1 w-full min-w-0 lg:ml-64 p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
