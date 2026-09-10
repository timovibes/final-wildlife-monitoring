import React from 'react';
import { LogOut, User, Menu } from 'lucide-react';
import authService from '../../services/auth';

const Navbar = ({ user, onMenuToggle }) => {
  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      authService.logout();
    }
  };

  return (
    <nav className="bg-ops border-b border-ops-line sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <button
              onClick={onMenuToggle}
              className="lg:hidden mr-4 text-steel/60 hover:text-steel"
              aria-label="Toggle menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 border border-cyan flex items-center justify-center rotate-45 flex-shrink-0">
                <span className="-rotate-45 font-display font-bold text-[11px] text-cyan">
                  NP
                </span>
              </div>
              <div>
                <h1 className="font-display font-semibold text-[15px] tracking-wide leading-none">
                  NAIROBI NP MONITOR
                </h1>
                <p className="font-mono text-[10px] uppercase tracking-widest text-steel/50 mt-1">
                  Wildlife &amp; Biodiversity System
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-steel leading-none">
                  {user?.firstName} {user?.lastName}
                </p>
                <span className="inline-block mt-1.5 font-mono text-[10px] tracking-widest uppercase text-cyan border border-cyan-dim px-1.5 py-0.5">
                  {user?.role}
                </span>
              </div>
              <div className="h-9 w-9 border border-ops-line bg-ops-surface flex items-center justify-center">
                <User className="h-4 w-4 text-steel/70" />
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 border border-signal text-signal font-mono text-xs uppercase tracking-widest px-3 py-2 hover:bg-signal hover:text-ops transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;