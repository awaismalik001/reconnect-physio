import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, UserRound, CalendarDays,
  ClipboardList, DollarSign, LogOut, Activity, Settings, X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/patients', label: 'Patients', icon: Users },
  { to: '/doctors', label: 'Doctors', icon: UserRound },
  { to: '/appointments', label: 'Appointments', icon: CalendarDays },
  { to: '/sessions', label: 'Sessions', icon: ClipboardList },
  { to: '/finance', label: 'Finance', icon: DollarSign },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ isOpen, onClose }) {
  const { logout, admin } = useAuth();

  return (
    <div
      className={`fixed top-0 left-0 h-screen w-64 bg-blue-800 text-white flex flex-col z-50 shadow-xl transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Logo & Mobile Close */}
      <div className="px-6 py-5 border-b border-blue-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
            <Activity className="w-6 h-6 text-blue-700" />
          </div>
          <div>
            <h1 className="font-bold text-sm leading-tight">Reconnect</h1>
            <p className="text-blue-300 text-xs">Physiotherapy Center</p>
          </div>
        </div>
        {/* Mobile close button */}
        <button
          onClick={onClose}
          aria-label="Close menu"
          className="lg:hidden p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-blue-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={() => onClose && onClose()}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-white text-blue-800 shadow-md'
                  : 'text-blue-100 hover:bg-blue-700 hover:text-white'
              }`
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Admin info + Logout */}
      <div className="px-4 py-4 border-t border-blue-700">
        <div className="px-4 py-3 mb-2">
          <p className="text-xs text-blue-300">Logged in as</p>
          <p className="text-sm font-semibold truncate">{admin?.name || 'Admin'}</p>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-blue-100 hover:bg-red-600 hover:text-white transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </div>
  );
}
