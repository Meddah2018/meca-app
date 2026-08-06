import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Request, Offer, Order, Profile, GarageProfile, Rating } from '@/lib/database.types';
import DashboardLayout from '@/components/DashboardLayout';
import { Package, Clock, CheckCircle2, Plus, Search, MapPin, Calendar, Star, Truck, ChevronRight, X, AlertCircle, Upload, History, Filter, Tag, FileText, Trash2, ArrowLeft, Settings } from 'lucide-react';
import { computeDeliveryDate, formatDeliveryDate } from '@/lib/delivery';
import { fetchPublicProfiles } from '@/lib/publicProfiles';
import PartSearchInput from '@/components/PartSearchInput';
import AccountSettings from '@/components/AccountSettings';
import VehicleSelect, { type VehicleSelection } from '@/components/VehicleSelect';

interface RequestWithOffers extends Request {
  offers?: Offer[];
  mechanic_profile?: Profile;
  garage?: GarageProfile;
}

interface OfferWithDetails extends Offer {
  supplier_profile?: Profile;
  supplier_company?: SupplierProfile;
  supplier_ref?: string;
}

interface SupplierProfile {
  company_name: string;
  city: string;
  wilaya: string;
}

interface HistoryItem {
  request: RequestWithOffers;
  order: Order | null;
  selectedOffer: OfferWithDetails | null;
  rating: Rating | null;
}

const STATUS_LABELS = {
  open: 'Ouverte',
  offer_selected: 'Offre choisie',
  closed: 'Clôturée',
} as const;

const URGENCY_LABELS = {
  normal: 'Normal',
  urgent: 'Urgent',
} as const;

type PeriodFilter = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';

