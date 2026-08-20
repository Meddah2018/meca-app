import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { GarageProfile } from '@/lib/database.types';
import { MapPin, Building2, ChevronRight } from 'lucide-react';
import { getErrorMessage } from '@/lib/errors';
import { useLanguage } from '@/contexts/LanguageContext';

const WILAYAS = [
  'Adrar','Chlef','Laghouat','Oum El Bouaghi','Batna','Béjaïa','Biskra','Béchar',
  'Blida','Bouira','Tamanrasset','Tébessa','Tlemcen','Tiaret','Tizi Ouzou','Alger',
  'Djelfa','Jijel','Sétif','Saïda','Skikda','Sidi Bel Abbès','Annaba','Guelma',
  'Constantine','Médéa','Mostaganem','MSila','Mascara','Ouargla','Oran','El Bayadh',
  'Illizi','Bordj Bou Arréridj','Boumerdès','El Tarf','Tindouf','Tissemsilt',
  'El Oued','Khenchela','Souk Ahras','Tipaza','Mila','Aïn Defla','Naâma',
  'Aïn Témouchent','Ghardaïa','Relizane','Timimoun','Bordj Badji Mokhtar',
  'Ouled Djellal','Béni Abbès','In Salah','In Guezzam','Touggourt','Djanet',
  'El MGhair','El Meniaa'
];

interface OnboardingMechanicProps {
  onComplete: () => void;
}

export default function OnboardingMechanic({ onComplete }: OnboardingMechanicProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [form, setForm] = useState({ garage_name: '', address: '', city: '', wilaya: 'Alger' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [existing, setExisting] = useState<GarageProfile | null>(null);
  const [checkDone, setCheckDone] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('garage_profiles').select('*').eq('user_id', user.id).maybeSingle().then(({ data }) => {
      if (data) setExisting(data);
      setCheckDone(true);
    });
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError('');
    setLoading(true);
    try {
      if (existing) {
        const { error: err } = await supabase.from('garage_profiles').update(form).eq('id', existing.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('garage_profiles').insert({ ...form, user_id: user.id });
        if (err) throw err;
      }
      onComplete();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (!checkDone) return <div className="flex-1 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" /></div>;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 text-white">
          <Building2 className="w-8 h-8 mb-2" />
          <h1 className="text-xl font-bold">{t('onboarding.mechanic.title')}</h1>
          <p className="text-orange-100 text-sm mt-1">{t('onboarding.mechanic.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              <Building2 className="inline w-3.5 h-3.5 me-1" />{t('onboarding.mechanic.garageNameLabel')}
            </label>
            <input
              type="text"
              value={form.garage_name}
              onChange={e => setForm(f => ({ ...f, garage_name: e.target.value }))}
              required
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none"
              placeholder={t('onboarding.mechanic.garageNamePlaceholder')}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              <MapPin className="inline w-3.5 h-3.5 me-1" />{t('onboarding.mechanic.addressLabel')}
            </label>
            <input
              type="text"
              value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              required
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none"
              placeholder={t('onboarding.mechanic.addressPlaceholder')}
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
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none"
                placeholder={t('onboarding.mechanic.cityPlaceholder')}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">{t('onboarding.common.wilaya')}</label>
              <select
                value={form.wilaya}
                onChange={e => setForm(f => ({ ...f, wilaya: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none bg-white"
              >
                {WILAYAS.map(w => <option key={w}>{w}</option>)}
              </select>
            </div>
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {loading ? t('onboarding.common.saving') : t('onboarding.common.continue')}
            <ChevronRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
