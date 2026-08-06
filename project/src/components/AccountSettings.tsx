import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { User, KeyRound, Check, AlertCircle, ArrowLeft } from 'lucide-react';

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

const inputCls = 'w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:ring-2 focus:ring-slate-400 focus:border-slate-400 outline-none transition';

export default function AccountSettings() {
  const { profile, refreshProfile, signOut } = useAuth();
  const [loginId, setLoginId] = useState(profile?.login_id ?? '');
  const [loginIdError, setLoginIdError] = useState('');
  const [loginIdSuccess, setLoginIdSuccess] = useState(false);
  const [loginIdLoading, setLoginIdLoading] = useState(false);

  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);

  const getToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? '';
  };

  const handleLoginIdChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginIdError('');
    setLoginIdSuccess(false);
    if (!loginId.trim()) {
      setLoginIdError("L'identifiant est requis");
      return;
    }
    if (loginId.trim().toLowerCase() === profile?.login_id) {
      setLoginIdError('Ceci est déjà votre identifiant actuel');
      return;
    }
    setLoginIdLoading(true);
    try {
      const token = await getToken();
      await callAdminFn({ action: 'self_update', login_id: loginId.trim() }, token);
      setLoginIdSuccess(true);
      await refreshProfile();
    } catch (err: unknown) {
      setLoginIdError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoginIdLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess(false);
    if (!currentPwd || !newPwd || !confirmPwd) {
      setPwdError('Tous les champs sont requis');
      return;
    }
    if (newPwd.length < 6) {
      setPwdError('Le nouveau mot de passe doit contenir au moins 6 caractères');
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdError('Les mots de passe ne correspondent pas');
      return;
    }
    setPwdLoading(true);
    try {
      const token = await getToken();
      await callAdminFn({ action: 'self_password', current_password: currentPwd, new_password: newPwd }, token);
      setPwdSuccess(true);
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
      await refreshProfile();
    } catch (err: unknown) {
      setPwdError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <button onClick={() => window.history.back()} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 font-medium transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Retour
      </button>

      <div>
        <h1 className="text-2xl font-bold text-slate-800">Paramètres du compte</h1>
        <p className="text-slate-500 text-sm mt-1">Modifiez votre identifiant de connexion et votre mot de passe</p>
      </div>

      {/* Change login ID */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-800">Identifiant de connexion</h2>
            <p className="text-xs text-slate-400">Cet identifiant vous sert à vous connecter</p>
          </div>
        </div>
        <form onSubmit={handleLoginIdChange} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Nouvel identifiant</label>
            <input
              type="text"
              value={loginId}
              onChange={e => setLoginId(e.target.value)}
              required
              className={inputCls}
              placeholder="mon.identifiant"
            />
          </div>
          {loginIdError && (
            <div className="flex items-center gap-1.5 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {loginIdError}
            </div>
          )}
          {loginIdSuccess && (
            <div className="flex items-center gap-1.5 text-sm text-green-600">
              <Check className="w-4 h-4 shrink-0" />
              Identifiant modifié avec succès
            </div>
          )}
          <button
            type="submit"
            disabled={loginIdLoading}
            className="bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            {loginIdLoading ? 'Enregistrement...' : 'Modifier l\'identifiant'}
          </button>
        </form>
      </div>

      {/* Change password */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-800">Mot de passe</h2>
            <p className="text-xs text-slate-400">Choisissez un mot de passe que vous seul connaissez</p>
          </div>
        </div>
        <form onSubmit={handlePasswordChange} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Mot de passe actuel</label>
            <input
              type="password"
              value={currentPwd}
              onChange={e => setCurrentPwd(e.target.value)}
              required
              className={inputCls}
              autoComplete="current-password"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Nouveau mot de passe</label>
              <input
                type="password"
                value={newPwd}
                onChange={e => setNewPwd(e.target.value)}
                required
                minLength={6}
                className={inputCls}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Confirmer le nouveau</label>
              <input
                type="password"
                value={confirmPwd}
                onChange={e => setConfirmPwd(e.target.value)}
                required
                minLength={6}
                className={inputCls}
                autoComplete="new-password"
              />
            </div>
          </div>
          {pwdError && (
            <div className="flex items-center gap-1.5 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {pwdError}
            </div>
          )}
          {pwdSuccess && (
            <div className="flex items-center gap-1.5 text-sm text-green-600">
              <Check className="w-4 h-4 shrink-0" />
              Mot de passe modifié avec succès
            </div>
          )}
          <button
            type="submit"
            disabled={pwdLoading}
            className="bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            {pwdLoading ? 'Enregistrement...' : 'Modifier le mot de passe'}
          </button>
        </form>
      </div>

      {/* Sign out */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <button
          onClick={signOut}
          className="text-sm text-red-600 hover:text-red-700 font-medium"
        >
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
