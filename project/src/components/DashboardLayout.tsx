import { useAuth } from '@/contexts/AuthContext';
import { Wrench, Package, Truck, ShieldCheck, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  navItems: { id: string; label: string; icon: React.ReactNode }[];
  activeTab: string;
  onTabChange: (id: string) => void;
  accentColor: 'orange' | 'blue' | 'green' | 'slate';
}

const ACCENT = {
  orange: { bg: 'bg-orange-500', text: 'text-orange-600', border: 'border-orange-500', light: 'bg-orange-50' },
  blue: { bg: 'bg-blue-600', text: 'text-blue-600', border: 'border-blue-500', light: 'bg-blue-50' },
  green: { bg: 'bg-green-600', text: 'text-green-600', border: 'border-green-500', light: 'bg-green-50' },
  slate: { bg: 'bg-slate-700', text: 'text-slate-700', border: 'border-slate-500', light: 'bg-slate-100' },
};

const ROLE_ICON = {
  mechanic: <Wrench className="w-5 h-5" />,
  supplier: <Package className="w-5 h-5" />,
  delivery: <Truck className="w-5 h-5" />,
  admin: <ShieldCheck className="w-5 h-5" />,
};

const ROLE_LABEL = {
  mechanic: 'Mécanicien',
  supplier: 'Fournisseur',
  delivery: 'Livreur',
  admin: 'Administrateur',
};

export default function DashboardLayout({ children, navItems, activeTab, onTabChange, accentColor }: DashboardLayoutProps) {
  const { profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const accent = ACCENT[accentColor];

  const role = profile?.role ?? 'mechanic';

  return (
    <div className="min-h-screen flex">
      {/* Sidebar - desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 shrink-0">
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 ${accent.bg} rounded-lg flex items-center justify-center text-white`}>
              {ROLE_ICON[role]}
            </div>
            <div>
              <div className="font-bold text-slate-800 leading-tight">MecaPieces</div>
              <div className="text-xs text-slate-400">{ROLE_LABEL[role]}</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold text-black transition-colors ${
                activeTab === item.id
                  ? `${accent.light}`
                  : 'hover:bg-slate-50'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-100">
          <div className="px-3 py-2 mb-1">
            <div className="text-sm font-medium text-slate-700 truncate">{profile?.role === 'admin' ? profile?.full_name : profile?.anonymous_reference}</div>
            <div className="text-xs text-slate-400 truncate">{ROLE_LABEL[role]}</div>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-slate-200 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 ${accent.bg} rounded-lg flex items-center justify-center text-white`}>
            {ROLE_ICON[role]}
          </div>
          <span className="font-bold text-slate-800">MecaPieces</span>
        </div>
        <button onClick={() => setMobileOpen(true)} className="p-2 -mr-2 text-slate-600">
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 bg-white drawer-panel flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 ${accent.bg} rounded-lg flex items-center justify-center text-white`}>
                  {ROLE_ICON[role]}
                </div>
                <div>
                  <div className="font-bold text-slate-800 leading-tight">MecaPieces</div>
                  <div className="text-xs text-slate-400">{ROLE_LABEL[role]}</div>
                </div>
              </div>
              <button onClick={() => setMobileOpen(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => { onTabChange(item.id); setMobileOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold text-black transition-colors ${
                    activeTab === item.id ? `${accent.light}` : 'hover:bg-slate-50'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </nav>
            <div className="p-3 border-t border-slate-100">
              <div className="px-3 py-2 mb-1">
                <div className="text-sm font-medium text-slate-700 truncate">{profile?.role === 'admin' ? profile?.full_name : profile?.anonymous_reference}</div>
                <div className="text-xs text-slate-400 truncate">{ROLE_LABEL[role]}</div>
              </div>
              <button
                onClick={signOut}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Déconnexion
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 min-w-0 pt-14 lg:pt-0">
        <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
