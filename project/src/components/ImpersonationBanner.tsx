import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { ShieldAlert } from 'lucide-react';

interface ImpersonationBackup {
  access_token: string;
  refresh_token: string;
  target_login_id: string;
}

export const IMPERSONATION_STORAGE_KEY = 'mecapieces_impersonation_backup';

export default function ImpersonationBanner() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [backup, setBackup] = useState<ImpersonationBackup | null>(null);
  const [returning, setReturning] = useState(false);

  // Re-check on every session change (impersonation start/return), not just on mount —
  // this component stays mounted across those transitions, so a mount-only effect would
  // never notice sessionStorage being set after the fact.
  useEffect(() => {
    const raw = sessionStorage.getItem(IMPERSONATION_STORAGE_KEY);
    if (!raw) {
      setBackup(null);
      return;
    }
    try {
      setBackup(JSON.parse(raw));
    } catch {
      sessionStorage.removeItem(IMPERSONATION_STORAGE_KEY);
      setBackup(null);
    }
  }, [user?.id]);

  if (!backup) return null;

  const handleReturn = async () => {
    setReturning(true);
    try {
      await supabase.auth.setSession({ access_token: backup.access_token, refresh_token: backup.refresh_token });
    } finally {
      sessionStorage.removeItem(IMPERSONATION_STORAGE_KEY);
      setReturning(false);
    }
  };

  return (
    <div className="sticky top-0 z-[100] bg-amber-500 text-white text-sm px-4 py-2 flex items-center justify-center gap-3 shadow-md flex-wrap">
      <ShieldAlert className="w-4 h-4 shrink-0" />
      <span className="font-medium">{t('widgets.impersonationBanner.modeSupport')} {backup.target_login_id}</span>
      <button
        onClick={handleReturn}
        disabled={returning}
        className="bg-white/20 hover:bg-white/30 disabled:opacity-60 font-semibold px-3 py-1 rounded-lg transition-colors"
      >
        {returning ? t('widgets.impersonationBanner.returning') : t('widgets.impersonationBanner.returnToAdmin')}
      </button>
    </div>
  );
}