export default function MechanicDashboard() {
  const { profile, garageProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [requests, setRequests] = useState<RequestWithOffers[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RequestWithOffers | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<OfferWithDetails | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  // History tab state
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [historyDetail, setHistoryDetail] = useState<HistoryItem | null>(null);

  const loadRequests = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('requests')
      .select('*')
      .eq('mechanic_id', profile.id)
      .order('created_at', { ascending: false });

    const reqs = data ?? [];
    if (reqs.length > 0) {
      const reqIds = reqs.map(r => r.id);
      const { data: reqOffers } = await supabase
        .from('offers')
        .select('request_id')
        .in('request_id', reqIds);

      const offersByRequest = new Map<string, number>();
      (reqOffers ?? []).forEach(o => {
        offersByRequest.set(o.request_id, (offersByRequest.get(o.request_id) ?? 0) + 1);
      });

      const reqsWithOffers = reqs.map(r => ({
        ...r,
        offers: Array.from({ length: offersByRequest.get(r.id) ?? 0 }),
      }));
      setRequests(reqsWithOffers);
    } else {
      setRequests([]);
    }
  }, [profile]);

  const loadOrders = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('mechanic_id', profile.id)
      .order('created_at', { ascending: false });
    setOrders(data ?? []);
  }, [profile]);

  const loadHistory = useCallback(async () => {
    if (!profile) return;
    setHistoryLoading(true);
    try {
      const { data: closedReqs } = await supabase
        .from('requests')
        .select('*')
        .eq('mechanic_id', profile.id)
        .eq('status', 'closed')
        .order('completed_at', { ascending: false, nullsFirst: false });

      if (!closedReqs || closedReqs.length === 0) {
        setHistoryItems([]);
        return;
      }

      const reqIds = closedReqs.map(r => r.id);
      const { data: reqOrders } = await supabase
        .from('orders')
        .select('*')
        .eq('mechanic_id', profile.id)
        .in('offer_id', (await supabase.from('offers').select('id').in('request_id', reqIds)).data?.map(o => o.id) ?? []);

      const { data: reqOffers } = await supabase
        .from('offers')
        .select('*')
        .in('request_id', reqIds)
        .eq('status', 'selected');

      const supplierIds = Array.from(new Set((reqOffers ?? []).map(o => o.supplier_id)));
      const offerIds = (reqOffers ?? []).map(o => o.id);

      const [ { data: suppliers }, { data: ratings }, pubMap ] = await Promise.all([
        supplierIds.length > 0
          ? supabase.from('supplier_profiles').select('company_name, city, wilaya, user_id').in('user_id', supplierIds)
          : Promise.resolve({ data: [], error: null }),
        offerIds.length > 0
          ? supabase.from('ratings').select('*').eq('author_id', profile.id).in('order_id', (reqOrders ?? []).map(o => o.id) ?? [])
          : Promise.resolve({ data: [], error: null }),
        fetchPublicProfiles(supplierIds),
      ]);

      const supplierMap = new Map<string, SupplierProfile>();
      (suppliers ?? []).forEach((s: SupplierProfile & { user_id: string }) => supplierMap.set(s.user_id, { company_name: s.company_name, city: s.city, wilaya: s.wilaya }));

      const offerMap = new Map<string, OfferWithDetails>();
      (reqOffers ?? []).forEach(o => {
        offerMap.set(o.request_id, { ...o, supplier_company: supplierMap.get(o.supplier_id) ?? undefined, supplier_ref: pubMap.get(o.supplier_id)?.anonymous_reference });
      });

      const orderMap = new Map<string, Order>();
      (reqOrders ?? []).forEach(o => orderMap.set(o.offer_id, o));

      const ratingMap = new Map<string, Rating>();
      (ratings ?? []).forEach((r: Rating) => ratingMap.set(r.order_id, r));

      const items: HistoryItem[] = (closedReqs as RequestWithOffers[]).map(req => {
        const offer = offerMap.get(req.id) ?? null;
        const order = offer ? orderMap.get(offer.id) ?? null : null;
        const rating = order ? ratingMap.get(order.id) ?? null : null;
        return { request: req, order, selectedOffer: offer, rating };
      });

      setHistoryItems(items);
    } finally {
      setHistoryLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    Promise.all([loadRequests(), loadOrders()]).finally(() => setLoading(false));

    const reqChannel = supabase
      .channel('mechanic-requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests', filter: `mechanic_id=eq.${profile.id}` },
        () => loadRequests())
      .subscribe();

    const offerChannel = supabase
      .channel('mechanic-offers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'offers' },
        () => loadRequests())
      .subscribe();

    const orderChannel = supabase
      .channel('mechanic-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `mechanic_id=eq.${profile.id}` },
        () => loadOrders())
      .subscribe();

    return () => {
      supabase.removeChannel(reqChannel);
      supabase.removeChannel(offerChannel);
      supabase.removeChannel(orderChannel);
    };
  }, [profile, loadRequests, loadOrders]);

  useEffect(() => {
    if (activeTab === 'history') loadHistory();
  }, [activeTab, loadHistory]);

  const handleDeleteRequest = async (req: RequestWithOffers) => {
    if (!profile) return;
    if (req.status !== 'open') {
      setActionError('Seules les demandes ouvertes peuvent être supprimées.');
      return;
    }
    if (!window.confirm(`Supprimer la demande « ${req.part_name ?? 'Pièce'} » ? Cette action est irréversible.`)) return;
    setActionLoading(true);
    setActionError('');
    setRequests(prev => prev.filter(r => r.id !== req.id));
    if (selectedRequest?.id === req.id) setSelectedRequest(null);
    try {
      const { error } = await supabase.from('requests').delete().eq('id', req.id);
      if (error) throw error;
      await loadRequests();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
      await loadRequests();
    } finally {
      setActionLoading(false);
    }
  };

  const openRequest = async (req: RequestWithOffers) => {
    const { data: offers } = await supabase
      .from('offers')
      .select('*')
      .eq('request_id', req.id)
      .order('created_at', { ascending: true });

    const offersWithDetails: OfferWithDetails[] = [];
    const supplierIds = (offers ?? []).map(o => o.supplier_id);
    const pubMap = await fetchPublicProfiles(supplierIds);
    for (const offer of offers ?? []) {
      offersWithDetails.push({ ...offer, supplier_ref: pubMap.get(offer.supplier_id)?.anonymous_reference });
    }

    setSelectedRequest({ ...req, offers: offersWithDetails });
  };

  const handleSelectOffer = async (offer: OfferWithDetails) => {
    if (!profile || !selectedRequest) return;
    setActionError('');
    setActionLoading(true);
    try {
      const selectedAt = new Date();
      const deliveryDate = computeDeliveryDate(selectedAt);

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          offer_id: offer.id,
          mechanic_id: profile.id,
          supplier_id: offer.supplier_id,
          cash_amount: offer.displayed_price,
          delivery_date: deliveryDate.toISOString().split('T')[0],
        })
        .select('*')
        .single();
      if (orderError) throw orderError;

      const { error: offerErr } = await supabase
        .from('offers')
        .update({ status: 'selected' })
        .eq('id', offer.id);
      if (offerErr) throw offerErr;

      await supabase
        .from('offers')
        .update({ status: 'rejected' })
        .neq('id', offer.id)
        .eq('request_id', selectedRequest.id);

      await supabase
        .from('requests')
        .update({ status: 'offer_selected' })
        .eq('id', selectedRequest.id);

      setSelectedOffer(null);
      setSelectedRequest(null);
      await loadRequests();
      await loadOrders();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setActionLoading(false);
    }
  };

  // Active requests = not closed (open or offer_selected, including those with orders in prep/delivery)
  const activeRequests = useMemo(
    () => requests.filter(r => r.status !== 'closed'),
    [requests]
  );

  const stats = {
    active: activeRequests.length,
    open: activeRequests.filter(r => r.status === 'open').length,
    selected: activeRequests.filter(r => r.status === 'offer_selected').length,
    delivered: orders.filter(o => o.delivery_status === 'delivered').length,
  };

  const navItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: <Package className="w-5 h-5" /> },
    { id: 'requests', label: 'Mes demandes', icon: <Search className="w-5 h-5" /> },
    { id: 'history', label: 'Historique', icon: <History className="w-5 h-5" /> },
    { id: 'orders', label: 'Mes commandes', icon: <Truck className="w-5 h-5" /> },
    { id: 'settings', label: 'Paramètres', icon: <Settings className="w-5 h-5" /> },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  return (
    <DashboardLayout navItems={navItems} activeTab={activeTab} onTabChange={setActiveTab} accentColor="orange">
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Bonjour, {profile?.anonymous_reference ?? profile?.full_name?.split(' ')[0]}</h1>
            <p className="text-slate-500 text-sm mt-1">{garageProfile?.garage_name} · {garageProfile?.city}</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={<Search className="w-5 h-5" />} label="Actives" value={stats.active} color="orange" onClick={() => setActiveTab('requests')} />
            <StatCard icon={<Clock className="w-5 h-5" />} label="En attente" value={stats.open} color="amber" onClick={() => setActiveTab('requests')} />
            <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="Offre choisie" value={stats.selected} color="blue" onClick={() => setActiveTab('requests')} />
            <StatCard icon={<Truck className="w-5 h-5" />} label="Livrées" value={stats.delivered} color="green" onClick={() => setActiveTab('history')} />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-800">Demandes récentes</h2>
              <button
                onClick={() => setShowNewRequest(true)}
                className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Nouvelle demande
              </button>
            </div>
            {activeRequests.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Search className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p>Aucune demande active pour le moment</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeRequests.slice(0, 5).map(req => (
                  <div key={req.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:border-orange-200 hover:bg-orange-50/30 transition-colors">
                    <button onClick={() => openRequest(req)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0 ${req.urgency === 'urgent' ? 'bg-red-500' : 'bg-orange-500'}`}>
                        <Package className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-800 text-sm truncate">
                          {req.part_name ?? 'Pièce'} · {req.vehicle_make} {req.vehicle_model}
                        </div>
                        <div className="text-xs text-slate-400 truncate">{req.description}</div>
                      </div>
                    </button>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={req.status} offersCount={req.offers?.length ?? 0} />
                      {req.status === 'open' && (
                        <button
                          onClick={() => handleDeleteRequest(req)}
                          disabled={actionLoading}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="space-y-4">
          <button onClick={() => setActiveTab('dashboard')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-orange-600 font-medium transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-800">Mes demandes</h1>
            <button
              onClick={() => setShowNewRequest(true)}
              className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nouvelle
            </button>
          </div>
          {activeRequests.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>Aucune demande active. Créez-en une pour recevoir des offres.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeRequests.map(req => (
                <div
                  key={req.id}
                  className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-orange-200 hover:shadow-sm transition-all"
                >
                  <button onClick={() => openRequest(req)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                    <div className={`w-11 h-11 rounded-lg flex items-center justify-center text-white shrink-0 ${req.urgency === 'urgent' ? 'bg-red-500' : 'bg-orange-500'}`}>
                      <Package className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-800">
                        {req.part_name ?? 'Pièce'} · {req.vehicle_make} {req.vehicle_model} {req.vehicle_year || ''}
                      </div>
                      <div className="text-sm text-slate-500 truncate">{req.description}</div>
                    </div>
                  </button>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={req.status} offersCount={req.offers?.length ?? 0} />
                    {req.status === 'open' && (
                      <button
                        onClick={() => handleDeleteRequest(req)}
                        disabled={actionLoading}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          <button onClick={() => setActiveTab('dashboard')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-orange-600 font-medium transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>
          <HistoryView
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

      {activeTab === 'orders' && (
        <div className="space-y-4">
          <button onClick={() => setActiveTab('dashboard')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-orange-600 font-medium transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>
          <h1 className="text-2xl font-bold text-slate-800">Mes commandes</h1>
          {orders.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
              <Truck className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>Aucune commande. Sélectionnez une offre pour commander.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map(order => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* New request modal */}
      {showNewRequest && (
        <NewRequestModal
          onClose={() => setShowNewRequest(false)}
          onCreated={async () => { setShowNewRequest(false); await loadRequests(); }}
        />
      )}

      {/* Active request detail modal */}
      {selectedRequest && (
        <RequestDetailModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onSelectOffer={handleSelectOffer}
          loading={actionLoading}
          error={actionError}
        />
      )}

      {/* History detail modal (read-only) */}
      {activeTab === 'settings' && <AccountSettings />}

      {historyDetail && (
        <HistoryDetailModal item={historyDetail} onClose={() => setHistoryDetail(null)} />
      )}
    </DashboardLayout>
  );
}

function StatCard({ icon, label, value, color, onClick }: { icon: React.ReactNode; label: string; value: number; color: string; onClick?: () => void }) {
  const COLORS: Record<string, string> = {
    orange: 'bg-orange-50 text-orange-600 border-orange-300',
    amber: 'bg-amber-50 text-amber-600 border-amber-300',
    blue: 'bg-blue-50 text-blue-600 border-blue-300',
    green: 'bg-green-50 text-green-600 border-green-300',
  };
  return (
    <button type="button" onClick={onClick} className={`bg-white rounded-xl border-2 p-4 text-left transition-all hover:shadow-md hover:-translate-y-0.5 ${COLORS[color]}`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${COLORS[color]}`}>{icon}</div>
      <div className="text-2xl font-bold text-slate-800">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </button>
  );
}

function StatusBadge({ status, offersCount = 0 }: { status: string; offersCount?: number }) {
  const STYLES: Record<string, string> = {
    open: 'bg-amber-50 text-amber-700',
    offer_selected: 'bg-blue-50 text-blue-700',
    closed: 'bg-slate-100 text-slate-500',
    active: 'bg-green-50 text-green-700',
    selected: 'bg-blue-50 text-blue-700',
    rejected: 'bg-red-50 text-red-600',
    to_pickup: 'bg-amber-50 text-amber-700',
    in_delivery: 'bg-blue-50 text-blue-700',
    delivered: 'bg-green-50 text-green-700',
  };
  const LABELS: Record<string, string> = {
    open: 'Ouverte',
    offer_selected: 'Offre choisie',
    closed: 'Clôturée',
    active: 'Active',
    selected: 'Choisie',
    rejected: 'Refusée',
    to_pickup: 'À récupérer',
    in_delivery: 'En livraison',
    delivered: 'Livrée',
  };
  const displayStatus = status === 'open' && offersCount > 0 ? 'offers' : status;
  const OFFERS_STYLE = 'bg-red-50 text-red-800 border border-red-700';
  const style = displayStatus === 'offers' ? OFFERS_STYLE : (STYLES[status] ?? 'bg-slate-100 text-slate-500');
  const label = displayStatus === 'offers'
    ? `${offersCount} offre${offersCount > 1 ? 's' : ''}`
    : (LABELS[status] ?? status);
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style}`}>{label}</span>;
}

function HistoryView({ items, loading, searchQuery, setSearchQuery, periodFilter, setPeriodFilter, customFrom, setCustomFrom, customTo, setCustomTo, onOpen }: {
  items: HistoryItem[];
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  periodFilter: PeriodFilter;
  setPeriodFilter: (v: PeriodFilter) => void;
  customFrom: string;
  setCustomFrom: (v: string) => void;
  customTo: string;
  setCustomTo: (v: string) => void;
  onOpen: (item: HistoryItem) => void;
}) {
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    return items.filter(item => {
      const req = item.request;
      const refDate = req.completed_at ? new Date(req.completed_at) : new Date(req.created_at);

      if (periodFilter === 'today' && refDate < startOfDay) return false;
      if (periodFilter === 'week' && refDate < startOfWeek) return false;
      if (periodFilter === 'month' && refDate < startOfMonth) return false;
      if (periodFilter === 'year' && refDate < startOfYear) return false;
      if (periodFilter === 'custom') {
        if (customFrom && refDate < new Date(customFrom + 'T00:00:00')) return false;
        if (customTo && refDate > new Date(customTo + 'T23:59:59')) return false;
      }

      if (q) {
        const partName = (req.part_name ?? '').toLowerCase();
        const vMake = req.vehicle_make.toLowerCase();
        const vModel = req.vehicle_model.toLowerCase();
        const supplier = (item.selectedOffer?.supplier_ref ?? '').toLowerCase();
        const haystack = `${partName} ${vMake} ${vModel} ${supplier}`;
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [items, searchQuery, periodFilter, customFrom, customTo]);

  const periodOptions: { id: PeriodFilter; label: string }[] = [
    { id: 'all', label: 'Tout' },
    { id: 'today', label: "Aujourd'hui" },
    { id: 'week', label: 'Cette semaine' },
    { id: 'month', label: 'Ce mois' },
    { id: 'year', label: 'Cette année' },
    { id: 'custom', label: 'Personnalisé' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Historique</h1>
        <p className="text-slate-500 text-sm mt-1">Demandes livrées et clôturées</p>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Rechercher : pièce, marque, modèle, fournisseur..."
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-orange-400 outline-none bg-white"
        />
      </div>

      {/* Period filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        <Filter className="w-4 h-4 text-slate-400 shrink-0" />
        {periodOptions.map(opt => (
          <button
            key={opt.id}
            onClick={() => setPeriodFilter(opt.id)}
            className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
              periodFilter === opt.id
                ? 'bg-orange-500 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-orange-300'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {periodFilter === 'custom' && (
        <div className="flex flex-wrap items-center gap-2 bg-white rounded-xl border border-slate-200 p-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500">Du</label>
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="text-sm px-2 py-1.5 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500">Au</label>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="text-sm px-2 py-1.5 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          <History className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>{items.length === 0 ? 'Aucune demande livrée pour le moment.' : 'Aucun résultat pour ces critères.'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => (
            <HistoryCard key={item.request.id} item={item} onOpen={() => onOpen(item)} />
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryCard({ item, onOpen }: { item: HistoryItem; onOpen: () => void }) {
  const { request, selectedOffer, order, rating } = item;
  const deliveryDate = order?.delivery_date ? formatDeliveryDate(new Date(order.delivery_date)) : '—';
  const createdDate = new Date(request.created_at).toLocaleDateString('fr-DZ', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <button
      onClick={onOpen}
      className="w-full bg-white rounded-xl border border-slate-200 hover:border-orange-200 hover:shadow-sm transition-all p-4 text-left"
    >
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-lg bg-green-50 text-green-600 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="font-medium text-slate-800 truncate">
              {request.part_name ?? 'Pièce'}
            </div>
            <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full shrink-0">Livrée</span>
          </div>
          <div className="text-sm text-slate-500 truncate">
            {request.vehicle_make} {request.vehicle_model} {request.vehicle_year || ''}
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400 flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {createdDate}
            </span>
            {selectedOffer?.supplier_ref && (
              <span className="flex items-center gap-1 truncate max-w-[140px]">
                <MapPin className="w-3 h-3" />
                {selectedOffer.supplier_ref}
              </span>
            )}
            {order && (
              <span className="flex items-center gap-1">
                <Truck className="w-3 h-3" />
                {deliveryDate}
              </span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          {order && <div className="text-base font-bold text-slate-800">{order.cash_amount} DA</div>}
          {rating ? (
            <div className="flex items-center gap-0.5 justify-end mt-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`w-3 h-3 ${i < rating.score ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
              ))}
            </div>
          ) : (
            <div className="text-xs text-slate-300 mt-1">Non notée</div>
          )}
        </div>
      </div>
    </button>
  );
}

