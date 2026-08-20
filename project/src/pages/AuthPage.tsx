import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/lib/errors';
import { useLanguage } from '@/contexts/LanguageContext';

interface AuthPageProps {
  onAuth: () => void;
}

export default function AuthPage({ onAuth }: AuthPageProps) {
  const { t } = useLanguage();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const syntheticEmail = `${loginId.trim().toLowerCase()}@mecapieces.local`;
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: syntheticEmail,
        password,
      });
      if (signInError) throw signInError;

      // Check profile: active + first_login
      const { data: prof } = await supabase
        .from('profiles')
        .select('is_active, first_login_completed')
        .eq('id', data.user.id)
        .maybeSingle();

      if (prof && !prof.is_active) {
        await supabase.auth.signOut();
        throw new Error(t('auth.accountDisabled'));
      }

      if (prof && !prof.first_login_completed) {
        setSessionUserId(data.user.id);
        setNeedsPasswordChange(true);
        setLoading(false);
        return;
      }

      onAuth();
    } catch (err: unknown) {
      setError(getErrorMessage(err, t('common.error')));
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) {
      setError(t('auth.passwordTooShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('auth.passwordMismatch'));
      return;
    }
    setLoading(true);
    try {
      const { error: updErr } = await supabase.auth.updateUser({ password: newPassword });
      if (updErr) throw updErr;

      if (sessionUserId) {
        await supabase
          .from('profiles')
          .update({ first_login_completed: true })
          .eq('id', sessionUserId);
      }

      onAuth();
    } catch (err: unknown) {
      setError(getErrorMessage(err, t('auth.passwordChangeError')));
    } finally {
      setLoading(false);
    }
  };

  const handleSkipPasswordChange = async () => {
    setError('');
    setLoading(true);
    try {
      if (sessionUserId) {
        await supabase
          .from('profiles')
          .update({ first_login_completed: true })
          .eq('id', sessionUserId);
      }
      onAuth();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-2">
            <img src="/icon_pieces_512.png" alt="MécaPièces" className="w-12 h-12 rounded-xl shadow-lg object-cover" />
            <span className="text-3xl font-bold text-white tracking-tight">MecaPieces</span>
          </div>
          <p className="text-slate-400 text-sm">{t('auth.tagline')}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {needsPasswordChange ? (
            <form onSubmit={handleChangePassword} className="p-6 space-y-4">
              <div className="text-center mb-2">
                <h2 className="text-lg font-bold text-slate-800">{t('auth.changePasswordTitle')}</h2>
                <p className="text-sm text-slate-500 mt-1">
                  {t('auth.changePasswordHint')}
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t('auth.newPassword')}</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t('auth.confirmPassword')}</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition"
                  placeholder="••••••••"
                />
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold py-3 rounded-xl transition-colors shadow-sm"
              >
                {loading ? t('common.loading') : t('auth.setPassword')}
              </button>
              <button
                type="button"
                onClick={handleSkipPasswordChange}
                disabled={loading}
                className="w-full text-slate-500 hover:text-slate-700 text-sm font-medium py-2 transition-colors"
              >
                {t('auth.skipForNow')}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="text-center mb-2">
                <h2 className="text-lg font-bold text-slate-800">{t('auth.loginTitle')}</h2>
                <p className="text-sm text-slate-500 mt-1">{t('auth.loginHint')}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t('auth.loginId')}</label>
                <input
                  type="text"
                  value={loginId}
                  onChange={e => setLoginId(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition"
                  placeholder="mec0001"
                  autoComplete="username"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t('auth.password')}</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold py-3 rounded-xl transition-colors shadow-sm"
              >
                {loading ? t('common.loading') : t('auth.loginSubmit')}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          {t('auth.footer')}
        </p>
      </div>
    </div>
  );
}
