import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTheme } from '../../ThemeContext';
import { useAuth } from '../../AuthContext';
import {
  LayoutDashboard,
  User,
  Car,
  AlertTriangle,
  Map,
  BrainCircuit,
  MessageSquare,
  Settings,
  Moon,
  Sun,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
  Trophy,
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard',       path: '/',          icon: LayoutDashboard },
  { name: 'Driver Profile',  path: '/profile',   icon: User },
  { name: 'Trip Summary',    path: '/trips',      icon: Car },
  { name: 'Flagged Moments', path: '/flags',      icon: AlertTriangle },
  { name: 'Route Analytics', path: '/routes',     icon: Map },
  { name: 'AI Insights',     path: '/insights',   icon: BrainCircuit },
  { name: 'Leaderboard',     path: '/leaderboard',icon: Trophy },
  { name: 'AI Assistant',    path: '/assistant',  icon: MessageSquare },
  { name: 'Settings',        path: '/settings',   icon: Settings },
];

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { driver, logout } = useAuth();
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  // Driver initials for avatar
  const initials = driver?.name
    ? driver.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : 'DP';

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 80 : 260 }}
      className="h-screen bg-cardDark border-r border-white/10 flex flex-col justify-between sticky top-0 transition-all duration-300 z-50 shadow-xl"
    >
      <div className="p-4 flex flex-col h-full">
        {/* ── Logo ── */}
        <div className="flex items-center justify-between mb-6 px-2">
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xl font-bold bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent"
            >
              Driver Pulse
            </motion.div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg hover:bg-white/5 text-textLight/70 hover:text-textLight transition-colors"
          >
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        {/* ── Driver identity card ── */}
        {driver && (
          <div
            className={`mb-6 rounded-xl p-3 border border-white/5 bg-white/5 transition-all ${
              isCollapsed ? 'flex justify-center' : 'flex items-center gap-3'
            }`}
          >
            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {initials}
            </div>

            {!isCollapsed && (
              <div className="min-w-0">
                <p className="text-textLight font-semibold text-sm truncate">{driver.name}</p>
                <p className="text-primary text-xs font-mono font-medium">{driver.driverId}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Navigation ── */}
        <nav className="flex-1 space-y-1 overflow-y-auto hide-scrollbar">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `
                flex items-center px-3 py-2.5 rounded-xl transition-all duration-200 group relative
                ${isActive
                  ? 'bg-primary/10 text-primary font-medium border border-primary/20'
                  : 'text-textLight/70 hover:bg-white/5 hover:text-textLight'
                }
              `}
            >
              <item.icon size={20} className="min-w-[20px]" />
              {!isCollapsed && <span className="ml-3 truncate text-sm">{item.name}</span>}
              {isCollapsed && (
                <div className="absolute left-full ml-3 px-2 py-1 bg-cardDark border border-white/10 rounded text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-lg">
                  {item.name}
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* ── Bottom actions ── */}
        <div className="mt-auto pt-4 border-t border-white/10 space-y-1">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center px-3 py-2.5 rounded-xl text-textLight/70 hover:bg-white/5 hover:text-textLight transition-colors group relative"
          >
            {isDark
              ? <Sun size={20} className="min-w-[20px]" />
              : <Moon size={20} className="min-w-[20px]" />
            }
            {!isCollapsed && <span className="ml-3 text-sm">Toggle Theme</span>}
            {isCollapsed && (
              <div className="absolute left-full ml-3 px-2 py-1 bg-cardDark border border-white/10 rounded text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-lg">
                Toggle Theme
              </div>
            )}
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-3 py-2.5 rounded-xl text-danger/70 hover:bg-danger/10 hover:text-danger transition-colors group relative"
          >
            <LogOut size={20} className="min-w-[20px]" />
            {!isCollapsed && <span className="ml-3 text-sm">Logout</span>}
            {isCollapsed && (
              <div className="absolute left-full ml-3 px-2 py-1 bg-cardDark border border-white/10 rounded text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-lg">
                Logout
              </div>
            )}
          </button>
        </div>
      </div>
    </motion.aside>
  );
};

export default Sidebar;