function HistoryDetailModal({ item, onClose }: { item: HistoryItem; onClose: () => void }) {
  const { request, selectedOffer, order, rating } = item;
  const createdDate = new Date(request.created_at).toLocaleDateString('fr-DZ', { day: '2-digit', month: 'long', year: 'numeric' });
  const deliveryDate = order?.delivery_date ? formatDeliveryDate(new Date(order.delivery_date)) : '—';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-slate-800 text-lg">
              {request.vehicle_make} {request.vehicle_model} {request.vehicle_year || ''}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">Livrée</span>
              <span className="text-xs text-slate-400">Demande clôturée</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Description</div>
            <p className="text-sm text-slate-700">{request.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <DetailField label="Date de création" value={createdDate} icon={<Calendar className="w-4 h-4" />} />
            <DetailField label="Véhicule" value={`${request.vehicle_make} ${request.vehicle_model} ${request.vehicle_year || ''}`} icon={<Package className="w-4 h-4" />} />
            <DetailField label="Nom de la pièce" value={request.part_name ?? '—'} icon={<Tag className="w-4 h-4" />} />
            <DetailField label="Fournisseur" value={selectedOffer?.supplier_ref ?? '—'} icon={<MapPin className="w-4 h-4" />} />
            <DetailField label="Prix final" value={order ? `${order.cash_amount} DA` : '—'} icon={<Tag className="w-4 h-4" />} />
            <DetailField label="Date de livraison" value={deliveryDate} icon={<Truck className="w-4 h-4" />} />
          </div>

          {request.carte_grise_url && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase mb-2">
                <FileText className="w-4 h-4" />
                Carte grise du véhicule
              </div>
              <a href={request.carte_grise_url} target="_blank" rel="noopener noreferrer" className="block rounded-xl border border-slate-200 overflow-hidden hover:border-slate-300 transition-colors">
                <img src={request.carte_grise_url} alt="Carte grise" className="w-full h-48 object-cover" />
              </a>
            </div>
          )}

          {selectedOffer && (
            <div className="border border-slate-200 rounded-xl p-4">
              <div className="text-xs font-semibold text-slate-500 uppercase mb-2">Offre sélectionnée</div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-800">{selectedOffer.part_name}</div>
                  <div className="text-sm text-slate-500">{selectedOffer.part_brand} {selectedOffer.reference ? `· Réf: ${selectedOffer.reference}` : ''}</div>
                  {selectedOffer.supplier_ref && (
                    <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {selectedOffer.supplier_ref}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-bold text-slate-800">{selectedOffer.displayed_price} DA</div>
                  <div className="text-xs text-slate-400">prix client</div>
                </div>
              </div>
            </div>
          )}

          <div className="border border-slate-200 rounded-xl p-4">
            <div className="text-xs font-semibold text-slate-500 uppercase mb-2">Note attribuée au fournisseur</div>
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
              <p className="text-sm text-slate-400">Aucune note attribuée.</p>
            )}
          </div>

          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-700">Cette demande est clôturée. Elle ne peut plus être modifiée.</p>
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

function OrderCard({ order }: { order: Order }) {
  const [offer, setOffer] = useState<Offer | null>(null);
  const [supplierRef, setSupplierRef] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('offers').select('*').eq('id', order.offer_id).maybeSingle().then(async ({ data }) => {
      setOffer(data);
      if (data) {
        const pubMap = await fetchPublicProfiles([data.supplier_id]);
        setSupplierRef(pubMap.get(data.supplier_id)?.anonymous_reference ?? null);
      }
    });
  }, [order.offer_id]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
          <Package className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-slate-800">{offer?.part_name ?? 'Pièce'}</div>
          <div className="text-sm text-slate-500">{offer?.part_brand} {offer?.reference ? `· Réf: ${offer.reference}` : ''}</div>
          <div className="text-xs text-slate-400 mt-1">{supplierRef ?? '—'}</div>
          <div className="flex items-center gap-2 mt-2">
            <StatusBadge status={order.delivery_status} />
            {order.delivery_date && (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDeliveryDate(new Date(order.delivery_date))}
              </span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-bold text-slate-800">{order.cash_amount} DA</div>
          <div className="text-xs text-slate-400">paiement livraison</div>
        </div>
      </div>
    </div>
  );
}

function NewRequestModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { profile } = useAuth();
  const [form, setForm] = useState({ vehicle_make: '', vehicle_model: '', vehicle_year: '', description: '', urgency: 'normal' as 'normal' | 'urgent', part_name: '', part_category: '', carte_grise_url: '' });
  const [vehicle, setVehicle] = useState<VehicleSelection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('L\'image ne doit pas dépasser 5 Mo');
      return;
    }
    setError('');
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const filePath = `carte-grise/${fileName}`;
      const { error: uploadErr } = await supabase.storage.from('carte-grise').upload(filePath, file, { cacheControl: '3600', upsert: false });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from('carte-grise').getPublicUrl(filePath);
      setForm(f => ({ ...f, carte_grise_url: urlData.publicUrl }));
      setPreview(URL.createObjectURL(file));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'envoi de l\'image');
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = () => {
    setForm(f => ({ ...f, carte_grise_url: '' }));
    setPreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setError('');
    setLoading(true);
    try {
      const { error: err } = await supabase.from('requests').insert({
        mechanic_id: profile.id,
        vehicle_make: vehicle?.brand_label ?? '',
        vehicle_model: vehicle?.model_label ?? '',
        vehicle_year: vehicle?.year ?? null,
        vehicle_brand_id: vehicle?.brand_id ?? null,
        vehicle_model_id: vehicle?.model_id ?? null,
        description: form.description,
        urgency: form.urgency,
        part_name: form.part_name || null,
        part_category: form.part_category || null,
        carte_grise_url: form.carte_grise_url || null,
      });
      if (err) throw err;
      onCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-bold text-slate-800 text-lg">Nouvelle demande de pièce</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Nom de la pièce</label>
            <PartSearchInput
              value={form.part_name}
              onChange={(v, catId) => setForm(f => ({ ...f, part_name: v, part_category: catId ?? '' }))}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Véhicule</label>
            <VehicleSelect value={vehicle} onChange={setVehicle} required />
          </div>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Urgence</label>
              <select value={form.urgency} onChange={e => setForm(f => ({ ...f, urgency: e.target.value as 'normal' | 'urgent' }))} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-orange-400 outline-none bg-white">
                <option value="normal">Normal</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Carte grise du véhicule</label>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            {preview || form.carte_grise_url ? (
              <div className="relative rounded-xl border border-slate-200 overflow-hidden">
                <img src={preview || form.carte_grise_url} alt="Carte grise" className="w-full h-40 object-cover" />
                <button type="button" onClick={removePhoto} className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-full flex flex-col items-center justify-center gap-2 py-6 rounded-xl border-2 border-dashed border-slate-200 hover:border-orange-400 hover:bg-orange-50/50 transition-colors disabled:opacity-50">
                {uploading ? (
                  <><div className="w-6 h-6 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" /><span className="text-sm text-slate-500">Envoi en cours...</span></>
                ) : (
                  <><div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center"><Upload className="w-5 h-5 text-orange-500" /></div><span className="text-sm font-medium text-slate-600">Glissez ou cliquez pour ajouter</span><span className="text-xs text-slate-400">Photo de la carte grise (JPG, PNG, max 5 Mo)</span></>
                )}
              </button>
            )}
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
          <button type="submit" disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold py-3 rounded-xl transition-colors">
            {loading ? 'Publication...' : 'Publier la demande'}
          </button>
        </form>
      </div>
    </div>
  );
}

