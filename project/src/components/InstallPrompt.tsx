import { useState, useEffect } from 'react';
import { Share, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'mecapieces_install_prompt_dismissed';

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as unknown as { standalone?: boolean }).standalone === true;
}

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export default function InstallPrompt() {
  const { t } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1');
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setDeferredPrompt(null);
      setDismissed(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  if (dismissed || isStandalone()) return null;
  if (!deferredPrompt && !isIOS()) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  // Chrome/Android/desktop: native install prompt available
  if (deferredPrompt) {
    return (
      <div className="fixed bottom-4 inset-x-4 sm:start-auto sm:end-4 sm:w-80 z-[90] bg-white rounded-xl shadow-lg border border-slate-200 p-4 flex items-center gap-3">
        <img src="/icon_pieces_192.png" alt="" className="w-10 h-10 rounded-lg shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-slate-800">{t('widgets.installPrompt.installTitle')}</div>
          <div className="text-xs text-slate-500">{t('widgets.installPrompt.quickAccess')}</div>
        </div>
        <button onClick={handleInstall} className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors shrink-0">
          {t('widgets.installPrompt.install')}
        </button>
        <button onClick={handleDismiss} className="p-1 text-slate-400 hover:text-slate-600 shrink-0"><X className="w-4 h-4" /></button>
      </div>
    );
  }

  // iOS Safari has no beforeinstallprompt event — show manual instructions instead
  if (!showIOSInstructions) {
    return (
      <div className="fixed bottom-4 inset-x-4 sm:start-auto sm:end-4 sm:w-80 z-[90] bg-white rounded-xl shadow-lg border border-slate-200 p-4 flex items-center gap-3">
        <img src="/icon_pieces_192.png" alt="" className="w-10 h-10 rounded-lg shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-slate-800">{t('widgets.installPrompt.installTitle')}</div>
          <button onClick={() => setShowIOSInstructions(true)} className="text-xs text-blue-600 font-medium mt-0.5">
            {t('widgets.installPrompt.howTo')}
          </button>
        </div>
        <button onClick={handleDismiss} className="p-1 text-slate-400 hover:text-slate-600 shrink-0"><X className="w-4 h-4" /></button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 inset-x-4 sm:start-auto sm:end-4 sm:w-80 z-[90] bg-white rounded-xl shadow-lg border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="text-sm font-semibold text-slate-800">{t('widgets.installPrompt.installOnIOS')}</div>
        <button onClick={handleDismiss} className="p-1 text-slate-400 hover:text-slate-600 shrink-0"><X className="w-4 h-4" /></button>
      </div>
      <p className="text-xs text-slate-600 leading-relaxed">
        {t('widgets.installPrompt.instructionsPrefix')} <Share className="inline w-3.5 h-3.5 -mt-0.5" /> <strong>{t('widgets.installPrompt.share')}</strong>{t('widgets.installPrompt.instructionsMiddle')} <strong>{t('widgets.installPrompt.addToHomeScreen')}</strong>.
      </p>
    </div>
  );
}
