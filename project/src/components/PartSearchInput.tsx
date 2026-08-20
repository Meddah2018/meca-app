import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, Check, ChevronDown } from 'lucide-react';
import { PART_CATEGORIES, searchParts } from '@/lib/partsCatalog';
import { useLanguage } from '@/contexts/LanguageContext';

interface PartSearchInputProps {
  value: string;
  onChange: (partName: string, categoryId: string | null) => void;
  required?: boolean;
}

export default function PartSearchInput({ value, onChange, required }: PartSearchInputProps) {
  const { t } = useLanguage();
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [step, setStep] = useState<'category' | 'search'>(value ? 'search' : 'category');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value) {
      setStep('search');
    }
  }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const suggestions = useMemo(() => {
    if (!categoryId) return [];
    return searchParts(categoryId, query);
  }, [categoryId, query]);

  useEffect(() => {
    setHighlight(0);
  }, [query, categoryId]);

  const selectCategory = (id: string) => {
    setCategoryId(id);
    setStep('search');
    setQuery('');
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const pickPart = (part: string) => {
    onChange(part, categoryId);
    setQuery('');
    setOpen(false);
  };

  const resetCategory = () => {
    setCategoryId(null);
    setStep('category');
    setQuery('');
    onChange('', null);
  };

  const categoryLabel = PART_CATEGORIES.find(c => c.id === categoryId)?.label;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight(h => (h + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight(h => (h - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions[highlight]) pickPart(suggestions[highlight]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {step === 'category' && (
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-colors outline-none ${
            open ? 'border-orange-400 ring-2 ring-orange-100' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className={categoryLabel ? 'text-slate-800' : 'text-slate-400'}>
            {categoryLabel ?? t('widgets.partSearchInput.selectCategory')}
          </span>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      )}

      {step === 'search' && (
        <div className="relative">
          {value ? (
            <div className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-orange-300 bg-orange-50">
              <div className="flex items-center gap-2 min-w-0">
                <Check className="w-4 h-4 text-orange-600 shrink-0" />
                <span className="text-sm font-medium text-slate-800 truncate">{value}</span>
              </div>
              <button type="button" onClick={resetCategory} className="p-0.5 text-slate-400 hover:text-slate-600 shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => { setQuery(e.target.value); setOpen(true); }}
                onFocus={() => setOpen(true)}
                onKeyDown={onKeyDown}
                required={required}
                className="w-full ps-9 pe-9 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none"
                placeholder={`${t('widgets.partSearchInput.searchInPrefix')} ${categoryLabel ?? t('widgets.partSearchInput.category')}…`}
              />
              <button type="button" onClick={resetCategory} className="absolute end-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {open && step === 'category' && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-xl border border-slate-200 shadow-lg max-h-64 overflow-y-auto">
          {PART_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => selectCategory(cat.id)}
              className="w-full text-start px-3 py-2.5 text-sm text-slate-700 hover:bg-orange-50 hover:text-orange-700 transition-colors first:rounded-t-xl last:rounded-b-xl"
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {open && step === 'search' && !value && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-xl border border-slate-200 shadow-lg max-h-60 overflow-y-auto">
          {suggestions.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-slate-400">
              {query ? t('widgets.partSearchInput.noPartFound') : t('widgets.partSearchInput.startTyping')}
            </div>
          ) : (
            suggestions.map((part, i) => (
              <button
                key={part}
                type="button"
                onMouseEnter={() => setHighlight(i)}
                onClick={() => pickPart(part)}
                className={`w-full text-start px-3 py-2.5 text-sm transition-colors first:rounded-t-xl last:rounded-b-xl ${
                  i === highlight ? 'bg-orange-50 text-orange-700' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {part}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
