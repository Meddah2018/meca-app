import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { Profile, Role } from '@/lib/database.types';
import {
  Search, UserPlus, Pencil, KeyRound, Power, Trash2, X, Filter, Users, Package, Truck, ShieldCheck, ArrowLeft,
} from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  mechanic: 'Mécanicien',
  supplier: 'Fournisseur',
  delivery: 'Livreur',
  admin: 'Administrateur',
};

const ROLE_ICONS: Record<string, React.ReactNode> = {
  mechanic: <Users className="w-4 h-4" />,
  supplier: <Package className="w-4 h-4" />,
  delivery: <Truck className="w-4 h-4" />,
  admin: <ShieldCheck className="w-4 h-4" />,
};

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
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [resetting, setResetting] = useState<Profile | null>(null);
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

  const getToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? '';
  };

  const handleToggleActive = async (p: Profile) => {
    setBusy(true); setError(''); setSuccess('');
    try {
      await callAdminFn({ action: 'toggle_active', user_id: p.id, is_active: !p.is_active }, await getToken());
      setSuccess(`${p.login_id} ${p.is_active ? 'désactivé' : 'activé'}`);
      onRefresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally { setBusy(false); }
  };

  const handleDelete = async (p: Profile) => {
    if (!window.confirm(`Supprimer définitivement l'utilisateur ${p.login_id} ? Cette action est irréversible.`)) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      await callAdminFn({ action: 'delete', user_id: p.id }, await getToken());
      setSuccess('Utilisateur supprimé');
      onRefresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <button onClick={() => window.history.back()} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 font-medium transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Retour
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestion des utilisateurs</h1>
          <p className="text-slate-500 text-sm mt-1">Créer, modifier, activer ou réinitialiser les comptes</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors shadow-sm"
        >
          <UserPlus className="w-4 h-4" />
          Ajouter un utilisateur
        </button>
      </div>

      {/* Search + filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher : nom, identifiant, référence, téléphone, ville..."
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-slate-400 outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-xs font-semibold text-slate-500">Rôle :</span>
          {(['all', 'mechanic', 'supplier', 'delivery', 'admin'] as const).map(r => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                roleFilter === r ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {r === 'all' ? 'Tous' : ROLE_LABELS[r]}
            </button>
          ))}
          <span className="text-xs font-semibold text-slate-500 ml-2">Statut :</span>
          {(['all', 'active', 'inactive'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                statusFilter === s ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s === 'all' ? 'Tous' : s === 'active' ? 'Actifs' : 'Inactifs'}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-3 py-2">{success}</div>}

      {/* User list */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Aucun utilisateur trouvé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-400 text-xs uppercase bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Utilisateur</th>
                  <th className="text-left px-4 py-3 font-semibold">Référence</th>
                  <th className="text-left px-4 py-3 font-semibold">Rôle</th>
                  <th className="text-left px-4 py-3 font-semibold">Téléphone</th>
                  <th className="text-left px-4 py-3 font-semibold">Ville</th>
                  <th className="text-left px-4 py-3 font-semibold">Statut</th>
                  <th className="text-right px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{p.first_name} {p.last_name}</div>
                      <div className="text-xs text-slate-400">{p.login_id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{p.anonymous_reference ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                        {ROLE_ICONS[p.role]}
                        {ROLE_LABELS[p.role]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{p.phone || '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{p.city || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {p.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setEditing(p)} disabled={busy} className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors" title="Modifier">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => setResetting(p)} disabled={busy} className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Réinitialiser le mot de passe">
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleToggleActive(p)} disabled={busy} className={`p-1.5 rounded-lg transition-colors ${p.is_active ? 'text-slate-500 hover:text-amber-600 hover:bg-amber-50' : 'text-slate-500 hover:text-green-600 hover:bg-green-50'}`} title={p.is_active ? 'Désactiver' : 'Activer'}>
                          <Power className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(p)} disabled={busy} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Supprimer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
    </div>
  );
}

function UserFormModal({ mode, profile, onClose, onDone }: {
  mode: 'create' | 'edit';
  profile?: Profile;
  onClose: () => void;
  onDone: () => void;
}) {
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
          throw new Error('Identifiant, prénom, nom et mot de passe sont obligatoires');
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
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-bold text-slate-800 text-lg">
            {mode === 'create' ? 'Nouvel utilisateur' : 'Modifier l\'utilisateur'}
          </h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prénom" required>
              <input type="text" value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} required className={inputCls} />
            </Field>
            <Field label="Nom" required>
              <input type="text" value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} required className={inputCls} />
            </Field>
          </div>
          <Field label="Identifiant de connexion" required>
            <input type="text" value={form.login_id} onChange={e => setForm(f => ({ ...f, login_id: e.target.value }))} required disabled={mode === 'edit'} className={inputCls} placeholder="mec0001" />
          </Field>
          {mode === 'create' && (
            <Field label="Mot de passe temporaire" required>
              <input type="text" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={6} className={inputCls} placeholder="Temporaire123" />
            </Field>
          )}
          <Field label="Matricule interne (optionnel)">
            <input type="text" value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="Téléphone">
            <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="Adresse">
            <input type="text" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="Ville">
            <input type="text" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Rôle" required>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))} className={inputCls}>
                <option value="mechanic">Mécanicien</option>
                <option value="supplier">Fournisseur</option>
                <option value="delivery">Livreur</option>
                <option value="admin">Administrateur</option>
              </select>
            </Field>
            {mode === 'edit' && (
              <Field label="Statut">
                <select value={form.is_active ? 'active' : 'inactive'} onChange={e => setForm(f => ({ ...f, is_active: e.target.value === 'active' }))} className={inputCls}>
                  <option value="active">Actif</option>
                  <option value="inactive">Inactif</option>
                </select>
              </Field>
            )}
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
          <button type="submit" disabled={loading} className="w-full bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 text-white font-semibold py-3 rounded-xl transition-colors">
            {loading ? 'Enregistrement...' : mode === 'create' ? 'Créer l\'utilisateur' : 'Enregistrer'}
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
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError('Minimum 6 caractères'); return; }
    setLoading(true); setError('');
    try {
      const { data } = await supabase.auth.getSession();
      await callAdminFn({ action: 'reset_password', user_id: profile.id, password }, data.session?.access_token ?? '');
      onDone();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-slate-800 text-lg">Réinitialiser le mot de passe</h2>
            <p className="text-sm text-slate-500 mt-0.5">{profile.first_name} {profile.last_name} · {profile.login_id}</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <Field label="Nouveau mot de passe temporaire" required>
            <input type="text" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className={inputCls} placeholder="NouveauTemporaire123" />
          </Field>
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            L'utilisateur devra changer ce mot de passe lors de sa prochaine connexion.
          </p>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
          <button type="submit" disabled={loading} className="w-full bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 text-white font-semibold py-3 rounded-xl transition-colors">
            {loading ? 'Enregistrement...' : 'Réinitialiser'}
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
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
