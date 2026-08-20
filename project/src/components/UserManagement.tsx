import { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Profile, Role, Request, Offer, GarageProfile, SupplierProfile } from '@/lib/database.types';
import {
  Search, UserPlus, Pencil, KeyRound, Power, Trash2, X, Filter, Users, Package, Truck, ShieldCheck, ArrowLeft,
  MapPin, Phone, Calendar, Tag, LogIn,
} from 'lucide-react';
import { getErrorMessage } from '@/lib/errors';
import { IMPERSONATION_STORAGE_KEY } from '@/components/ImpersonationBanner';
import { useLanguage } from '@/contexts/LanguageContext';

const ROLE_ICONS: Record<string, React.ReactNode> = {
  mechanic: <Users className="w-4 h-4" />,
  supplier: <Package className="w-4 h-4" />,
  delivery: <Truck className="w-4 h-4" />,
  admin: <ShieldCheck className="w-4 h-4" />,
};

const ROLE_ORDER: Role[] = ['mechanic', 'supplier', 'delivery', 'admin'];

const ADMIN_FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users`;

function getAuthHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  };
}

async function callAdminFn(body: Record<string, unknown>, token: string) {
  const res = await fetch(ADMIN_FN_URL, {
    method: 'POST',
    headers: { ...getAuthHeaders(), Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Erreur');
  return json;
}

interface UserManagementProps {
  profiles: Profile[];
  onRefresh: () => void;
}

export default function UserManagement({ profiles, onRefresh }: UserManagementProps) {
  const { profile: currentAdmin } = useAuth();
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [resetting, setResetting] = useState<Profile | null>(null);
  const [viewing, setViewing] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return profiles.filter(p => {
      if (roleFilter !== 'all' && p.role !== roleFilter) return false;
      if (statusFilter === 'active' && !p.is_active) return false;
      if (statusFilter === 'inactive' && p.is_active) return false;
      if (q) {
        const hay = `${p.first_name} ${p.last_name} ${p.login_id ?? ''} ${p.anonymous_reference ?? ''} ${p.phone} ${p.city}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [profiles, search, roleFilter, statusFilter]);

  const groupedByRole = useMemo(() => {
    const map = new Map<Role, Profile[]>();
    for (const role of ROLE_ORDER) map.set(role, []);
    for (const p of filtered) map.get(p.role)?.push(p);
    return map;
  }, [filtered]);

  const getToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? '';
  };

  const handleToggleActive = async (p: Profile) => {
    setBusy(true); setError(''); setSuccess('');
    try {
      await callAdminFn({ action: 'toggle_active', user_id: p.id, is_active: !p.is_active }, await getToken());
      setSuccess(`${p.login_id} ${p.is_active ? t('userManagement.toggleDeactivated') : t('userManagement.toggleActivated')}`);
      onRefresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('userManagement.errors.generic'));
    } finally { setBusy(false); }
  };

  const handleDelete = async (p: Profile) => {
    if (!window.confirm(`${t('userManagement.confirmDeletePrefix')}${p.login_id}${t('userManagement.confirmDeleteSuffix')}`)) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      await callAdminFn({ action: 'delete', user_id: p.id }, await getToken());
      setSuccess(t('userManagement.deleteSuccess'));
      onRefresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('userManagement.errors.generic'));
    } finally { setBusy(false); }
  };

  const handleImpersonate = async (p: Profile) => {
    if (!window.confirm(`${t('userManagement.confirmImpersonatePrefix')}${p.first_name} ${p.last_name} (${p.login_id})${t('userManagement.confirmImpersonateSuffix')}`)) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const adminSession = sessionData.session;
      if (!adminSession) throw new Error(t('userManagement.errors.sessionNotFound'));

      const result = await callAdminFn({ action: 'impersonate', user_id: p.id }, adminSession.access_token);

      sessionStorage.setItem(IMPERSONATION_STORAGE_KEY, JSON.stringify({
        access_token: adminSession.access_token,
        refresh_token: adminSession.refresh_token,
        target_login_id: result.login_id,
      }));

      const { error: otpErr } = await supabase.auth.verifyOtp({ token_hash: result.token_hash, type: 'magiclink' });
      if (otpErr) throw otpErr;
      // From here the browser is authenticated as the target user; AuthContext's
      // onAuthStateChange listener picks it up and App.tsx re-renders their dashboard.
    } catch (e: unknown) {
      sessionStorage.removeItem(IMPERSONATION_STORAGE_KEY);
      setError(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <button onClick={() => window.history.back()} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 font-medium transition-colors">
        <ArrowLeft className="w-4 h-4" />
        {t('userManagement.back')}
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('userManagement.title')}</h1>
          <p className="text-slate-500 text-sm mt-1">{t('userManagement.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors shadow-sm"
        >
          <UserPlus className="w-4 h-4" />
          {t('userManagement.addUser')}
        </button>
      </div>

      {/* Search + filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('userManagement.searchPlaceholder')}
            className="w-full ps-9 pe-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-slate-400 outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-xs font-semibold text-slate-500">{t('userManagement.roleLabel')}</span>
          {(['all', 'mechanic', 'supplier', 'delivery', 'admin'] as const).map(r => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                roleFilter === r ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {r === 'all' ? t('userManagement.all') : t(`userManagement.roles.${r}`)}
            </button>
          ))}
          <span className="text-xs font-semibold text-slate-500 ms-2">{t('userManagement.statusLabel')}</span>
          {(['all', 'active', 'inactive'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                statusFilter === s ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s === 'all' ? t('userManagement.all') : s === 'active' ? t('userManagement.filterActive') : t('userManagement.filterInactive')}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-3 py-2">{success}</div>}

      {/* User list, grouped by role */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 text-center py-10 text-slate-400">
          <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">{t('userManagement.noUsersFound')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {ROLE_ORDER.map(role => {
            const users = groupedByRole.get(role) ?? [];
            if (users.length === 0) return null;
            return (
              <div key={role} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50">
                  {ROLE_ICONS[role]}
                  <h2 className="font-semibold text-slate-800 text-sm">{t(`userManagement.roles.${role}`)}</h2>
                  <span className="text-xs font-medium text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">{users.length}</span>
                </div>
                <RoleUserTable
                  users={users}
                  busy={busy}
                  onView={setViewing}
                  onEdit={setEditing}
                  onReset={setResetting}
                  onToggleActive={handleToggleActive}
                  onDelete={handleDelete}
                />
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <UserFormModal
          mode="create"
          onClose={() => setShowCreate(false)}
          onDone={() => { setShowCreate(false); onRefresh(); }}
        />
      )}
      {editing && (
        <UserFormModal
          mode="edit"
          profile={editing}
          onClose={() => setEditing(null)}
          onDone={() => { setEditing(null); onRefresh(); }}
        />
      )}
      {resetting && (
        <ResetPasswordModal
          profile={resetting}
          onClose={() => setResetting(null)}
          onDone={() => { setResetting(null); onRefresh(); }}
        />
      )}
      {viewing && (
        <UserDetailModal
          profile={viewing}
          busy={busy}
          error={error}
          canImpersonate={viewing.role !== 'admin' && viewing.id !== currentAdmin?.id}
          onClose={() => { setViewing(null); setError(''); }}
          onEdit={() => { setEditing(viewing); setViewing(null); }}
          onReset={() => { setResetting(viewing); setViewing(null); }}
          onToggleActive={() => handleToggleActive(viewing)}
          onDelete={() => { handleDelete(viewing); setViewing(null); }}
          onImpersonate={() => handleImpersonate(viewing)}
        />
      )}
    </div>
  );
}

function RoleUserTable({ users, busy, onView, onEdit, onReset, onToggleActive, onDelete }: {
  users: Profile[];
  busy: boolean;
  onView: (p: Profile) => void;
  onEdit: (p: Profile) => void;
  onReset: (p: Profile) => void;
  onToggleActive: (p: Profile) => void;
  onDelete: (p: Profile) => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-slate-400 text-xs uppercase bg-slate-50">
          <tr>
            <th className="text-start px-4 py-3 font-semibold">{t('userManagement.table.user')}</th>
            <th className="text-start px-4 py-3 font-semibold">{t('userManagement.table.reference')}</th>
            <th className="text-start px-4 py-3 font-semibold">{t('userManagement.table.phone')}</th>
            <th className="text-start px-4 py-3 font-semibold">{t('userManagement.table.city')}</th>
            <th className="text-start px-4 py-3 font-semibold">{t('userManagement.table.status')}</th>
            <th className="text-end px-4 py-3 font-semibold">{t('userManagement.table.actions')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {users.map(p => (
            <tr key={p.id} onClick={() => onView(p)} className="hover:bg-slate-50 cursor-pointer">
              <td className="px-4 py-3">
                <div className="font-medium text-slate-800">{p.first_name} {p.last_name}</div>
                <div className="text-xs text-slate-400">{p.login_id}</div>
              </td>
              <td className="px-4 py-3">
                <span className="text-xs font-mono font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{p.anonymous_reference ?? '—'}</span>
              </td>
              <td className="px-4 py-3 text-slate-500">{p.phone || '—'}</td>
              <td className="px-4 py-3 text-slate-500">{p.city || '—'}</td>
              <td className="px-4 py-3">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {p.is_active ? t('userManagement.statusActive') : t('userManagement.statusInactive')}
                </span>
              </td>
              <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-end gap-1">
                  <button onClick={() => onEdit(p)} disabled={busy} className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors" title={t('userManagement.actions.edit')}>
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => onReset(p)} disabled={busy} className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title={t('userManagement.actions.resetPassword')}>
                    <KeyRound className="w-4 h-4" />
                  </button>
                  <button onClick={() => onToggleActive(p)} disabled={busy} className={`p-1.5 rounded-lg transition-colors ${p.is_active ? 'text-slate-500 hover:text-amber-600 hover:bg-amber-50' : 'text-slate-500 hover:text-green-600 hover:bg-green-50'}`} title={p.is_active ? t('userManagement.actions.deactivate') : t('userManagement.actions.activate')}>
                    <Power className="w-4 h-4" />
                  </button>
                  <button onClick={() => onDelete(p)} disabled={busy} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title={t('userManagement.actions.delete')}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const REQUEST_STATUS_KEYS: Record<string, string> = { open: 'open', offer_selected: 'offerSelected', closed: 'closed' };

function UserDetailModal({ profile, busy, error, canImpersonate, onClose, onEdit, onReset, onToggleActive, onDelete, onImpersonate }: {
  profile: Profile;
  busy: boolean;
  error: string;
  canImpersonate: boolean;
  onClose: () => void;
  onEdit: () => void;
  onReset: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
  onImpersonate: () => void;
}) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [garage, setGarage] = useState<GarageProfile | null>(null);
  const [supplierProfile, setSupplierProfile] = useState<SupplierProfile | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      if (profile.role === 'mechanic') {
        const [{ data: gar }, { data: reqs }] = await Promise.all([
          supabase.from('garage_profiles').select('*').eq('user_id', profile.id).maybeSingle(),
          supabase.from('requests').select('*').eq('mechanic_id', profile.id).order('created_at', { ascending: false }).limit(10),
        ]);
        if (!active) return;
        setGarage(gar ?? null);
        setRequests(reqs ?? []);
      } else if (profile.role === 'supplier') {
        const [{ data: sup }, { data: offs }] = await Promise.all([
          supabase.from('supplier_profiles').select('*').eq('user_id', profile.id).maybeSingle(),
          supabase.from('offers').select('*').eq('supplier_id', profile.id).order('created_at', { ascending: false }).limit(10),
        ]);
        if (!active) return;
        setSupplierProfile(sup ?? null);
        setOffers(offs ?? []);
      }
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [profile.id, profile.role]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-slate-800 text-lg">{profile.first_name} {profile.last_name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                {ROLE_ICONS[profile.role]}
                {t(`userManagement.roles.${profile.role}`)}
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${profile.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {profile.is_active ? t('userManagement.statusActive') : t('userManagement.statusInactive')}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <InfoField label={t('userManagement.fields.identifiant')} value={profile.login_id ?? '—'} icon={<Users className="w-4 h-4" />} />
            <InfoField label={t('userManagement.table.reference')} value={profile.anonymous_reference ?? '—'} icon={<Tag className="w-4 h-4" />} />
            <InfoField label={t('userManagement.table.phone')} value={profile.phone || '—'} icon={<Phone className="w-4 h-4" />} />
            <InfoField label={t('userManagement.table.city')} value={profile.city || '—'} icon={<MapPin className="w-4 h-4" />} />
            <InfoField label={t('userManagement.fields.address')} value={profile.address || '—'} icon={<MapPin className="w-4 h-4" />} />
            <InfoField label={t('userManagement.fields.employeeId')} value={profile.employee_id ?? '—'} icon={<Tag className="w-4 h-4" />} />
            <InfoField label={t('userManagement.fields.registeredOn')} value={new Date(profile.created_at).toLocaleDateString('fr-DZ', { day: '2-digit', month: 'long', year: 'numeric' })} icon={<Calendar className="w-4 h-4" />} />
            <InfoField label={t('userManagement.fields.passwordChanged')} value={profile.first_login_completed ? t('userManagement.fields.yes') : t('userManagement.fields.no')} icon={<KeyRound className="w-4 h-4" />} />
          </div>

          {loading ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-400" />
            </div>
          ) : (
            <>
              {profile.role === 'mechanic' && garage && (
                <div className="border border-slate-200 rounded-xl p-4">
                  <div className="text-xs font-semibold text-slate-500 uppercase mb-2">{t('userManagement.garageLabel')}</div>
                  <div className="text-sm font-medium text-slate-800">{garage.garage_name || '—'}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{garage.address}, {garage.city} {garage.wilaya ? `(${garage.wilaya})` : ''}</div>
                </div>
              )}

              {profile.role === 'supplier' && supplierProfile && (
                <div className="border border-slate-200 rounded-xl p-4">
                  <div className="text-xs font-semibold text-slate-500 uppercase mb-2">{t('userManagement.companyLabel')}</div>
                  <div className="text-sm font-medium text-slate-800">{supplierProfile.company_name || '—'}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{supplierProfile.address}, {supplierProfile.city} {supplierProfile.wilaya ? `(${supplierProfile.wilaya})` : ''}</div>
                  {supplierProfile.specialties && <div className="text-xs text-slate-500 mt-1">{t('userManagement.specialtiesLabel')}{supplierProfile.specialties}</div>}
                  <div className="mt-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${profile.is_approved ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                      {profile.is_approved ? t('userManagement.accountValidated') : t('userManagement.accountPending')}
                    </span>
                  </div>
                </div>
              )}

            </>
          )}

          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}

          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
            {canImpersonate && profile.is_active && (
              <button onClick={onImpersonate} disabled={busy} className="flex items-center gap-1.5 text-sm text-white bg-amber-600 hover:bg-amber-700 font-medium px-3 py-2 rounded-lg transition-colors">
                <LogIn className="w-4 h-4" /> {t('userManagement.actions.impersonate')}
              </button>
            )}
            <button onClick={onEdit} disabled={busy} className="flex items-center gap-1.5 text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 font-medium px-3 py-2 rounded-lg transition-colors">
              <Pencil className="w-4 h-4" /> {t('userManagement.actions.edit')}
            </button>
            <button onClick={onReset} disabled={busy} className="flex items-center gap-1.5 text-sm text-amber-700 bg-amber-50 hover:bg-amber-100 font-medium px-3 py-2 rounded-lg transition-colors">
              <KeyRound className="w-4 h-4" /> {t('userManagement.actions.resetPassword')}
            </button>
            <button onClick={onToggleActive} disabled={busy} className="flex items-center gap-1.5 text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 font-medium px-3 py-2 rounded-lg transition-colors">
              <Power className="w-4 h-4" /> {profile.is_active ? t('userManagement.actions.deactivate') : t('userManagement.actions.activate')}
            </button>
            <button onClick={onDelete} disabled={busy} className="flex items-center gap-1.5 text-sm text-red-700 bg-red-50 hover:bg-red-100 font-medium px-3 py-2 rounded-lg transition-colors">
              <Trash2 className="w-4 h-4" /> {t('userManagement.actions.delete')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoField({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-100 rounded-lg p-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase mb-1">
        {icon}
        {label}
      </div>
      <div className="text-sm font-medium text-slate-800">{value}</div>
    </div>
  );
}

function UserFormModal({ mode, profile, onClose, onDone }: {
  mode: 'create' | 'edit';
  profile?: Profile;
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    login_id: profile?.login_id ?? '',
    first_name: profile?.first_name ?? '',
    last_name: profile?.last_name ?? '',
    employee_id: profile?.employee_id ?? '',
    phone: profile?.phone ?? '',
    address: profile?.address ?? '',
    city: profile?.city ?? '',
    role: (profile?.role ?? 'mechanic') as Role,
    is_active: profile?.is_active ?? true,
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'create') {
        if (!form.login_id || !form.first_name || !form.last_name || !form.password) {
          throw new Error(t('userManagement.errors.requiredFields'));
        }
        await callAdminFn({
          action: 'create',
          login_id: form.login_id.trim().toLowerCase(),
          first_name: form.first_name,
          last_name: form.last_name,
          employee_id: form.employee_id || null,
          phone: form.phone,
          address: form.address,
          city: form.city,
          role: form.role,
          password: form.password,
        }, await getToken());
      } else if (profile) {
        await callAdminFn({
          action: 'update',
          user_id: profile.id,
          first_name: form.first_name,
          last_name: form.last_name,
          employee_id: form.employee_id || null,
          phone: form.phone,
          address: form.address,
          city: form.city,
          role: form.role,
          is_active: form.is_active,
        }, await getToken());
      }
      onDone();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-bold text-slate-800 text-lg">
            {mode === 'create' ? t('userManagement.form.newUser') : t('userManagement.form.editUser')}
          </h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('userManagement.form.firstName')} required>
              <input type="text" value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} required className={inputCls} />
            </Field>
            <Field label={t('userManagement.form.lastName')} required>
              <input type="text" value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} required className={inputCls} />
            </Field>
          </div>
          <Field label={t('userManagement.form.loginId')} required>
            <input type="text" value={form.login_id} onChange={e => setForm(f => ({ ...f, login_id: e.target.value }))} required disabled={mode === 'edit'} className={inputCls} placeholder={t('userManagement.form.loginIdPlaceholder')} />
          </Field>
          {mode === 'create' && (
            <Field label={t('userManagement.form.tempPassword')} required>
              <input type="text" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={6} className={inputCls} placeholder={t('userManagement.form.tempPasswordPlaceholder')} />
            </Field>
          )}
          <Field label={t('userManagement.form.employeeIdOptional')}>
            <input type="text" value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))} className={inputCls} />
          </Field>
          <Field label={t('userManagement.table.phone')}>
            <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inputCls} />
          </Field>
          <Field label={t('userManagement.fields.address')}>
            <input type="text" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className={inputCls} />
          </Field>
          <Field label={t('userManagement.table.city')}>
            <input type="text" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('userManagement.form.role')} required>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))} className={inputCls}>
                <option value="mechanic">{t('userManagement.roles.mechanic')}</option>
                <option value="supplier">{t('userManagement.roles.supplier')}</option>
                <option value="delivery">{t('userManagement.roles.delivery')}</option>
                <option value="admin">{t('userManagement.roles.admin')}</option>
              </select>
            </Field>
            {mode === 'edit' && (
              <Field label={t('userManagement.form.status')}>
                <select value={form.is_active ? 'active' : 'inactive'} onChange={e => setForm(f => ({ ...f, is_active: e.target.value === 'active' }))} className={inputCls}>
                  <option value="active">{t('userManagement.statusActive')}</option>
                  <option value="inactive">{t('userManagement.statusInactive')}</option>
                </select>
              </Field>
            )}
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
          <button type="submit" disabled={loading} className="w-full bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 text-white font-semibold py-3 rounded-xl transition-colors">
            {loading ? t('userManagement.form.saving') : mode === 'create' ? t('userManagement.form.createUser') : t('userManagement.form.save')}
          </button>
        </form>
      </div>
    </div>
  );
}

