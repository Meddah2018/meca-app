import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, Check, ChevronDown, Car } from 'lucide-react';
import { searchBrands, searchModels, getBrand, getModel, normalize } from '@/lib/vehiclesCatalog';

export interface VehicleSelection {
  brand_id: string;
  brand_label: string;
  model_id: string;
  model_label: string;
  year: number | null;
}

interface VehicleSelectProps {
  value: VehicleSelection | null;
  onChange: (selection: VehicleSelection | null) => void;
  required?: boolean;
}

type Step = 'brand' | 'model' | 'year';

export default function VehicleSelect({ value, onChange, required }: VehicleSelectProps) {
  const [step, setStep] = useState<Step>(value ? (value.year ? 'year' : value.model_id ? 'model' : 'brand') : 'brand');
  const [brandId, setBrandId] = useState<string | null>(value?.brand_id ?? null);
  const [modelId, setModelId] = useState<string | null>(value?.model_id ?? null);
  const [year, setYear] = useState<number | null>(value?.year ?? null);

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const brand = brandId ? getBrand(brandId) : undefined;
  const model = brandId && modelId ? getModel(brandId, modelId) : undefined;

  const brandResults = useMemo(() => searchBrands(query, 50), [query]);
  const modelResults = useMemo(() => (brandId ? searchModels(brandId, query, 50) : []), [brandId, query]);

  useEffect(() => { setHighlight(0); }, [query, step]);

  useEffect(() => {
    if (open && (step === 'brand' || step === 'model')) {
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open, step]);

  const pickBrand = (id: string, label: string) => {
    setBrandId(id);
    setModelId(null);
    setYear(null);
    setStep('model');
    setQuery('');
    setOpen(true);
    onChange(null);
    setTimeout(() => inputRef.current?.focus(), 30);
  };

  const pickModel = (id: string, label: string) => {
    setModelId(id);
    setStep('year');
    setQuery('');
    setOpen(true);
    onChange({ brand_id: brandId!, brand_label: brand!.label, model_id: id, model_label: label, year: null });
  };

  const pickYear = (y: number) => {
    setYear(y);
    setOpen(false);
    onChange({ brand_id: brandId!, brand_label: brand!.label, model_id: modelId!, model_label: model!.label, year: y });
  };

  const resetAll = () => {
    setBrandId(null);
    setModelId(null);
    setYear(null);
    setStep('brand');
    setQuery('');
    setOpen(false);
    onChange(null);
    setTimeout(() => inputRef.current?.focus(), 30);
  };

  const backToBrand = () => {
    setModelId(null);
    setYear(null);
    setStep('brand');
    setQuery('');
    onChange(null);
  };

  const backToModel = () => {
    setYear(null);
    setStep('model');
    setQuery('');
    onChange({ brand_id: brandId!, brand_label: brand!.label, model_id: modelId!, model_label: model!.label, year: null });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    const list = step === 'brand' ? brandResults : step === 'model' ? modelResults : [];
    if (list.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => (h + 1) % list.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => (h - 1 + list.length) % list.length); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const item = list[highlight];
      if (!item) return;
      if (step === 'brand') pickBrand(item.id, item.label);
      else if (step === 'model') pickModel(item.id, item.label);
    } else if (e.key === 'Escape') { setOpen(false); }
  };

  const highlightMatch = (text: string, q: string) => {
    if (!q.trim()) return text;
    const n = normalize(text);
    const nq = normalize(q);
    const idx = n.indexOf(nq);
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-orange-200 text-orange-800 rounded px-0.5">{text.slice(idx, idx + q.length)}</mark>
        {text.slice(idx + q.length)}
      </>
    );
  };

  const isComplete = brandId && modelId && year;

  return (
    <div ref={containerRef} className="relative">
      {isComplete ? (
        <div className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-orange-300 bg-orange-50">
          <div className="flex items-center gap-2 min-w-0">
            <Check className="w-4 h-4 text-orange-600 shrink-0" />
            <span className="text-sm font-medium text-slate-800 truncate">{brand!.label} {model!.label} · {year}</span>
          </div>
          <button type="button" onClick={resetAll} className="p-0.5 text-slate-400 hover:text-slate-600 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {brand && (
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="text-slate-400">Marque:</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">
                {brand.label}
                <button type="button" onClick={backToBrand} className="hover:text-orange-900"><X className="w-3 h-3" /></button>
              </span>
              {model && (
                <>
                  <span className="text-slate-400">Modèle:</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">
                    {model.label}
                    <button type="button" onClick={backToModel} className="hover:text-orange-900"><X className="w-3 h-3" /></button>
                  </span>
                </>
              )}
            </div>
          )}

          <div className="relative">
            {step === 'year' ? (
              <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-colors outline-none ${open ? 'border-orange-400 ring-2 ring-orange-100' : 'border-slate-200 hover:border-slate-300'}`}
              >
                <span className={year ? 'text-slate-800' : 'text-slate-400'}>{year ? year : 'Sélectionner l\'année'}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => { setQuery(e.target.value); setOpen(true); }}
                  onFocus={() => setOpen(true)}
                  onKeyDown={onKeyDown}
                  required={required}
                  inputMode="text"
                  autoCapitalize="none"
                  autoCorrect="off"
                  className="w-full pl-9 pr-9 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none"
                  placeholder={step === 'brand' ? 'Tapez les premières lettres (re, pe, hy…)' : `Rechercher un modèle ${brand ? brand.label : ''}…`}
                />
                {query && (
                  <button type="button" onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          {open && step === 'brand' && (
            <div className="absolute z-50 mt-1 w-full bg-white rounded-xl border border-slate-200 shadow-lg max-h-60 overflow-y-auto">
              {brandResults.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-slate-400">Aucune marque trouvée</div>
              ) : (
                brandResults.map((b, i) => (
                  <button
                    key={b.id}
                    type="button"
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => pickBrand(b.id, b.label)}
                    className={`w-full text-left px-3 py-2.5 text-sm transition-colors first:rounded-t-xl last:rounded-b-xl ${i === highlight ? 'bg-orange-50 text-orange-700' : 'text-slate-700 hover:bg-slate-50'}`}
                  >
                    {highlightMatch(b.label, query)}
                  </button>
                ))
              )}
            </div>
          )}

          {open && step === 'model' && brand && (
            <div className="absolute z-50 mt-1 w-full bg-white rounded-xl border border-slate-200 shadow-lg max-h-60 overflow-y-auto">
              {modelResults.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-slate-400">Aucun modèle trouvé</div>
              ) : (
                modelResults.map((m, i) => (
                  <button
                    key={m.id}
                    type="button"
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => pickModel(m.id, m.label)}
                    className={`w-full text-left px-3 py-2.5 text-sm transition-colors first:rounded-t-xl last:rounded-b-xl ${i === highlight ? 'bg-orange-50 text-orange-700' : 'text-slate-700 hover:bg-slate-50'}`}
                  >
                    {highlightMatch(m.label, query)}
                  </button>
                ))
              )}
            </div>
          )}

          {open && step === 'year' && model && (
            <div className="absolute z-50 mt-1 w-full bg-white rounded-xl border border-slate-200 shadow-lg max-h-60 overflow-y-auto">
              <div className="grid grid-cols-4 gap-1 p-2">
                {model.years.map((y, i) => (
                  <button
                    key={y}
                    type="button"
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => pickYear(y)}
                    className={`px-2 py-2 rounded-lg text-sm font-medium transition-colors ${i === highlight ? 'bg-orange-500 text-white' : 'text-slate-700 hover:bg-orange-50'}`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
