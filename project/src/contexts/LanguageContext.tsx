import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { translate, type Language } from '@/lib/i18n';
import { useAuth } from './AuthContext';

const STORAGE_KEY = 'meca-language';

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readStoredLanguage(): Language {
  if (typeof window === 'undefined') return 'fr';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'ar' ? 'ar' : 'fr';
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, refreshProfile } = useAuth();
  const [language, setLanguageState] = useState<Language>(readStoredLanguage);

  useEffect(() => {
    if (profile?.preferred_language && profile.preferred_language !== language) {
      setLanguageState(profile.preferred_language);
    }
    // Only react to the profile's own language changing (e.g. after login or a DB update).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.preferred_language]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    window.localStorage.setItem(STORAGE_KEY, language);
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    if (user) {
      supabase
        .from('profiles')
        .update({ preferred_language: lang })
        .eq('id', user.id)
        .then(() => refreshProfile());
    }
  }, [user, refreshProfile]);

  const t = useCallback((key: string) => translate(language, key), [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
