import { useState, useRef, useEffect } from 'react';
import { Search, X, Check } from 'lucide-react';
import { VEHICLE_CATALOG, normalize, type VehicleBrand } from '@/lib/vehiclesCatalog';

interface BrandMultiSelectProps {
  selected: string[];
  onChange: (brandIds: string[]) => void;
  placeholder?: string;
}

export default function BrandMultiSelect({ selected, onChange, placeholder = 'Rechercher une marque...' }: BrandMultiSelectProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered: VehicleBrand[] = (() => {
    if (!query.trim()) return VEHICLE_CATALOG;
    const n = normalize(query);
    return VEHICLE_CATALOG.filter(b => normalize(b.label).includes(n));
  })();

  useEffect(() => {
    setHighlightIndex(0);
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleBrand = (brandId: string) => {
    onChange(selected.includes(brandId)
      ? selected.filter(id => id !== brandId)
      : [...selected, brandId]);
  };

  const removeBrand = (brandId: string) => {
    onChange(selected.filter(id => id !== brandId));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !query && selected.length > 0) {
      removeBrand(selected[selected.length - 1]);
    } else if (e.key === 'ArrowDown' && open) {
      e.preventDefault();
      setHighlightIndex(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp' && open) {
      e.preventDefault();
      setHighlightIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && open && filtered[highlightIndex]) {
      e.preventDefault();
      toggleBrand(filtered[highlightIndex].id);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div
        onClick={() => { setOpen(true); inputRef.current?.focus(); }}
        className="min-h-[48px] w-full rounded-lg border border-slate-200 bg-white p-2 flex flex-wrap gap-1.5 items-center cursor-text focus-within:ring-2 focus-within:ring-blue-400 focus-within:border-blue-400 transition-shadow"
      >
        {selected.map(brandId => {
          const brand = VEHICLE_CATALOG.find(b => b.id === brandId);
          if (!brand) return null;
          return (
            <span
              key={brandId}
              className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-medium pl-2.5 pr-1 py-1 rounded-full"
            >
              {brand.label}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeBrand(brandId); }}
                className="hover:bg-blue-100 rounded-full p-0.5 transition-colors"
                aria-label={`Retirer ${brand.label}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          );
        })}
        <div className="relative flex-1 min-w-[120px]">
          <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={selected.length === 0 ? placeholder : ''}
            className="w-full pl-8 pr-2 py-1.5 text-sm outline-none bg-transparent"
          />
        </div>
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-lg shadow-lg border border-slate-200 max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-sm text-slate-400 text-center">Aucune marque trouvée</div>
          ) : (
            filtered.map((brand, i) => {
              const isSelected = selected.includes(brand.id);
              return (
                <button
                  key={brand.id}
                  type="button"
                  onMouseEnter={() => setHighlightIndex(i)}
                  onClick={() => toggleBrand(brand.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-sm transition-colors text-left ${
                    i === highlightIndex ? 'bg-blue-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <span className={`font-medium ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>
                    {brand.label}
                  </span>
                  {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
