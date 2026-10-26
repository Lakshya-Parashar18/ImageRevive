import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Search,
  Sliders,
  Filter,
  Wrench,
  Layers,
  History,
  BookOpen,
  Image as ImageIcon,
  Menu,
  X,
} from 'lucide-react';
import { useImage } from '../../contexts/ImageContext';
import { useTheme } from '../../contexts/ThemeContext';

const NAV_ITEMS = [
  { name: 'Home', path: '/', icon: LayoutDashboard },
  { name: 'Image Inspector', path: '/inspector', icon: Search },
  { name: 'Enhance', path: '/enhancement', icon: Sliders },
  { name: 'Filters', path: '/filtering', icon: Filter },
  { name: 'Restore', path: '/restoration', icon: Wrench },
  { name: 'Compare', path: '/arena', icon: Layers },
  { name: 'History', path: '/history', icon: History },
  { name: 'Processing Guide', path: '/guide', icon: BookOpen },
];

export const Sidebar: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { sampleImages, loadSample, activeImage, backendHealthy } = useImage();
  const { resolvedTheme } = useTheme();

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed bottom-5 right-5 z-50 p-3 rounded-full bg-accent text-surface shadow-lg hover:bg-accent-hover transition-colors"
        aria-label="Toggle Navigation Menu"
      >
        {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Backdrop for mobile */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 w-64 bg-sidebar border-r border-border z-40 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-border/80 bg-black shadow-xs shrink-0 flex items-center justify-center">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-cover select-none" />
            </div>
            <div className="flex flex-col justify-center">
              <div className="h-6 flex items-center">
                <img
                  src={resolvedTheme === 'dark' ? '/revive-wordmark-light.png' : '/revive-wordmark-dark.png'}
                  alt="REVIVE"
                  className="h-6 w-auto max-w-[120px] object-contain select-none"
                />
              </div>
              <span className="block text-[10px] uppercase font-mono tracking-wider text-accent font-semibold leading-none mt-0.5">
                IMAGE WORKSPACE
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-mono uppercase text-muted tracking-wider">
            Workspaces
          </div>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-elevated text-accent border border-border shadow-xs'
                      : 'text-secondary hover:text-primary hover:bg-surface/50'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </div>
              </NavLink>
            );
          })}

          {/* Sample Images Section */}
          {sampleImages.length > 0 && (
            <div className="pt-6">
              <div className="px-3 pb-2 text-[11px] font-mono uppercase text-muted tracking-wider flex items-center justify-between">
                <span>TRY A SAMPLE</span>
                <ImageIcon className="w-3.5 h-3.5" />
              </div>
              <div className="space-y-1">
                {sampleImages.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      loadSample(s.id);
                      setMobileOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-md text-xs transition-colors flex items-center justify-between ${
                      activeImage?.filename === `${s.id}.png`
                        ? 'bg-accent/10 text-accent font-medium'
                        : 'text-secondary hover:text-primary hover:bg-surface/40'
                    }`}
                  >
                    <span className="truncate pr-2">{s.title.split('&')[0]}</span>
                    <span className="text-[9px] font-mono text-muted shrink-0">{s.category}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Workspace Status Card */}
        <div className="p-4 border-t border-border bg-surface/30">
          <div className="rounded-md p-2.5 bg-elevated border border-border text-[11px] text-muted space-y-1.5">
            <div className="font-semibold text-primary flex items-center justify-between">
              <span className="tracking-wide uppercase text-[10px] font-mono">LOCAL WORKSPACE</span>
              <span className={`inline-flex items-center gap-1 font-mono text-[10px] ${backendHealthy ? 'text-success' : 'text-error'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${backendHealthy ? 'bg-success animate-pulse' : 'bg-error'}`} />
                {backendHealthy ? 'Engine Active' : 'Engine Offline'}
              </span>
            </div>
            <p className="leading-tight text-secondary">
              Processed through your local image engine. Your images stay on this device during your active session.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
