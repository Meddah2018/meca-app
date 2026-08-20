import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import type { Request, Offer, Order, Profile, Reversement } from '@/lib/database.types';
import DashboardLayout from '@/components/DashboardLayout';
import BrandMultiSelect from '@/components/BrandMultiSelect';
import PartSearchInput from '@/components/PartSearchInput';
import { getBrand } from '@/lib/vehiclesCatalog';
import { Search, Package, CheckCircle2, MapPin, Tag, Truck, X, AlertCircle, Send, CreditCard as Edit3, Wallet, TrendingUp, History, Filter, Calendar, Star, Car, Settings as SettingsIcon, ArrowLeft, Pencil, Award } from 'lucide-react';
import { fetchPublicProfiles } from '@/lib/publicProfiles';
import AccountSettings from '@/components/AccountSettings';
import { getErrorMessage } from '@/lib/errors';
import { updateAppBadge } from '@/lib/appBadge';

interface RequestWithMechanic extends Request {
  mechanic_profile?: Profile;
  mechanic_ref?: string;
}

interface OrderWithOffer extends Order {
  offer?: Offer;
}

interface SupplierHistoryItem {
  offer: Offer;
  request: Request;
  order: Order | null;
  mechanic: Profile | null;
  mechanic_ref: string | null;
  rating: { score: number; comment: string | null } | null;
}

type PeriodFilter = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';

function statusLabel(t: (key: string) => string, status: string): string {
  return t(`supplier.status.${status}`);
}