function RequestDetailModal({ request, onClose, onSelectOffer, loading, error }: {
  request: RequestWithOffers;
  onClose: () => void;
  onSelectOffer: (offer: OfferWithDetails) => void;
  loading: boolean;
  error: string;
}) {
  const offers = (request.offers ?? []) as OfferWithDetails[];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-slate-800 text-lg">{request.vehicle_make} {request.vehicle_model} {request.vehicle_year || ''}</h2>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={request.status} offersCount={offers.length} />
              {request.urgency === 'urgent' && <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Urgent</span>}
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Description</div>
            <p className="text-sm text-slate-700">{request.description}</p>
          </div>

          {request.carte_grise_url && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase mb-2">
                <FileText className="w-4 h-4" />
                Carte grise du véhicule
              </div>
              <a href={request.carte_grise_url} target="_blank" rel="noopener noreferrer" className="block rounded-xl border border-slate-200 overflow-hidden hover:border-slate-300 transition-colors">
                <img src={request.carte_grise_url} alt="Carte grise" className="w-full h-48 object-cover" />
              </a>
            </div>
          )}

          <div>
            <h3 className="font-semibold text-slate-800 text-sm mb-3">
              Offres reçues {offers.length > 0 && <span className="text-slate-400 font-normal">({offers.length})</span>}
            </h3>
            {offers.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">En attente d'offres des fournisseurs...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {offers.map(offer => (
                  <div key={offer.id} className={`border rounded-xl p-4 ${offer.status === 'selected' ? 'border-blue-300 bg-blue-50/50' : offer.status === 'rejected' ? 'border-slate-200 opacity-60' : 'border-slate-200'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-800">{offer.part_name}</div>
                        <div className="text-sm text-slate-500">{offer.part_brand} {offer.reference ? `· Réf: ${offer.reference}` : ''}</div>
                        {offer.supplier_ref && (
                          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {offer.supplier_ref}
                          </div>
                        )}
                        {offer.delivery_estimate && (
                          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                            <Truck className="w-3 h-3" />
                            {offer.delivery_estimate}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-lg font-bold text-slate-800">{offer.displayed_price} DA</div>
                        <div className="text-xs text-slate-400">prix client</div>
                      </div>
                    </div>
                    {offer.status === 'active' && request.status === 'open' && (
                      <button
                        onClick={() => onSelectOffer(offer)}
                        disabled={loading}
                        className="w-full mt-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                      >
                        Choisir cette offre
                      </button>
                    )}
                    {offer.status === 'selected' && <div className="mt-2 text-xs font-medium text-blue-600 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Offre sélectionnée</div>}
                    {offer.status === 'rejected' && <div className="mt-2 text-xs text-slate-400">Offre refusée</div>}
                  </div>
                ))}
              </div>
            )}
            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 mt-3 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