function ResetPasswordModal({ profile, onClose, onDone }: {
  profile: Profile;
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = useLanguage();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError(t('userManagement.errors.minPassword')); return; }
    setLoading(true); setError('');
    try {
      const { data } = await supabase.auth.getSession();
      await callAdminFn({ action: 'reset_password', user_id: profile.id, password }, data.session?.access_token ?? '');
      onDone();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-slate-800 text-lg">{t('userManagement.actions.resetPassword')}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{profile.first_name} {profile.last_name} · {profile.login_id}</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <Field label={t('userManagement.resetModal.newTempPassword')} required>
            <input type="text" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className={inputCls} placeholder={t('userManagement.resetModal.newTempPasswordPlaceholder')} />
          </Field>
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {t('userManagement.resetModal.notice')}
          </p>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
          <button type="submit" disabled={loading} className="w-full bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 text-white font-semibold py-3 rounded-xl transition-colors">
            {loading ? t('userManagement.form.saving') : t('userManagement.resetModal.button')}
          </button>
        </form>
      </div>
    </div>
  );
}

const inputCls = 'w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:ring-2 focus:ring-slate-400 focus:border-slate-400 outline-none transition disabled:bg-slate-50 disabled:text-slate-400';

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">
        {label}{required && <span className="text-red-500 ms-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
