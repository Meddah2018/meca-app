import { useEffect, useRef, useState } from 'react';
import { Languages } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Language } from '@/lib/i18n';

const OPTIONS: { code: Language; label: string; short: string }[] = [
  { code: 'fr', label: 'Français', short: 'FR' },
  { code: 'ar', label: 'العربية', short: 'AR' },
];

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const current = OPTIONS.find(o => o.code === language) ?? OPTIONS[0];

  return (
    <div ref={ref} className="fixed top-16 end-3 z-40 lg:top-3">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label="Changer de langue / تغيير اللغة"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur shadow-md border border-slate-200 text-xs font-semibold text-black hover:border-slate-300 transition-colors"
      >
        <Languages className="w-3.5 h-3.5" />
        {current.label}
      </button>

      {open && (
        <div id="language-switcher-panel" className="absolute end-0 mt-1.5 w-36 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
          {OPTIONS.map(opt => (
            <button
              key={opt.code}
              type="button"
              onClick={() => { setLanguage(opt.code); setOpen(false); }}
              className={`w-full text-start px-3 py-2 text-sm text-black transition-colors ${
                opt.code === language ? 'bg-slate-100 font-medium' : 'hover:bg-slate-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