export default function SupplierDashboard() {
  const { profile, supplierProfile, supplierBrands, refreshProfile } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [openRequests, setOpenRequests] = useState<RequestWithMechanic[]>([]);
  const [myOffers, setMyOffers] = useState<Offer[]>([]);
  const [competingOffersByRequest, setCompetingOffersByRequest] = useState<Map<string, Offer[]>>(new Map());
  const [competingSupplierRefs, setCompetingSupplierRefs] = useState<Map<string, string>>(new Map());
  const [orders, setOrders] = useState<OrderWithOffer[]>([]);
  const [reversements, setReversements] = useState<Reversement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<RequestWithMechanic | null>(null);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [showBrandModal, setShowBrandModal] = useState(false);

  // History tab state
  const [historyItems, setHistoryItems] = useState<SupplierHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [historyDetail, setHistoryDetail] = useState<SupplierHistoryItem | null>(null);

  const loadData = useCallback(async () => {
    if (!profile) return;
    const [reqRes, offersRes, ordersRes, revRes] = await Promise.all([
      supabase.from('requests').select('*').eq('status', 'open').order('created_at', { ascending: false }),
      supabase.from('offers').select('*').eq('supplier_id', profile.id).order('created_at', { ascending: false }),
      supabase.from('orders').select('*').eq('supplier_id', profile.id).order('created_at', { ascending: false }),
      supabase.from('reversements').select('*').eq('supplier_id', profile.id).order('created_at', { ascending: false }),
    ]);

    const reqs = (reqRes.data ?? []) as RequestWithMechanic[];
    const mechIds = reqs.map(r => r.mechanic_id);
    const pubMap = await fetchPublicProfiles(mechIds);
    for (const r of reqs) {
      r.mechanic_ref = pubMap.get(r.mechanic_id)?.anonymous_reference;
    }
    setOpenRequests(reqs);

    const ords = (ordersRes.data ?? []) as OrderWithOffer[];
    for (const o of ords) {
      const { data: off } = await supabase.from('offers').select('*').eq('id', o.offer_id).maybeSingle();
      o.offer = off;
    }
    setOrders(ords);
    const mine = offersRes.data ?? [];
    setMyOffers(mine);
    setReversements(revRes.data ?? []);

    // Fetch competing offers (other suppliers) on requests where I have an active offer
    const activeRequestIds = Array.from(new Set(mine.filter(o => o.status === 'active').map(o => o.request_id)));
    if (activeRequestIds.length > 0) {
      const { data: allOffers } = await supabase.from('offers').select('*').in('request_id', activeRequestIds);
      const byRequest = new Map<string, Offer[]>();
      const otherSupplierIds = new Set<string>();
      for (const o of allOffers ?? []) {
        if (!byRequest.has(o.request_id)) byRequest.set(o.request_id, []);
        byRequest.get(o.request_id)!.push(o);
        if (o.supplier_id !== profile.id) otherSupplierIds.add(o.supplier_id);
      }
      setCompetingOffersByRequest(byRequest);
      setCompetingSupplierRefs(await fetchPublicProfiles(Array.from(otherSupplierIds)).then(m => {
        const refs = new Map<string, string>();
        m.forEach((v, k) => refs.set(k, v.anonymous_reference));
        return refs;
      }));
    } else {
      setCompetingOffersByRequest(new Map());
      setCompetingSupplierRefs(new Map());
    }
  }, [profile]);

  const loadHistory = useCallback(async () => {
    if (!profile) return;
    setHistoryLoading(true);
    try {
      const { data: offers } = await supabase
        .from('offers')
        .select('*')
        .eq('supplier_id', profile.id)
        .eq('status', 'selected')
        .order('created_at', { ascending: false });

      if (!offers || offers.length === 0) {
        setHistoryItems([]);
        return;
      }

      const reqIds = Array.from(new Set(offers.map(o => o.request_id)));
      const { data: reqs } = await supabase
        .from('requests')
        .select('*')
        .in('id', reqIds)
        .eq('status', 'closed')
        .order('created_at', { ascending: false });

      if (!reqs || reqs.length === 0) {
        setHistoryItems([]);
        return;
      }

      const closedReqIds = new Set(reqs.map(r => r.id));
      const offersFromClosed = offers.filter(o => closedReqIds.has(o.request_id));

      const offerIdsForOrders = offersFromClosed.map(o => o.id);
      const { data: deliveredOrders } = offerIdsForOrders.length > 0
        ? await supabase.from('orders').select('*').in('offer_id', offerIdsForOrders).eq('delivery_status', 'delivered')
        : Promise.resolve({ data: [], error: null });

      const deliveredOfferIds = new Set((deliveredOrders ?? []).map((o: { offer_id: string }) => o.offer_id));
      const relevantOffers = offersFromClosed.filter(o => deliveredOfferIds.has(o.id));

      if (relevantOffers.length === 0) {
        setHistoryItems([]);
        return;
      }

      const offerIds = relevantOffers.map(o => o.id);
      const mechanicIds = Array.from(new Set(reqs.map(r => r.mechanic_id)));

      const [{ data: ratings }, pubMap] = await Promise.all([
        offerIds.length > 0
          ? supabase.from('ratings').select('*').in('order_id', (deliveredOrders ?? []).map((o: { id: string }) => o.id))
          : Promise.resolve({ data: [], error: null }),
        fetchPublicProfiles(mechanicIds),
      ]);

      const reqMap = new Map<string, Request>();
      reqs.forEach(r => reqMap.set(r.id, r));

      const orderMap = new Map<string, Order>();
      (deliveredOrders ?? []).forEach((o: Order) => orderMap.set(o.offer_id, o));

      const ratingMap = new Map<string, { score: number; comment: string | null }>();
      (ratings ?? []).forEach((r: { order_id: string; score: number; comment: string | null }) =>
        ratingMap.set(r.order_id, { score: r.score, comment: r.comment })
      );

      const items: SupplierHistoryItem[] = relevantOffers.map(offer => {
        const request = reqMap.get(offer.request_id)!;
        const order = orderMap.get(offer.id) ?? null;
        const mechanic_ref = pubMap.get(request.mechanic_id)?.anonymous_reference ?? null;
        const rating = order ? ratingMap.get(order.id) ?? null : null;
        return { offer, request, order, mechanic: null, mechanic_ref, rating };
      });

      items.sort((a, b) => {
        const dateA = a.order?.created_at ?? a.offer.created_at;
        const dateB = b.order?.created_at ?? b.offer.created_at;
        return dateB.localeCompare(dateA);
      });

      setHistoryItems(items);
    } finally {
      setHistoryLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    loadData().finally(() => setLoading(false));

    const reqChannel = supabase.channel('supplier-requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, () => loadData())
      .subscribe();
    const offerChannel = supabase.channel('supplier-offers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'offers', filter: `supplier_id=eq.${profile.id}` }, () => loadData())
      .subscribe();
    const orderChannel = supabase.channel('supplier-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `supplier_id=eq.${profile.id}` }, () => loadData())
      .subscribe();

    return () => {
      supabase.removeChannel(reqChannel);
      supabase.removeChannel(offerChannel);
      supabase.removeChannel(orderChannel);
    };
  }, [profile, loadData]);

  useEffect(() => {
    if (activeTab === 'history') loadHistory();
  }, [activeTab, loadHistory]);

  const selectedOffers = myOffers.filter(o => {
    if (o.status !== 'selected') return false;
    const order = orders.find(ord => ord.offer_id === o.id);
    return order?.delivery_status === 'to_pickup';
  });

  // Demandes ouvertes sans offre active du fournisseur (les demandes déjà offertes vivent dans "Offres actives")
  const openRequestsWithoutOffer = useMemo(
    () => openRequests.filter(req => !myOffers.some(o => o.request_id === req.id && o.status === 'active')),
    [openRequests, myOffers]
  );

  useEffect(() => {
    updateAppBadge(openRequestsWithoutOffer.length + selectedOffers.length);
  }, [openRequestsWithoutOffer.length, selectedOffers.length]);

  const stats = {
    openRequests: openRequestsWithoutOffer.length,
    activeOffers: myOffers.filter(o => o.status === 'active').length,
    selectedOffers: selectedOffers.length,
    activeOrders: orders.filter(o => o.delivery_status !== 'delivered').length,
    soldParts: orders.filter(o => o.delivery_status === 'delivered').length,
    pendingPayouts: reversements.filter(r => r.status === 'pending').reduce((s, r) => s + Number(r.net_amount), 0),
  };

  const navItems = [
    { id: 'dashboard', label: t('supplier.nav.dashboard'), icon: <Package className="w-5 h-5" /> },
    { id: 'requests', label: t('supplier.nav.requests'), icon: <Search className="w-5 h-5" /> },
    { id: 'offers', label: t('supplier.nav.offers'), icon: <Tag className="w-5 h-5" /> },
    { id: 'selected', label: t('supplier.nav.selected'), icon: <Award className="w-5 h-5" /> },
    { id: 'history', label: t('supplier.nav.history'), icon: <History className="w-5 h-5" /> },
    { id: 'payouts', label: t('supplier.nav.payouts'), icon: <Wallet className="w-5 h-5" /> },
    { id: 'settings', label: t('supplier.nav.settings'), icon: <SettingsIcon className="w-5 h-5" /> },
  ];

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  }

  return (
    <DashboardLayout
      navItems={navItems}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      accentColor="blue"
    >
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={<Search className="w-5 h-5" />} label={t('supplier.stats.openRequests')} value={stats.openRequests} color="blue" onClick={() => setActiveTab('requests')} />
            <StatCard icon={<Tag className="w-5 h-5" />} label={t('supplier.stats.activeOffers')} value={stats.activeOffers} color="indigo" onClick={() => setActiveTab('offers')} />
            <StatCard icon={<Award className="w-5 h-5" />} label={t('supplier.stats.selectedOffers')} value={stats.selectedOffers} color="green" onClick={() => setActiveTab('selected')} />
            <StatCard icon={<Truck className="w-5 h-5" />} label={t('supplier.stats.soldParts')} value={stats.soldParts} color="amber" onClick={() => setActiveTab('history')} />
          </div>
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="space-y-4">
          <button onClick={() => setActiveTab('dashboard')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 font-medium transition-colors">
            <ArrowLeft className="w-4 h-4" />
            {t('supplier.common.back')}
          </button>
          <h1 className="text-2xl font-bold text-slate-800">{t('supplier.requests.title')}</h1>
          {openRequestsWithoutOffer.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>{t('supplier.requests.empty')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {openRequestsWithoutOffer.map(req => (
                <button key={req.id} onClick={() => setSelectedRequest(req)} className="w-full flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-200 hover:shadow-sm transition-all text-start">
                  <div className={`w-11 h-11 rounded-lg flex items-center justify-center text-white shrink-0 ${req.urgency === 'urgent' ? 'bg-red-500' : 'bg-blue-600'}`}>
                    <Package className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-800">{req.vehicle_make} {req.vehicle_model} {req.vehicle_year || ''}</div>
                    <div className="text-sm text-slate-500 truncate">{req.description || req.part_name || t('supplier.requests.noDescription')}</div>
                    {req.mechanic_ref && <div className="text-xs text-slate-400 mt-0.5">{req.mechanic_ref}</div>}
                  </div>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0 bg-amber-50 text-amber-700">{t('supplier.status.open')}</span>
                  {req.urgency === 'urgent' && <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">{t('supplier.common.urgent')}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'offers' && (
        <div className="space-y-4">
          <button onClick={() => setActiveTab('dashboard')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 font-medium transition-colors">
            <ArrowLeft className="w-4 h-4" />
            {t('supplier.common.back')}
          </button>
          <h1 className="text-2xl font-bold text-slate-800">{t('supplier.offer.title')}</h1>
          {myOffers.filter(o => o.status === 'active').length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
              <Tag className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>{t('supplier.offer.empty')}</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 px-4 divide-y-4 divide-slate-400">
              {myOffers.filter(o => o.status === 'active').map(offer => {
                const req = openRequests.find(r => r.id === offer.request_id);
                return (
                  <div key={offer.id} className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600 shrink-0">
                        <Tag className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-0.5 text-sm">
                        <div className="text-slate-700 truncate"><span className="font-medium text-slate-400">{t('supplier.offer.brandLabel')} </span>{offer.part_brand}</div>
                        <div className="text-slate-700 truncate"><span className="font-medium text-slate-400">{t('supplier.offer.priceLabel')} </span>{offer.net_price} DA</div>
                        <div className="text-slate-700 truncate"><span className="font-medium text-slate-400">{t('supplier.offer.partLabel')} </span>{requestPartLabel(t, req)}{req && req.quantity > 1 ? ` (x${req.quantity})` : ''}</div>
                        <div className="text-slate-700 truncate"><span className="font-medium text-slate-400">{t('supplier.offer.vehicleLabel')} </span>{requestVehicleLabel(req)}</div>
                      </div>
                      <button
                        onClick={() => { setEditingOffer(offer); setShowOfferForm(true); if (req) setSelectedRequest(req); }}
                        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition-colors shrink-0"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        {t('supplier.common.edit')}
                      </button>
                    </div>
                    <CompetingOffers offer={offer} req={req} competingOffersByRequest={competingOffersByRequest} competingSupplierRefs={competingSupplierRefs} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'selected' && (
        <div className="space-y-4">
          <button onClick={() => setActiveTab('dashboard')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 font-medium transition-colors">
            <ArrowLeft className="w-4 h-4" />
            {t('supplier.common.back')}
          </button>
          <h1 className="text-2xl font-bold text-slate-800">{t('supplier.selected.title')}</h1>
          <p className="text-sm text-slate-500">{t('supplier.selected.subtitle')}</p>
          {selectedOffers.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
              <Award className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>{t('supplier.selected.empty')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedOffers.map(offer => {
                const order = orders.find(o => o.offer_id === offer.id);
                return (
                  <div key={offer.id} className="flex items-center gap-3 p-4 bg-white rounded-xl border border-green-200 hover:border-green-300 transition-colors">
                    <div className="w-11 h-11 rounded-lg flex items-center justify-center bg-green-50 text-green-600 shrink-0">
                      <Award className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-800 truncate">{offer.part_name}</div>
                      <div className="text-sm text-slate-500 truncate">
                        {offer.part_brand} · {offer.displayed_price} DA · {offer.delivery_estimate}
                      </div>
                      {order && (
                        <div className="text-xs mt-0.5">
                          <span className={`font-medium px-2 py-0.5 rounded-full ${order.delivery_status === 'to_pickup' ? 'bg-amber-50 text-amber-700' : order.delivery_status === 'in_delivery' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>
                            {statusLabel(t, order.delivery_status)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          <button onClick={() => setActiveTab('dashboard')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 font-medium transition-colors">
            <ArrowLeft className="w-4 h-4" />
            {t('supplier.common.back')}
          </button>
          <SupplierHistoryView
          items={historyItems}
          loading={historyLoading}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          periodFilter={periodFilter}
          setPeriodFilter={setPeriodFilter}
          customFrom={customFrom}
          setCustomFrom={setCustomFrom}
          customTo={customTo}
          setCustomTo={setCustomTo}
          onOpen={setHistoryDetail}
        />
        </div>
      )}

      {activeTab === 'payouts' && (
        <div className="space-y-4">
          <button onClick={() => setActiveTab('dashboard')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 font-medium transition-colors">
            <ArrowLeft className="w-4 h-4" />
            {t('supplier.common.back')}
          </button>
          <h1 className="text-2xl font-bold text-slate-800">{t('supplier.payouts.title')}</h1>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center"><TrendingUp className="w-5 h-5" /></div>
              <div>
                <div className="text-sm text-slate-500">{t('supplier.payouts.totalPending')}</div>
                <div className="text-2xl font-bold text-slate-800">{stats.pendingPayouts} DA</div>
              </div>
            </div>
            {reversements.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-6">{t('supplier.payouts.empty')}</p>
            ) : (
              <div className="space-y-2">
                {reversements.map(rev => (
                  <div key={rev.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100">
                    <div>
                      <div className="text-sm font-medium text-slate-700">{rev.net_amount} DA</div>
                      <div className="text-xs text-slate-400">{new Date(rev.created_at).toLocaleDateString('fr-DZ')}</div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${rev.status === 'paid' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                      {statusLabel(t, rev.status)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showBrandModal && supplierProfile && (
        <SupplierBrandModal
          supplierId={supplierProfile.id}
          currentBrands={supplierBrands.map(b => b.brand_id)}
          onClose={() => setShowBrandModal(false)}
          onSaved={async () => { setShowBrandModal(false); await refreshProfile(); }}
        />
      )}

      {selectedRequest && (
        <RequestDetailModal
          request={selectedRequest}
          existingOffer={myOffers.find(o => o.request_id === selectedRequest.id && o.status === 'active') ?? null}
          onClose={() => setSelectedRequest(null)}
          onSubmitOffer={() => { setEditingOffer(null); setShowOfferForm(true); }}
          onEditOffer={(offer) => { setEditingOffer(offer); setShowOfferForm(true); }}
        />
      )}

      {showOfferForm && selectedRequest && (
        <OfferFormModal
          request={selectedRequest}
          existing={editingOffer}
          onClose={() => { setShowOfferForm(false); setEditingOffer(null); }}
          onSubmitted={async () => { setShowOfferForm(false); setEditingOffer(null); await loadData(); }}
        />
      )}

      {activeTab === 'settings' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Car className="w-5 h-5 text-blue-600" />
                <h2 className="font-semibold text-slate-800">{t('supplier.brands.title')}</h2>
              </div>
              <button
                onClick={() => setShowBrandModal(true)}
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors shrink-0"
              >
                <Pencil className="w-4 h-4" />
                {t('supplier.common.edit')}
              </button>
            </div>
            {supplierBrands.length === 0 ? (
              <p className="text-sm text-slate-400">{t('supplier.brands.empty')}</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {supplierBrands.map(b => {
                  const brand = getBrand(b.brand_id);
                  return brand ? (
                    <span key={b.brand_id} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-medium">
                      {brand.label}
                    </span>
                  ) : null;
                })}
              </div>
            )}
          </div>
          <AccountSettings />
        </div>
      )}

      {historyDetail && (
        <SupplierHistoryDetailModal item={historyDetail} onClose={() => setHistoryDetail(null)} />
      )}
    </DashboardLayout>
  );
}

function requestPartLabel(t: (key: string) => string, req?: RequestWithMechanic | null): string {
  return req?.part_name || req?.description || req?.part_category || t('supplier.offer.defaultPartFallback');
}

function requestVehicleLabel(req?: RequestWithMechanic | null): string {
  if (!req) return '—';
  return [req.vehicle_make, req.vehicle_model, req.vehicle_year].filter(Boolean).join(' ') || '—';
}

function CompetingOffers({ offer, req, competingOffersByRequest, competingSupplierRefs }: {
  offer: Offer;
  req?: RequestWithMechanic;
  competingOffersByRequest: Map<string, Offer[]>;
  competingSupplierRefs: Map<string, string>;
}) {
  const { t } = useLanguage();
  const others = (competingOffersByRequest.get(offer.request_id) ?? [])
    .filter(o => o.id !== offer.id)
    .sort((a, b) => a.net_price - b.net_price);

  if (others.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-dashed border-slate-200">
      <div className="text-xs font-semibold text-slate-400 uppercase mb-2">
        {t('supplier.offer.competingTitle')} ({others.length})
      </div>
      <div className="space-y-2">
        {others.map(o => (
          <div key={o.id} className="space-y-0.5 text-xs bg-slate-50 border border-slate-200 rounded-lg p-2">
            <div className="font-medium text-slate-500">{competingSupplierRefs.get(o.supplier_id) ?? t('supplier.offer.supplierFallback')}</div>
            <div className="text-slate-700 truncate"><span className="font-medium text-slate-400">{t('supplier.offer.brandLabel')} </span>{o.part_brand}</div>
            <div className="text-slate-700 truncate"><span className="font-medium text-slate-400">{t('supplier.offer.priceLabel')} </span>{o.net_price} DA</div>
            <div className="text-slate-700 truncate"><span className="font-medium text-slate-400">{t('supplier.offer.partLabel')} </span>{requestPartLabel(t, req)}{req && req.quantity > 1 ? ` (x${req.quantity})` : ''}</div>
            <div className="text-slate-700 truncate"><span className="font-medium text-slate-400">{t('supplier.offer.vehicleLabel')} </span>{requestVehicleLabel(req)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, onClick }: { icon: React.ReactNode; label: string; value: string | number; color: string; onClick?: () => void }) {
  const COLORS: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 border-blue-300',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-300',
    amber: 'bg-amber-50 text-amber-600 border-amber-300',
    green: 'bg-green-50 text-green-600 border-green-300',
  };
  return (
    <button type="button" onClick={onClick} className={`bg-white rounded-xl border-2 p-4 text-start transition-all hover:shadow-md hover:-translate-y-0.5 ${COLORS[color]}`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${COLORS[color]}`}>{icon}</div>
      <div className="text-xl font-bold text-slate-800">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </button>
  );
}

function SupplierHistoryView({ items, loading, searchQuery, setSearchQuery, periodFilter, setPeriodFilter, customFrom, setCustomFrom, customTo, setCustomTo, onOpen }: {
  items: SupplierHistoryItem[];
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  periodFilter: PeriodFilter;
  setPeriodFilter: (v: PeriodFilter) => void;
  customFrom: string;
  setCustomFrom: (v: string) => void;
  customTo: string;
  setCustomTo: (v: string) => void;
  onOpen: (item: SupplierHistoryItem) => void;
}) {
  const { t } = useLanguage();
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    return items.filter(item => {
      const refDate = new Date(item.offer.created_at);

      if (periodFilter === 'today' && refDate < startOfDay) return false;
      if (periodFilter === 'week' && refDate < startOfWeek) return false;
      if (periodFilter === 'month' && refDate < startOfMonth) return false;
      if (periodFilter === 'year' && refDate < startOfYear) return false;
      if (periodFilter === 'custom') {
        if (customFrom && refDate < new Date(customFrom + 'T00:00:00')) return false;
        if (customTo && refDate > new Date(customTo + 'T23:59:59')) return false;
      }

      if (q) {
        const partName = item.offer.part_name.toLowerCase();
        const partBrand = item.offer.part_brand.toLowerCase();
        const vMake = item.request.vehicle_make.toLowerCase();
        const vModel = item.request.vehicle_model.toLowerCase();
        const mechanic = (item.mechanic_ref ?? '').toLowerCase();
        const haystack = `${partName} ${partBrand} ${vMake} ${vModel} ${mechanic}`;
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [items, searchQuery, periodFilter, customFrom, customTo]);

  const periodOptions: { id: PeriodFilter; label: string }[] = [
    { id: 'all', label: t('supplier.history.periodAll') },
    { id: 'today', label: t('supplier.history.periodToday') },
    { id: 'week', label: t('supplier.history.periodWeek') },
    { id: 'month', label: t('supplier.history.periodMonth') },
    { id: 'year', label: t('supplier.history.periodYear') },
    { id: 'custom', label: t('supplier.history.periodCustom') },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{t('supplier.history.title')}</h1>
        <p className="text-slate-500 text-sm mt-1">{t('supplier.history.subtitle')}</p>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder={t('supplier.history.searchPlaceholder')}
          className="w-full ps-9 pe-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-400 outline-none bg-white"
        />
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        <Filter className="w-4 h-4 text-slate-400 shrink-0" />
        {periodOptions.map(opt => (
          <button
            key={opt.id}
            onClick={() => setPeriodFilter(opt.id)}
            className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
              periodFilter === opt.id
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {periodFilter === 'custom' && (
        <div className="flex flex-wrap items-center gap-2 bg-white rounded-xl border border-slate-200 p-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500">{t('supplier.history.dateFrom')}</label>
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="text-sm px-2 py-1.5 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500">{t('supplier.history.dateTo')}</label>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="text-sm px-2 py-1.5 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          <History className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>{items.length === 0 ? t('supplier.history.emptyNone') : t('supplier.history.emptyFiltered')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => (
            <SupplierHistoryCard key={item.offer.id} item={item} onOpen={() => onOpen(item)} />
          ))}
        </div>
      )}
    </div>
  );
}

function SupplierHistoryCard({ item, onOpen }: { item: SupplierHistoryItem; onOpen: () => void }) {
  const { t } = useLanguage();
  const { offer, request, order, mechanic, rating } = item;
  const createdDate = new Date(offer.created_at).toLocaleDateString('fr-DZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const isDelivered = order?.delivery_status === 'delivered';
  const isRejected = offer.status === 'rejected';

  return (
    <button
      onClick={onOpen}
      className="w-full bg-white rounded-xl border border-slate-200 hover:border-blue-200 hover:shadow-sm transition-all p-4 text-start"
    >
      <div className="flex items-start gap-3">
        <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${isDelivered ? 'bg-green-50 text-green-600' : isRejected ? 'bg-red-50 text-red-500' : 'bg-slate-100 text-slate-500'}`}>
          {isDelivered ? <CheckCircle2 className="w-5 h-5" /> : <Tag className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="font-medium text-slate-800 truncate">{offer.part_name}</div>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${isDelivered ? 'text-green-700 bg-green-50' : isRejected ? 'text-red-600 bg-red-50' : 'text-slate-500 bg-slate-100'}`}>
              {isDelivered ? statusLabel(t, 'delivered') : isRejected ? statusLabel(t, 'rejected') : statusLabel(t, offer.status)}
            </span>
          </div>
          <div className="text-sm text-slate-500 truncate">
            {offer.part_brand} {offer.reference ? `· ${t('supplier.history.refLabel')} ${offer.reference}` : ''}
          </div>
          <div className="text-xs text-slate-400 truncate mt-0.5">
            {request.vehicle_make} {request.vehicle_model} {request.vehicle_year || ''}
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400 flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {createdDate}
            </span>
            {item.mechanic_ref && (
              <span className="flex items-center gap-1 truncate max-w-[140px]">
                <MapPin className="w-3 h-3" />
                {item.mechanic_ref}
              </span>
            )}
            {order && (
              <span className="flex items-center gap-1">
                <Truck className="w-3 h-3" />
                {statusLabel(t, order.delivery_status)}
              </span>
            )}
          </div>
        </div>
        <div className="text-end shrink-0">
          <div className="text-base font-bold text-slate-800">{offer.net_price} DA</div>
          {rating ? (
            <div className="flex items-center gap-0.5 justify-end mt-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`w-3 h-3 ${i < rating.score ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
              ))}
            </div>
          ) : (
            <div className="text-xs text-slate-300 mt-1">{t('supplier.history.notRated')}</div>
          )}
        </div>
      </div>
    </button>
  );
}

function SupplierHistoryDetailModal({ item, onClose }: { item: SupplierHistoryItem; onClose: () => void }) {
  const { t } = useLanguage();
  const { offer, request, order, mechanic, rating } = item;
  const createdDate = new Date(offer.created_at).toLocaleDateString('fr-DZ', { day: '2-digit', month: 'long', year: 'numeric' });
  const isDelivered = order?.delivery_status === 'delivered';
  const isRejected = offer.status === 'rejected';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="readable-modal bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-slate-800 text-lg">{offer.part_name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isDelivered ? 'text-green-700 bg-green-50' : isRejected ? 'text-red-600 bg-red-50' : 'text-slate-500 bg-slate-100'}`}>
                {isDelivered ? statusLabel(t, 'delivered') : isRejected ? statusLabel(t, 'rejected') : statusLabel(t, offer.status)}
              </span>
              <span className="text-xs text-slate-400">{t('supplier.history.closedRequest')}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <DetailField label={t('supplier.history.dateOfOffer')} value={createdDate} icon={<Calendar className="w-4 h-4" />} />
            <DetailField label={t('supplier.history.vehicleLabel')} value={`${request.vehicle_make} ${request.vehicle_model} ${request.vehicle_year || ''}`} icon={<Package className="w-4 h-4" />} />
            <DetailField label={t('supplier.history.mechanicLabel')} value={item.mechanic_ref ?? '—'} icon={<MapPin className="w-4 h-4" />} />
            <DetailField label={t('supplier.history.partBrandLabel')} value={offer.part_brand} icon={<Tag className="w-4 h-4" />} />
            <DetailField label={t('supplier.history.netPriceLabel')} value={`${offer.net_price} DA`} icon={<Tag className="w-4 h-4" />} />
          </div>

          {order && (
            <div className="border border-slate-200 rounded-xl p-4">
              <div className="text-xs font-semibold text-slate-500 uppercase mb-2">{t('supplier.history.orderTitle')}</div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-600">{t('supplier.history.statusPrefix')} {statusLabel(t, order.delivery_status)}</div>
                  {order.delivery_date && (
                    <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                      <Truck className="w-3 h-3" />
                      {t('supplier.history.deliveryPrefix')} {new Date(order.delivery_date).toLocaleDateString('fr-DZ')}
                    </div>
                  )}
                </div>
                <div className="text-end shrink-0">
                  <div className="text-lg font-bold text-slate-800">{offer.net_price} DA</div>
                  <div className="text-xs text-slate-400">{t('supplier.history.netPriceCaption')}</div>
                </div>
              </div>
            </div>
          )}

          <div className="border border-slate-200 rounded-xl p-4">
            <div className="text-xs font-semibold text-slate-500 uppercase mb-2">{t('supplier.history.ratingTitle')}</div>
            {rating ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`w-5 h-5 ${i < rating.score ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                  ))}
                </div>
                <span className="text-sm font-medium text-slate-700">{rating.score}/5</span>
                {rating.comment && <p className="text-sm text-slate-500 italic">"{rating.comment}"</p>}
              </div>
            ) : (
              <p className="text-sm text-slate-400">{t('supplier.history.noRating')}</p>
            )}
          </div>

          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-700">{t('supplier.history.closedNotice')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailField({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-100 rounded-lg p-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase mb-1">
        {icon}
        {label}
      </div>
      <div className="text-sm font-medium text-slate-800">{value}</div>
    </div>
  );
}

function RequestDetailModal({ request, existingOffer, onClose, onSubmitOffer, onEditOffer }: { request: RequestWithMechanic; existingOffer: Offer | null; onClose: () => void; onSubmitOffer: () => void; onEditOffer: (offer: Offer) => void }) {
  const { t } = useLanguage();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="readable-modal bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-slate-800 text-lg">{request.vehicle_make} {request.vehicle_model} {request.vehicle_year || ''}</h2>
            {request.urgency === 'urgent' && <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full mt-1 inline-block">{t('supplier.common.urgent')}</span>}
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          {request.mechanic_ref && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <MapPin className="w-4 h-4" />
              {request.mechanic_ref}
            </div>
          )}
          {(request.part_name || request.part_category) && (
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs font-semibold text-slate-500 uppercase">{t('supplier.request.partRequested')}</div>
                <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{t('supplier.request.quantityLabel')} {request.quantity}</span>
              </div>
              <p className="text-sm text-slate-700">{[request.part_name, request.part_category].filter(Boolean).join(' · ')}</p>
            </div>
          )}
          {request.carte_grise_url && (
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-xs font-semibold text-slate-500 uppercase mb-2">{t('supplier.request.carteGrise')}</div>
              <a href={request.carte_grise_url} target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden border border-slate-200 hover:opacity-80 transition-opacity">
                <img src={request.carte_grise_url} alt={t('supplier.request.carteGrise')} className="w-full h-48 object-cover" />
              </a>
              <p className="text-xs text-slate-400 mt-1">{t('supplier.request.clickToEnlarge')}</p>
            </div>
          )}
          {request.part_photo_urls && request.part_photo_urls.length > 0 && (
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-xs font-semibold text-slate-500 uppercase mb-2">{t('supplier.request.partPhotos')}</div>
              <div className="grid grid-cols-3 gap-2">
                {request.part_photo_urls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden border border-slate-200 hover:opacity-80 transition-opacity aspect-square">
                    <img src={url} alt={`${t('supplier.request.partPhotoAlt')} ${i + 1}`} className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-1">{t('supplier.request.clickToEnlarge')}</p>
            </div>
          )}
          {request.reference_photo_url && (
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-xs font-semibold text-slate-500 uppercase mb-2">{t('supplier.request.referencePhoto')}</div>
              <a href={request.reference_photo_url} target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden border border-slate-200 hover:opacity-80 transition-opacity">
                <img src={request.reference_photo_url} alt={t('supplier.request.referenceAlt')} className="w-full h-48 object-cover" />
              </a>
              <p className="text-xs text-slate-400 mt-1">{t('supplier.request.clickToEnlarge')}</p>
            </div>
          )}
          {request.audio_url && (
            <div className="audio-zone rounded-lg p-3">
              <div className="text-xs font-semibold text-slate-500 uppercase mb-2">{t('supplier.request.voiceMessage')}</div>
              <audio controls src={request.audio_url} className="w-full h-10" />
            </div>
          )}
          {request.description && (
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-xs font-semibold text-slate-500 uppercase mb-1">{t('supplier.request.description')}</div>
              <p className="text-sm text-slate-700">{request.description}</p>
            </div>
          )}
          {existingOffer ? (
            <div className="space-y-2">
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <p className="text-xs text-blue-700">{t('supplier.request.existingOfferPrefix')} ({existingOffer.net_price} DA). {t('supplier.request.existingOfferSuffix')}</p>
              </div>
              <button onClick={() => onEditOffer(existingOffer)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                <Pencil className="w-4 h-4" />
                {t('supplier.request.editMyOffer')}
              </button>
              <button onClick={onSubmitOffer} className="w-full text-slate-500 hover:text-slate-700 font-medium py-2 text-sm transition-colors">
                {t('supplier.request.submitNewOffer')}
              </button>
            </div>
          ) : (
            <button onClick={onSubmitOffer} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
              <Send className="w-4 h-4" />
              {t('supplier.request.submitOffer')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function OfferFormModal({ request, existing, onClose, onSubmitted }: { request: RequestWithMechanic; existing: Offer | null; onClose: () => void; onSubmitted: () => void }) {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [form, setForm] = useState({
    part_name: existing?.part_name ?? '',
    part_brand: existing?.part_brand ?? '',
    reference: existing?.reference ?? '',
    net_price: existing?.net_price?.toString() ?? '',
    delivery_estimate: existing?.delivery_estimate ?? '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setError('');
    setLoading(true);
    try {
      if (existing) {
        const { error: err } = await supabase.from('offers').update({
          part_name: form.part_name,
          part_brand: form.part_brand,
          reference: form.reference || null,
          net_price: parseFloat(form.net_price) || 0,
          delivery_estimate: form.delivery_estimate,
          updated_at: new Date().toISOString(),
        }).eq('id', existing.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('offers').insert({
          request_id: request.id,
          supplier_id: profile.id,
          part_name: form.part_name,
          part_brand: form.part_brand,
          reference: form.reference || null,
          net_price: parseFloat(form.net_price) || 0,
          delivery_estimate: form.delivery_estimate,
        });
        if (err) throw err;
      }
      onSubmitted();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-bold text-slate-800 text-lg">{existing ? t('supplier.form.titleEdit') : t('supplier.form.titleNew')}</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">{t('supplier.form.partName')}</label>
            <PartSearchInput value={form.part_name} onChange={(name) => setForm(f => ({ ...f, part_name: name }))} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">{t('supplier.form.brand')}</label>
              <input type="text" value={form.part_brand} onChange={e => setForm(f => ({ ...f, part_brand: e.target.value }))} required className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-400 outline-none" placeholder="Bosch" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">{t('supplier.form.reference')}</label>
              <input type="text" value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-400 outline-none" placeholder="REF-12345" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">{t('supplier.form.price')}</label>
            <input type="number" step="0.01" value={form.net_price} onChange={e => setForm(f => ({ ...f, net_price: e.target.value }))} required min="0" className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-400 outline-none" placeholder="3500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">{t('supplier.form.deliveryEstimate')}</label>
            <input type="text" value={form.delivery_estimate} onChange={e => setForm(f => ({ ...f, delivery_estimate: e.target.value }))} required className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-400 outline-none" placeholder="24-48h" />
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-xl transition-colors">
            {loading ? t('supplier.form.sending') : existing ? t('supplier.form.update') : t('supplier.form.submit')}
          </button>
        </form>
      </div>
    </div>
  );
}

function SupplierBrandModal({ supplierId, currentBrands, onClose, onSaved }: {
  supplierId: string;
  currentBrands: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useLanguage();
  const [selected, setSelected] = useState<string[]>(currentBrands);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const currentSet = new Set(currentBrands);
      const newSet = new Set(selected);
      const toDelete = [...currentSet].filter(b => !newSet.has(b));
      const toInsert = [...newSet].filter(b => !currentSet.has(b));
      if (toDelete.length > 0) {
        await supabase.from('supplier_brands').delete().eq('supplier_id', supplierId).in('brand_id', toDelete);
      }
      if (toInsert.length > 0) {
        await supabase.from('supplier_brands').insert(toInsert.map(brand_id => ({ supplier_id: supplierId, brand_id })));
      }
      onSaved();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Car className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold text-slate-800 text-lg">{t('supplier.brands.modalTitle')}</h2>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-500">{t('supplier.brands.helpText')}</p>
          <BrandMultiSelect selected={selected} onChange={setSelected} />
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selected.map(id => {
                const brand = getBrand(id);
                return brand ? (
                  <span key={id} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">{brand.label}</span>
                ) : null;
              })}
            </div>
          )}
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
          <button onClick={handleSave} disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-xl transition-colors">
            {saving ? t('supplier.brands.saving') : t('supplier.brands.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
