import { useState, useEffect } from "react";
import { NavLink, Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useBranding } from "../../contexts/BrandingContext";

function BrandIcon({ icon, className }: { icon: string; className: string }) {
  if (icon.startsWith("data:image/") || icon.startsWith("http")) {
    return <img src={icon} alt="App icon" className={`object-contain rounded ${className}`} />;
  }
  return <span className={className}>{icon}</span>;
}

const NAV = [
  { to: "/recipes", label: "Recipes", icon: "📖" },
  { to: "/stores", label: "Stores", icon: "🏪" },
  { to: "/shopping-lists", label: "Shopping Lists", icon: "🛒" },
];

const ADMIN_NAV = [
  { to: "/admin/users", label: "User Management", icon: "👥" },
  { to: "/admin/debug", label: "Parse Debugger", icon: "🔍" },
];

function Sidebar({ onClose }: { onClose?: () => void }) {
  const { user, logout } = useAuth();
  const { branding } = useBranding();
  const isAdmin = user?.role === "admin";

  return (
    <aside className="flex flex-col h-full w-64 bg-gray-900 border-r border-gray-800">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-gray-800 shrink-0">
        <Link to="/recipes" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <BrandIcon icon={branding.app_icon} className="text-2xl w-8 h-8" />
          <span className="font-bold text-gray-100 text-lg">{branding.app_name}</span>
        </Link>
        {onClose && (
          <button onClick={onClose} className="text-gray-600 hover:text-gray-300 md:hidden">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-green-900/50 text-green-400"
                  : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
              }`
            }
          >
            <span className="text-base">{icon}</span>
            {label}
          </NavLink>
        ))}
        {isAdmin && (
          <>
            <div className="pt-3 pb-1 px-3">
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Admin</span>
            </div>
            {ADMIN_NAV.map(({ to, label, icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-green-900/50 text-green-400"
                      : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                  }`
                }
              >
                <span className="text-base">{icon}</span>
                {label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t border-gray-800 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-gray-600 truncate">{user?.email}</p>
          {user?.has_claude_key && (
            <span className="text-xs text-green-500" title="Claude AI enabled">✨</span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `text-sm transition-colors ${isActive ? "text-green-400" : "text-gray-500 hover:text-gray-300"}`
            }
          >
            Settings
          </NavLink>
          <button
            onClick={logout}
            className="text-sm text-gray-600 hover:text-red-400 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}

export default function Layout() {
  const location = useLocation();
  const { branding } = useBranding();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close mobile sidebar on navigation
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950">
      {/* Desktop sidebar — always visible */}
      <div className="hidden md:flex shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar — slide-over */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-40 flex md:hidden">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </>
      )}

      {/* Content */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile top bar */}
        <header className="flex items-center gap-3 px-4 py-3 bg-gray-900 border-b border-gray-800 md:hidden shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-400 hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
            aria-label="Open menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link to="/recipes" className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
            <BrandIcon icon={branding.app_icon} className="text-lg w-6 h-6" />
            <span className="font-semibold text-gray-100 text-sm">{branding.app_name}</span>
          </Link>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
