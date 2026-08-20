import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Order, Offer, Profile, GarageProfile, SupplierProfile } from '@/lib/database.types';
import DashboardLayout from '@/components/DashboardLayout';
import { Truck, Package, CheckCircle2, Navigation, ArrowLeft, Settings } from 'lucide-react';
import { formatDeliveryDate } from '@/lib/delivery';
import { fetchPublicProfiles } from '@/lib/publicProfiles';
import AccountSettings from '@/components/AccountSettings';
import { useLanguage } from '@/contexts/LanguageContext';

interface EnrichedOrder extends Order {
  offer?: Offer;
  mechanic_profile?: Profile;
  garage?: GarageProfile;
  supplier_profile?: SupplierProfile;
  mechanic_ref?: string;
  supplier_ref?: string;
}

const STATUS_STYLES: Record<string, string> = {
  to_pickup: 'bg-amber-50 text-amber-700',
  in_delivery: 'bg-blue-50 text-blue-700',
  delivered: 'bg-green-50 text-green-700',
};

export default function DeliveryDashboard() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('active');
  const [orders, setOrders] = useState<EnrichedOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    const enriched: EnrichedOrder[] = [];
    const mechIds: string[] = [];
    const supIds: string[] = [];
    for (const o of data ?? []) {
      const { data: offer } = await supabase.from('offers').select('*').eq('id', o.offer_id).maybeSingle();
      const { data: gar } = await supabase.from('garage_profiles').select('*').eq('user_id', o.mechanic_id).maybeSingle();
      const { data: sup } = await supabase.from('supplier_profiles').select('*').eq('user_id', o.supplier_id).maybeSingle();
      enriched.push({ ...o, offer: offer ?? undefined, garage: gar ?? undefined, supplier_profile: sup ?? undefined });
      mechIds.push(o.mechanic_id);
      supIds.push(o.supplier_id);
    }
    const [mechMap, supMap] = await Promise.all([
      fetchPublicProfiles(mechIds),
      fetchPublicProfiles(supIds),
    ]);
    for (const o of enriched) {
      o.mechanic_ref = mechMap.get(o.mechanic_id)?.anonymous_reference;
      o.supplier_ref = supMap.get(o.supplier_id)?.anonymous_reference;
    }
    setOrders(enriched);
  }, []);

  useEffect(() => {
    loadOrders().finally(() => setLoading(false));
    const channel = supabase.channel('delivery-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => loadOrders())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadOrders]);

  const updateStatus = async (orderId: string, status: 'in_delivery' | 'delivered') => {
    await supabase.from('orders').update({ delivery_status: status }).eq('id', orderId);
    await loadOrders();
  };

  const toPickup = orders.filter(o => o.delivery_status === 'to_pickup');
  const inDelivery = orders.filter(o => o.delivery_status === 'in_delivery');
  const delivered = orders.filter(o => o.delivery_status === 'delivered');

  const navItems = [
    { id: 'dashboard', label: t('delivery.navHome'), icon: <Truck className="w-5 h-5" /> },
    { id: 'active', label: t('delivery.navActive'), icon: <Truck className="w-5 h-5" /> },
    { id: 'to_pickup', label: t('delivery.navToPickup'), icon: <Package className="w-5 h-5" /> },
    { id: 'delivered', label: t('delivery.navDelivered'), icon: <CheckCircle2 className="w-5 h-5" /> },
    { id: 'settings', label: t('delivery.navSettings'), icon: <Settings className="w-5 h-5" /> },
  ];

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" /></div>;
  }

  const displayed = activeTab === 'active' ? [...toPickup, ...inDelivery] : activeTab === 'to_pickup' ? toPickup : activeTab === 'delivered' ? delivered : [];

  return (
    <DashboardLayout navItems={navItems} activeTab={activeTab} onTabChange={setActiveTab} accentColor="green">
      {activeTab === 'dashboard' && (
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{t('delivery.dashboardTitle')}</h1>
            <p className="text-slate-500 text-sm mt-1">{t('delivery.dashboardSubtitle')}</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <button onClick={() => setActiveTab('to_pickup')} className="bg-white rounded-xl border border-slate-200 p-4 text-start transition-all hover:shadow-md hover:-translate-y-0.5">
              <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-2"><Package className="w-5 h-5" /></div>
              <div className="text-xl font-bold text-slate-800">{toPickup.length}</div>
              <div className="text-xs text-slate-400">{t('delivery.navToPickup')}</div>
            </button>
            <button onClick={() => setActiveTab('active')} className="bg-white rounded-xl border border-slate-200 p-4 text-start transition-all hover:shadow-md hover:-translate-y-0.5">
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-2"><Truck className="w-5 h-5" /></div>
              <div className="text-xl font-bold text-slate-800">{inDelivery.length}</div>
              <div className="text-xs text-slate-400">{t('delivery.statusInDelivery')}</div>
            </button>
            <button onClick={() => setActiveTab('delivered')} className="bg-white rounded-xl border border-slate-200 p-4 text-start transition-all hover:shadow-md hover:-translate-y-0.5">
              <div className="w-9 h-9 rounded-lg bg-green-50 text-green-600 flex items-center justify-center mb-2"><CheckCircle2 className="w-5 h-5" /></div>
              <div className="text-xl font-bold text-slate-800">{delivered.length}</div>
              <div className="text-xs text-slate-400">{t('delivery.navDelivered')}</div>
            </button>
          </div>
        </div>
      )}

      {activeTab !== 'dashboard' && (
      <div className="space-y-4">
        <button onClick={() => setActiveTab('dashboard')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-green-600 font-medium transition-colors">
          <ArrowLeft className="w-4 h-4" />
          {t('delivery.back')}
        </button>

        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {activeTab === 'active' ? t('delivery.titleActive') : activeTab === 'to_pickup' ? t('delivery.titleToPickup') : t('delivery.titleDelivered')}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {activeTab === 'active' ? t('delivery.subtitleActive') : activeTab === 'to_pickup' ? t('delivery.subtitleToPickup') : t('delivery.subtitleDelivered')}
          </p>
        </div>

        {displayed.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
            <Truck className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>{t('delivery.emptyState')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayed.map(o => (
              <DeliveryCard key={o.id} order={o} onUpdate={updateStatus} />
            ))}
          </div>
        )}
      </div>
      )}

      {activeTab === 'settings' && <AccountSettings />}
    </DashboardLayout>
  );
}

function DeliveryCard({ order, onUpdate }: { order: EnrichedOrder; onUpdate: (id: string, status: 'in_delivery' | 'delivered') => void }) {
  const { t } = useLanguage();
  const STATUS_LABELS: Record<string, string> = {
    to_pickup: t('delivery.statusToPickup'),
    in_delivery: t('delivery.statusInDelivery'),
    delivered: t('delivery.statusDelivered'),
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-11 h-11 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
          <Package className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-slate-800">{order.offer?.part_name ?? t('delivery.defaultPartName')}</div>
          <div className="text-sm text-slate-500">{order.offer?.part_brand} {order.offer?.reference ? `· ${order.offer.reference}` : ''}</div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full inline-block mt-1 ${STATUS_STYLES[order.delivery_status]}`}>{STATUS_LABELS[order.delivery_status]}</span>
        </div>
        <div className="text-end shrink-0">
          <div className="text-lg font-bold text-slate-800">{order.cash_amount} DA</div>
          {order.delivery_date && <div className="text-xs text-slate-400">{formatDeliveryDate(new Date(order.delivery_date))}</div>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm border-t border-slate-100 pt-3">
        <div className="flex items-start gap-2">
          <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 text-xs font-bold">F</div>
          <div className="min-w-0">
            <div className="text-xs text-slate-400 font-semibold uppercase">{t('delivery.pickupLabel')}</div>
            <div className="font-medium text-slate-700 truncate">{order.supplier_ref ?? t('delivery.defaultSupplier')}</div>
            <div className="text-xs text-slate-500 truncate">{order.supplier_profile?.address}, {order.supplier_profile?.city}</div>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <div className="w-7 h-7 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 text-xs font-bold">M</div>
          <div className="min-w-0">
            <div className="text-xs text-slate-400 font-semibold uppercase">{t('delivery.deliveryLabel')}</div>
            <div className="font-medium text-slate-700 truncate">{order.garage?.garage_name ?? order.mechanic_ref ?? t('delivery.defaultMechanic')}</div>
            <div className="text-xs text-slate-500 truncate">{order.garage?.address}, {order.garage?.city}</div>
          </div>
        </div>
      </div>

      {order.mechanic_ref && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
          <Navigation className="w-3 h-3" />
          {order.mechanic_ref}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        {order.delivery_status === 'to_pickup' && (
          <button onClick={() => onUpdate(order.id, 'in_delivery')} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5">
            <Navigation className="w-4 h-4" />
            {t('delivery.startDelivery')}
          </button>
        )}
        {order.delivery_status === 'in_delivery' && (
          <button onClick={() => onUpdate(order.id, 'delivered')} className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            {t('delivery.markDelivered')}
          </button>
        )}
      </div>
    </div>
  );
}
