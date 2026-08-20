import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { SupplierProfile } from '@/lib/database.types';
import { MapPin, ChevronRight, Package, Car } from 'lucide-react';
import BrandMultiSelect from '@/components/BrandMultiSelect';
import { getErrorMessage } from '@/lib/errors';
import { useLanguage } from '@/contexts/LanguageContext';

const WILAYAS = [
  'Adrar','Chlef','Laghouat','Oum El Bouaghi','Batna','Béjaïa','Biskra','Béchar',
  'Blida','Bouira','Tamanrasset','Tébessa','Tlemcen','Tiaret','Tizi Ouzou','Alger',
  'Djelfa','Jijel','Sétif','Saïda','Skikda','Sidi Bel Abbès','Annaba','Guelma',
  'Constantine','Médéa','Mostaganem','MSila','Mascara','Ouargla','Oran','El Bayadh',
  'Illizi','Bordj Bou Arréridj','Boumerdès','El Tarf','Tindouf','Tissemsilt',
  'El Oued','Khenchela','Souk Ahras','Tipaza','Mila','Aïn Defla','Naâma',
  'Aïn Témouchent','Ghardaïa','Relizane'
];

const SPECIALTIES_OPTIONS = [
  'Freinage','Suspension','Moteur','Transmission','Électrique','Carrosserie',
  'Filtration','Refroidissement','Climatisation','Pneumatiques','Échappement','Toutes pièces'
];

interface OnboardingSupplierProps {
  onComplete: () => void;
}

export default function OnboardingSupplier({ onComplete }: OnboardingSupplierProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [form, setForm] = useState({ company_name: '', address: '', city: '', wilaya: 'Alger', zone: '', specialties: '' });
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [existing, setExisting] = useState<SupplierProfile | null>(null);
  const [checkDone, setCheckDone] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('supplier_profiles').select('*').eq('user_id', user.id).maybeSingle().then(async ({ data }) => {
      if (data) {
        setExisting(data);
        setSelectedSpecs(data.specialties ? data.specialties.split(',').map((s: string) => s.trim()) : []);
        const { data: brands } = await supabase.from('supplier_brands').select('*').eq('supplier_id', data.id);
        setSelectedBrands((brands ?? []).map((b: { brand_id: string }) => b.brand_id));
      }
      setCheckDone(true);
    });
  }, [user]);

  const toggleSpec = (s: string) => {
    setSelectedSpecs(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError('');
    setLoading(true);
    const payload = { ...form, specialties: selectedSpecs.join(', ') };
    try {
      let supplierId: string;
      if (existing) {
        const { error: err } = await supabase.from('supplier_profiles').update(payload).eq('id', existing.id);
        if (err) throw err;
        supplierId = existing.id;
      } else {
        const { data: inserted, error: err } = await supabase.from('supplier_profiles').insert({ ...payload, user_id: user.id }).select().single();
        if (err) throw err;
        supplierId = inserted.id;
      }
      // Sync brand links
      const { data: currentBrands } = await supabase.from('supplier_brands').select('brand_id').eq('supplier_id', supplierId);
      const currentSet = new Set((currentBrands ?? []).map((b: { brand_id: string }) => b.brand_id));
      const newSet = new Set(selectedBrands);
      const toDelete = [...currentSet].filter(b => !newSet.has(b));
      const toInsert = [...newSet].filter(b => !currentSet.has(b));
      if (toDelete.length > 0) {
        await supabase.from('supplier_brands').delete().eq('supplier_id', supplierId).in('brand_id', toDelete);
      }
      if (toInsert.length > 0) {
        await supabase.from('supplier_brands').insert(toInsert.map(brand_id => ({ supplier_id: supplierId, brand_id })));
      }
      onComplete();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (!checkDone) return <div className="flex-1 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
          <Package className="w-8 h-8 mb-2" />
          <h1 className="text-xl font-bold">{t('onboarding.supplier.title')}</h1>
          <p className="text-blue-100 text-sm mt-1">{t('onboarding.supplier.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">{t('onboarding.supplier.companyNameLabel')}</label>
            <input
              type="text"
              value={form.company_name}
              onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
              required
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none"
              placeholder={t('onboarding.supplier.companyNamePlaceholder')}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              <MapPin className="inline w-3.5 h-3.5 me-1" />{t('onboarding.supplier.addressLabel')}
            </label>
            <input
              type="text"
              value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              required
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none"
              placeholder={t('onboarding.supplier.addressPlaceholder')}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">{t('onboarding.common.city')}</label>
              <input
                type="text"
                value={form.city}
                onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                required
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">{t('onboarding.common.wilaya')}</label>
              <select
                value={form.wilaya}
                onChange={e => setForm(f => ({ ...f, wilaya: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none bg-white"
              >
                {WILAYAS.map(w => <option key={w}>{w}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">{t('onboarding.supplier.zoneLabel')}</label>
            <input
              type="text"
              value={form.zone}
              onChange={e => setForm(f => ({ ...f, zone: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none"
              placeholder={t('onboarding.supplier.zonePlaceholder')}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">
              <Car className="inline w-3.5 h-3.5 me-1" />{t('onboarding.supplier.brandsLabel')}
            </label>
            <BrandMultiSelect selected={selectedBrands} onChange={setSelectedBrands} />
            <p className="text-xs text-slate-400 mt-1.5">{t('onboarding.supplier.brandsHelp')}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">{t('onboarding.supplier.specialtiesLabel')}</label>
            <div className="flex flex-wrap gap-2">
              {SPECIALTIES_OPTIONS.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSpec(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    selectedSpecs.includes(s)
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {loading ? t('onboarding.common.saving') : t('onboarding.common.continue')}
            <ChevronRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
