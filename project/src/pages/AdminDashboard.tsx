import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Profile, Request, Offer, Order, Reversement } from '@/lib/database.types';
import DashboardLayout from '@/components/DashboardLayout';
import { ShieldCheck, Users, Package, Truck, Wallet, TrendingUp, CheckCircle2, X, AlertCircle, ShoppingBag, History, Filter, Calendar, Tag, MapPin, ChevronRight, Search, Star, ArrowLeft, UserPlus, Pencil, KeyRound, Power, Trash2, Settings, CheckCircle } from 'lucide-react';
import UserManagement from '@/components/UserManagement';
import AccountSettings from '@/components/AccountSettings';

const STATUS_LABELS: Record<string, string> = {
  open: 'Ouverte', offer_selected: 'Offre choisie', closed: 'Clôturée',
  active: 'Active', selected: 'Choisie', rejected: 'Refusée',
  to_pickup: 'À récupérer', in_delivery: 'En livraison', delivered: 'Livrée',
  pending: 'En attente', paid: 'Payé',
};

interface RequestWithRelations extends Request {
  mechanic_profile?: Profile;
  offers?: OfferWithSupplier[];
}

interface OfferWithSupplier extends Offer {
  supplier_profile?: Profile;
}

interface AdminHistoryItem {
  request: Request;
  mechanic: Profile | null;
  selectedOffer: OfferWithSupplier | null;
  order: Order | null;
}

type PeriodFilter = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [requests, setRequests] = useState<RequestWithRelations[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reversements, setReversements] = useState<Reversement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReverseModal, setShowReverseModal] = useState<Order | null>(null);

  // Requests tab state
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);

  // History tab state
  const [historyItems, setHistoryItems] = useState<AdminHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [historyDetail, setHistoryDetail] = useState<AdminHistoryItem | null>(null);
  const [deliveredOffers, setDeliveredOffers] = useState<Map<string, Offer>>(new Map());

  // Selected offers tab state
  const [selectedOffersItems, setSelectedOffersItems] = useState<AdminHistoryItem[]>([]);
  const [selectedOffersDetail, setSelectedOffersDetail] = useState<AdminHistoryItem | null>(null);

  const loadData = useCallback(async () => {
    const [p, r, ord, rev, selOffers] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('requests').select('*').order('created_at', { ascending: false }),
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('reversements').select('*').order('created_at', { ascending: false }),
      supabase.from('offers').select('*').eq('status', 'selected').order('updated_at', { ascending: false }),
    ]);
    setProfiles(p.data ?? []);
    setOrders(ord.data ?? []);
    setReversements(rev.data ?? []);

    const profileMap = new Map<string, Profile>();
    (p.data ?? []).forEach((prof: Profile) => profileMap.set(prof.id, prof));

    const reqs = (r.data ?? []) as RequestWithRelations[];
    for (const req of reqs) {
      req.mechanic_profile = profileMap.get(req.mechanic_id);
    }
    setRequests(reqs);

    const delivered = (ord.data ?? []).filter((o: Order) => o.delivery_status === 'delivered');
    const deliveredOfferIds = delivered.map((o: Order) => o.offer_id);
    if (deliveredOfferIds.length > 0) {
      const { data: dOffers } = await supabase.from('offers').select('*').in('id', deliveredOfferIds);
      const map = new Map<string, Offer>();
      (dOffers ?? []).forEach((o: Offer) => map.set(o.id, o));
      setDeliveredOffers(map);
    } else {
      setDeliveredOffers(new Map());
    }

    // Build selected offers items from the same data we already fetched
    const selectedOfferList = (selOffers.data ?? []) as Offer[];
    if (selectedOfferList.length === 0) {
      setSelectedOffersItems([]);
    } else {
      const selOfferIds = selectedOfferList.map(o => o.id);
      const selReqIds = Array.from(new Set(selectedOfferList.map(o => o.request_id)));
      const selOrders = (ord.data ?? []).filter((o: Order) => selOfferIds.includes(o.offer_id));
      const selReqs = (r.data ?? []).filter((rq: Request) => selReqIds.includes(rq.id));

      const orderMap = new Map<string, Order>();
      selOrders.forEach((o: Order) => orderMap.set(o.offer_id, o));
      const reqMap = new Map<string, Request>();
      selReqs.forEach((rq: Request) => reqMap.set(rq.id, rq));

      const items: AdminHistoryItem[] = selectedOfferList
        .filter(offer => {
          const order = orderMap.get(offer.id);
          return !order || order.delivery_status !== 'delivered';
        })
        .map(offer => {
          const req = reqMap.get(offer.request_id) ?? ({} as Request);
          const order = orderMap.get(offer.id) ?? null;
          const mechanic = profileMap.get(req.mechanic_id) ?? null;
          return {
            request: req,
            mechanic,
            selectedOffer: { ...offer, supplier_profile: profileMap.get(offer.supplier_id) },
            order,
          };
        });
      setSelectedOffersItems(items);
    }
  }, []);

  const loadRequestOffers = useCallback(async (requestId: string) => {
    const { data: offers } = await supabase
      .from('offers')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true });

    const supplierIds = Array.from(new Set((offers ?? []).map((o: Offer) => o.supplier_id)));
    const suppliersRes = supplierIds.length > 0
      ? await supabase.from('profiles').select('*').in('id', supplierIds)
      : null;
    const suppliers = suppliersRes?.data ?? [];

    const supplierMap = new Map<string, Profile>();
    (suppliers ?? []).forEach((s: Profile) => supplierMap.set(s.id, s));

    const offersWithSuppliers: OfferWithSupplier[] = (offers ?? []).map((o: Offer) => ({
      ...o,
      supplier_profile: supplierMap.get(o.supplier_id),
    }));

    setRequests(prev => prev.map(r => r.id === requestId ? { ...r, offers: offersWithSuppliers } : r));
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const { data: closedReqs } = await supabase
        .from('requests')
        .select('*')
        .eq('status', 'closed')
        .order('completed_at', { ascending: false, nullsFirst: false });

      if (!closedReqs || closedReqs.length === 0) {
        setHistoryItems([]);
        return;
      }

      const reqIds = closedReqs.map(r => r.id);
      const mechanicIds = Array.from(new Set(closedReqs.map(r => r.mechanic_id)));

      const [{ data: reqOffers }, { data: mechanics }, { data: reqOrders }] = await Promise.all([
        supabase.from('offers').select('*').in('request_id', reqIds).eq('status', 'selected'),
        mechanicIds.length > 0
          ? await supabase.from('profiles').select('*').in('id', mechanicIds)
          : { data: [], error: null },
        supabase.from('orders').select('*').in('offer_id', (await supabase.from('offers').select('id').in('request_id', reqIds).eq('status', 'selected')).data?.map((o: { id: string }) => o.id) ?? []),
      ]);

      const offerMap = new Map<string, Offer>();
      (reqOffers ?? []).forEach((o: Offer) => offerMap.set(o.request_id, o));

      const mechanicMap = new Map<string, Profile>();
      (mechanics ?? []).forEach((m: Profile) => mechanicMap.set(m.id, m));

      const orderMap = new Map<string, Order>();
      (reqOrders ?? []).forEach((o: Order) => orderMap.set(o.offer_id, o));

      const items: AdminHistoryItem[] = (closedReqs as Request[]).map(req => {
        const offer = offerMap.get(req.id) ?? null;
        const order = offer ? orderMap.get(offer.id) ?? null : null;
        const mechanic = mechanicMap.get(req.mechanic_id) ?? null;
        return { request: req, mechanic, selectedOffer: offer ? { ...offer } : null, order };
      });

      setHistoryItems(items);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
    const channel = supabase.channel('admin-all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'offers' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reversements' }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadData]);

  useEffect(() => {
    if (activeTab === 'history') loadHistory();
  }, [activeTab, loadHistory]);

  const toggleApproval = async (p: Profile) => {
    await supabase.from('profiles').update({ is_approved: !p.is_approved }).eq('id', p.id);
    await loadData();
  };

  const approveAll = async () => {
    const pending = profiles.filter(p => p.role === 'supplier' && !p.is_approved);
    for (const p of pending) {
      await supabase.from('profiles').update({ is_approved: true }).eq('id', p.id);
    }
    await loadData();
  };

  const pendingSuppliers = profiles.filter(p => p.role === 'supplier' && !p.is_approved);
  const deliveredOrders = orders.filter(o => o.delivery_status === 'delivered');
  const allOffers = useMemo(() => {
    const fromRequests = requests.flatMap(r => r.offers ?? []);
    const merged = new Map<string, Offer>();
    fromRequests.forEach(o => merged.set(o.id, o));
    deliveredOffers.forEach((o, id) => { if (!merged.has(id)) merged.set(id, o); });
    return Array.from(merged.values());
  }, [requests, deliveredOffers]);
  const commissionTotal = useMemo(() => deliveredOrders.reduce((s, o) => {
    const offer = deliveredOffers.get(o.offer_id) ?? allOffers.find(of => of.id === o.offer_id);
    return s + (offer ? Number(o.cash_amount) - Number(offer.net_price) : 0);
  }, 0), [deliveredOrders, deliveredOffers, allOffers]);

  const activeRequests = requests.filter(r => r.status !== 'closed');
  const openRequests = requests.filter(r => r.status === 'open');

  const navItems = [
    { id: 'dashboard', label: 'Vue d\'ensemble', icon: <TrendingUp className="w-5 h-5" /> },
    { id: 'users', label: 'Utilisateurs', icon: <Users className="w-5 h-5" /> },
    { id: 'requests', label: 'Demandes en cours', icon: <Package className="w-5 h-5" /> },
    { id: 'history', label: 'Historique', icon: <History className="w-5 h-5" /> },
    { id: 'payouts', label: 'Reversements', icon: <Wallet className="w-5 h-5" /> },
    { id: 'settings', label: 'Paramètres', icon: <Settings className="w-5 h-5" /> },
  ];

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-700" /></div>;
  }

  return (
    <DashboardLayout navItems={navItems} activeTab={activeTab} onTabChange={setActiveTab} accentColor="slate">
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Administration</h1>
            <p className="text-slate-500 text-sm mt-1">Vue d'ensemble de la plateforme</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <StatCard icon={<CheckCircle className="w-5 h-5" />} label="Offres choisies" value={selectedOffersItems.length} color="green" />
            <StatCard icon={<Package className="w-5 h-5" />} label="Demandes ouvertes" value={openRequests.length} color="blue" onClick={() => setActiveTab('requests')} />
            <StatCard icon={<ShoppingBag className="w-5 h-5" />} label="Commandes livrées" value={deliveredOrders.length} color="amber" onClick={() => setActiveTab('history')} />
            <StatCard icon={<Wallet className="w-5 h-5" />} label="Commission" value={`${commissionTotal} DA`} color="green" onClick={() => setActiveTab('payouts')} />
          </div>

          {pendingSuppliers.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  <span className="font-medium text-amber-800 text-sm">{pendingSuppliers.length} fournisseur(s) en attente de validation</span>
                </div>
                <button onClick={approveAll} className="bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors">
                  Tout valider
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                <h2 className="font-semibold text-slate-800">Demandes ouvertes</h2>
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{openRequests.length}</span>
              </div>
            </div>
            {openRequests.length === 0 ? (
              <div className="px-5 py-10 text-center text-slate-400">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Aucune demande ouverte pour le moment.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {openRequests.map(req => {
                  const createdDate = new Date(req.created_at).toLocaleDateString('fr-DZ', { day: '2-digit', month: '2-digit' });
                  return (
                    <button
                      key={req.id}
                      onClick={() => setActiveTab('requests')}
                      className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-slate-50 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Package className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-800 text-sm truncate">{req.vehicle_make} {req.vehicle_model} {req.vehicle_year || ''}</div>
                        <div className="text-xs text-slate-400 truncate">
                          {req.description} · {req.mechanic_profile?.full_name ?? '—'} · {createdDate}
                        </div>
                      </div>
                      {req.urgency === 'urgent' && (
                        <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full shrink-0">Urgent</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h2 className="font-semibold text-slate-800">Offres choisies</h2>
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{selectedOffersItems.length}</span>
              </div>
            </div>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-400" />
              </div>
            ) : selectedOffersItems.length === 0 ? (
              <div className="px-5 py-10 text-center text-slate-400">
                <CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Aucune offre choisie pour le moment.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {selectedOffersItems.map(item => {
                  const { request, mechanic, selectedOffer, order } = item;
                  const statusLabel = order ? STATUS_LABELS[order.delivery_status] : 'En attente';
                  const statusColor = order
                    ? order.delivery_status === 'delivered'
                      ? 'bg-green-50 text-green-700'
                      : order.delivery_status === 'in_delivery'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-amber-50 text-amber-700'
                    : 'bg-slate-100 text-slate-500';
                  return (
                    <button
                      key={selectedOffer?.id ?? request.id}
                      onClick={() => setSelectedOffersDetail(item)}
                      className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-slate-50 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-lg bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                        <Tag className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-800 text-sm truncate">{selectedOffer?.part_name ?? request.description}</div>
                        <div className="text-xs text-slate-400 truncate">
                          {request.vehicle_make} {request.vehicle_model} · {mechanic?.full_name ?? '—'} · {selectedOffer?.supplier_profile?.full_name ?? '—'}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold text-slate-800">{selectedOffer ? `${selectedOffer.displayed_price} DA` : '—'}</div>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor}`}>{statusLabel}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-800 mb-4">Répartition par rôle</h2>
            <div className="space-y-2">
              {(['mechanic', 'supplier', 'delivery', 'admin'] as const).map(role => {
                const count = profiles.filter(p => p.role === role).length;
                const labels = { mechanic: 'Mécaniciens', supplier: 'Fournisseurs', delivery: 'Livreurs', admin: 'Admins' };
                const max = profiles.length || 1;
                return (
                  <div key={role} className="flex items-center gap-3">
                    <span className="text-sm text-slate-600 w-28">{labels[role]}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                      <div className="bg-slate-700 h-full rounded-full flex items-center justify-end px-2 transition-all" style={{ width: `${(count / max) * 100}%` }}>
                        <span className="text-xs font-bold text-white">{count}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <UserManagement profiles={profiles} onRefresh={loadData} />
      )}

      {activeTab === 'requests' && (
        <div className="space-y-4">
          <button onClick={() => setActiveTab('dashboard')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 font-medium transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>
          <h1 className="text-2xl font-bold text-slate-800">Demandes en cours</h1>
          <p className="text-slate-500 text-sm">Demandes ouvertes et offres correspondantes</p>

          {activeRequests.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>Aucune demande en cours.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeRequests.map(req => (
                <AdminRequestCard
                  key={req.id}
                  request={req}
                  expanded={expandedRequest === req.id}
                  onToggle={() => {
                    if (expandedRequest === req.id) {
                      setExpandedRequest(null);
                    } else {
                      setExpandedRequest(req.id);
                      if (!req.offers) loadRequestOffers(req.id);
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          <button onClick={() => setActiveTab('dashboard')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 font-medium transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>
          <AdminHistoryView
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
          <button onClick={() => setActiveTab('dashboard')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 font-medium transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>
          <h1 className="text-2xl font-bold text-slate-800">Reversements</h1>
          {reversements.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
              <Wallet className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>Aucun reversement enregistré.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {reversements.map(rev => {
                const supp = profiles.find(p => p.id === rev.supplier_id);
                return (
                  <div key={rev.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center shrink-0"><Wallet className="w-5 h-5" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-800 text-sm">{supp?.full_name ?? 'Fournisseur'}</div>
                      <div className="text-xs text-slate-400">{new Date(rev.created_at).toLocaleDateString('fr-DZ')}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-800">{rev.net_amount} DA</div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${rev.status === 'paid' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                      {STATUS_LABELS[rev.status]}
                    </span>
                    {rev.status === 'pending' && (
                      <button onClick={async () => { await supabase.from('reversements').update({ status: 'paid', payment_date: new Date().toISOString() }).eq('id', rev.id); await loadData(); }} className="bg-green-600 hover:bg-green-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
                        Marquer payé
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {showReverseModal && (
        <ReverseModal order={showReverseModal} allOffers={allOffers} profiles={profiles} onClose={() => setShowReverseModal(null)} onDone={async () => { setShowReverseModal(null); await loadData(); }} />
      )}

      {activeTab === 'settings' && <AccountSettings />}

      {historyDetail && (
        <AdminHistoryDetailModal item={historyDetail} onClose={() => setHistoryDetail(null)} />
      )}

      {selectedOffersDetail && (
        <AdminHistoryDetailModal item={selectedOffersDetail} onClose={() => setSelectedOffersDetail(null)} />
      )}
    </DashboardLayout>
  );
}

function StatCard({ icon, label, value, color, onClick }: { icon: React.ReactNode; label: string; value: string | number; color: string; onClick?: () => void }) {
  const COLORS: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-700 border-slate-300',
    blue: 'bg-blue-50 text-blue-600 border-blue-300',
    amber: 'bg-amber-50 text-amber-600 border-amber-300',
    green: 'bg-green-50 text-green-600 border-green-300',
  };
  return (
    <button type="button" onClick={onClick} className={`bg-white rounded-xl border-2 p-4 text-left transition-all hover:shadow-md hover:-translate-y-0.5 ${COLORS[color]}`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${COLORS[color]}`}>{icon}</div>
      <div className="text-xl font-bold text-slate-800">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </button>
  );
}

function AdminRequestCard({ request, expanded, onToggle }: { request: RequestWithRelations; expanded: boolean; onToggle: () => void }) {
  const createdDate = new Date(request.created_at).toLocaleDateString('fr-DZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const offers = request.offers ?? [];
  const offersLoaded = request.offers !== undefined;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50/50 transition-colors">
        <div className={`w-11 h-11 rounded-lg flex items-center justify-center text-white shrink-0 ${request.urgency === 'urgent' ? 'bg-red-500' : 'bg-slate-700'}`}>
          <Package className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-800 truncate">{request.vehicle_make} {request.vehicle_model} {request.vehicle_year || ''}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${request.status === 'open' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
              {STATUS_LABELS[request.status]}
            </span>
          </div>
          <div className="text-sm text-slate-500 truncate mt-0.5">{request.description}</div>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap">
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{createdDate}</span>
            {request.mechanic_profile && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{request.mechanic_profile.full_name}</span>}
            {request.urgency === 'urgent' && <span className="text-red-500 font-medium">Urgent</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {offersLoaded && offers.length > 0 && (
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full">{offers.length} offre{offers.length > 1 ? 's' : ''}</span>
          )}
          <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50/50 p-4">
          {!offersLoaded ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-400" />
            </div>
          ) : offers.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-4">Aucune offre pour cette demande.</p>
          ) : (
            <div className="space-y-2">
              {offers.map(offer => (
                <div key={offer.id} className="bg-white rounded-lg border border-slate-200 p-3 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${offer.status === 'selected' ? 'bg-green-50 text-green-600' : offer.status === 'rejected' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-600'}`}>
                    <Tag className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-800 text-sm truncate">{offer.part_name}</div>
                    <div className="text-xs text-slate-400 truncate">{offer.part_brand} {offer.reference ? `· Réf: ${offer.reference}` : ''}</div>
                    {offer.supplier_profile && <div className="text-xs text-slate-400 mt-0.5">{offer.supplier_profile.full_name}</div>}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-slate-800">{offer.displayed_price} DA</div>
                    <div className="text-xs text-slate-400">net: {offer.net_price} DA</div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${offer.status === 'selected' ? 'bg-green-50 text-green-700' : offer.status === 'rejected' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-700'}`}>
                    {STATUS_LABELS[offer.status]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SelectedOffersView({ items, loading, onOpen }: {
  items: AdminHistoryItem[];
  loading: boolean;
  onOpen: (item: AdminHistoryItem) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'no_order' | 'to_pickup' | 'in_delivery' | 'delivered'>('all');

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter(item => {
      if (statusFilter === 'no_order' && item.order) return false;
      if (statusFilter === 'to_pickup' && item.order?.delivery_status !== 'to_pickup') return false;
      if (statusFilter === 'in_delivery' && item.order?.delivery_status !== 'in_delivery') return false;
      if (statusFilter === 'delivered' && item.order?.delivery_status !== 'delivered') return false;

      if (q) {
        const vMake = item.request.vehicle_make.toLowerCase();
        const vModel = item.request.vehicle_model.toLowerCase();
        const partName = (item.selectedOffer?.part_name ?? '').toLowerCase();
        const partBrand = (item.selectedOffer?.part_brand ?? '').toLowerCase();
        const mechanic = (item.mechanic?.full_name ?? '').toLowerCase();
        const supplier = (item.selectedOffer?.supplier_profile?.full_name ?? '').toLowerCase();
        const haystack = `${vMake} ${vModel} ${partName} ${partBrand} ${mechanic} ${supplier}`;
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [items, searchQuery, statusFilter]);

  const statusOptions: { id: typeof statusFilter; label: string }[] = [
    { id: 'all', label: 'Toutes' },
    { id: 'no_order', label: 'Sans commande' },
    { id: 'to_pickup', label: 'À récupérer' },
    { id: 'in_delivery', label: 'En livraison' },
    { id: 'delivered', label: 'Livrée' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Offres choisies</h1>
        <p className="text-slate-500 text-sm mt-1">Offres sélectionnées par les mécaniciens, en cours de traitement</p>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Rechercher : pièce, véhicule, mécanicien, fournisseur..."
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-slate-400 outline-none bg-white"
        />
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        <Filter className="w-4 h-4 text-slate-400 shrink-0" />
        {statusOptions.map(opt => (
          <button
            key={opt.id}
            onClick={() => setStatusFilter(opt.id)}
            className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
              statusFilter === opt.id
                ? 'bg-slate-700 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-400'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-700" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>{items.length === 0 ? 'Aucune offre choisie pour le moment.' : 'Aucun résultat pour ces critères.'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Date</th>
                  <th className="text-left px-4 py-3 font-semibold">Pièce</th>
                  <th className="text-left px-4 py-3 font-semibold">Véhicule</th>
                  <th className="text-left px-4 py-3 font-semibold">Mécanicien</th>
                  <th className="text-left px-4 py-3 font-semibold">Fournisseur</th>
                  <th className="text-left px-4 py-3 font-semibold">Statut</th>
                  <th className="text-right px-4 py-3 font-semibold">Prix</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map(item => {
                  const { request, mechanic, selectedOffer, order } = item;
                  const offerDate = new Date(selectedOffer?.updated_at ?? request.created_at).toLocaleDateString('fr-DZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
                  const statusLabel = order ? STATUS_LABELS[order.delivery_status] : 'En attente';
                  const statusColor = order
                    ? order.delivery_status === 'delivered'
                      ? 'text-green-700 bg-green-50'
                      : order.delivery_status === 'in_delivery'
                        ? 'text-blue-700 bg-blue-50'
                        : 'text-amber-700 bg-amber-50'
                    : 'text-slate-500 bg-slate-100';
                  return (
                    <tr
                      key={selectedOffer?.id ?? request.id}
                      onClick={() => onOpen(item)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{offerDate}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{selectedOffer?.part_name ?? request.description}</td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{request.vehicle_make} {request.vehicle_model} {request.vehicle_year || ''}</td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{mechanic?.full_name ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{selectedOffer?.supplier_profile?.full_name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor}`}>
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-800 whitespace-nowrap">
                        {selectedOffer ? `${selectedOffer.displayed_price} DA` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminHistoryView({ items, loading, searchQuery, setSearchQuery, periodFilter, setPeriodFilter, customFrom, setCustomFrom, customTo, setCustomTo, onOpen }: {
  items: AdminHistoryItem[];
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  periodFilter: PeriodFilter;
  setPeriodFilter: (v: PeriodFilter) => void;
  customFrom: string;
  setCustomFrom: (v: string) => void;
  customTo: string;
  setCustomTo: (v: string) => void;
  onOpen: (item: AdminHistoryItem) => void;
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
      const refDate = new Date(item.request.completed_at ?? item.request.created_at);

      if (periodFilter === 'today' && refDate < startOfDay) return false;
      if (periodFilter === 'week' && refDate < startOfWeek) return false;
      if (periodFilter === 'month' && refDate < startOfMonth) return false;
      if (periodFilter === 'year' && refDate < startOfYear) return false;
      if (periodFilter === 'custom') {
        if (customFrom && refDate < new Date(customFrom + 'T00:00:00')) return false;
        if (customTo && refDate > new Date(customTo + 'T23:59:59')) return false;
      }

      if (q) {
        const vMake = item.request.vehicle_make.toLowerCase();
        const vModel = item.request.vehicle_model.toLowerCase();
        const partName = (item.selectedOffer?.part_name ?? '').toLowerCase();
        const partBrand = (item.selectedOffer?.part_brand ?? '').toLowerCase();
        const mechanic = (item.mechanic?.full_name ?? '').toLowerCase();
        const haystack = `${vMake} ${vModel} ${partName} ${partBrand} ${mechanic}`;
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
        <p className="text-slate-500 text-sm mt-1">Demandes clôturées et commandes livrées</p>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Rechercher : pièce, véhicule, mécanicien..."
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-slate-400 outline-none bg-white"
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
                ? 'bg-slate-700 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-400'
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
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="text-sm px-2 py-1.5 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-slate-400" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500">Au</label>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="text-sm px-2 py-1.5 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-slate-400" />
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-700" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          <History className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>{items.length === 0 ? 'Aucune demande clôturée pour le moment.' : 'Aucun résultat pour ces critères.'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Date</th>
                  <th className="text-left px-4 py-3 font-semibold">Pièce / Demande</th>
                  <th className="text-left px-4 py-3 font-semibold">Véhicule</th>
                  <th className="text-left px-4 py-3 font-semibold">Mécanicien</th>
                  <th className="text-left px-4 py-3 font-semibold">Type</th>
                  <th className="text-right px-4 py-3 font-semibold">Prix</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map(item => {
                  const { request, mechanic, selectedOffer, order } = item;
                  const closedDate = new Date(request.completed_at ?? request.created_at).toLocaleDateString('fr-DZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
                  const isDelivered = order?.delivery_status === 'delivered';
                  return (
                    <tr
                      key={request.id}
                      onClick={() => onOpen(item)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{closedDate}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{selectedOffer?.part_name ?? request.description}</td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{request.vehicle_make} {request.vehicle_model} {request.vehicle_year || ''}</td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{mechanic?.full_name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isDelivered ? 'text-green-700 bg-green-50' : 'text-slate-500 bg-slate-100'}`}>
                          {isDelivered ? 'Livrée' : 'Clôturée'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-800 whitespace-nowrap">
                        {selectedOffer ? `${selectedOffer.displayed_price} DA` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminHistoryDetailModal({ item, onClose }: { item: AdminHistoryItem; onClose: () => void }) {
  const { request, mechanic, selectedOffer, order } = item;
  const isClosed = request.status === 'closed';
  const dateValue = isClosed
    ? new Date(request.completed_at ?? request.created_at).toLocaleDateString('fr-DZ', { day: '2-digit', month: 'long', year: 'numeric' })
    : new Date(request.created_at).toLocaleDateString('fr-DZ', { day: '2-digit', month: 'long', year: 'numeric' });
  const commission = selectedOffer && order ? Number(order.cash_amount) - Number(selectedOffer.net_price) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-slate-800 text-lg">{selectedOffer?.part_name ?? request.description}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isClosed ? 'text-slate-500 bg-slate-100' : 'text-amber-700 bg-amber-50'}`}>
                {isClosed ? 'Demande clôturée' : 'Offre choisie'}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <DetailField label={isClosed ? 'Date de clôture' : 'Date de la demande'} value={dateValue} icon={<Calendar className="w-4 h-4" />} />
            <DetailField label="Véhicule" value={`${request.vehicle_make} ${request.vehicle_model} ${request.vehicle_year || ''}`} icon={<Package className="w-4 h-4" />} />
            <DetailField label="Mécanicien" value={mechanic?.full_name ?? '—'} icon={<MapPin className="w-4 h-4" />} />
            {selectedOffer && <DetailField label="Fournisseur (pièce)" value={selectedOffer.part_brand} icon={<Tag className="w-4 h-4" />} />}
          </div>

          {selectedOffer && (
            <div className="border border-slate-200 rounded-xl p-4">
              <div className="text-xs font-semibold text-slate-500 uppercase mb-2">Offre sélectionnée</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-slate-400">Pièce</div>
                  <div className="text-sm font-medium text-slate-800">{selectedOffer.part_name}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Référence</div>
                  <div className="text-sm font-medium text-slate-800">{selectedOffer.reference ?? '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Prix net fournisseur</div>
                  <div className="text-sm font-medium text-slate-800">{selectedOffer.net_price} DA</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Prix affiché client</div>
                  <div className="text-sm font-medium text-slate-800">{selectedOffer.displayed_price} DA</div>
                </div>
              </div>
            </div>
          )}

          {order && (
            <div className="border border-slate-200 rounded-xl p-4">
              <div className="text-xs font-semibold text-slate-500 uppercase mb-2">Commande</div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-600">Statut: {STATUS_LABELS[order.delivery_status]}</div>
                  {order.delivery_date && (
                    <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                      <Truck className="w-3 h-3" />
                      Livraison: {new Date(order.delivery_date).toLocaleDateString('fr-DZ')}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-bold text-slate-800">{order.cash_amount} DA</div>
                  <div className="text-xs text-green-600">Commission: +{commission} DA</div>
                </div>
              </div>
            </div>
          )}
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

function ReverseModal({ order, allOffers, profiles, onClose, onDone }: {
  order: Order;
  allOffers: Offer[];
  profiles: Profile[];
  onClose: () => void;
  onDone: () => void;
}) {
  const offer = allOffers.find(o => o.id === order.offer_id);
  const supplier = profiles.find(p => p.id === order.supplier_id);
  const [loading, setLoading] = useState(false);

  const handleReverse = async () => {
    setLoading(true);
    await supabase.from('reversements').insert({
      supplier_id: order.supplier_id,
      order_id: order.id,
      net_amount: offer?.net_price ?? 0,
      status: 'pending',
    });
    setLoading(false);
    onDone();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-bold text-slate-800 text-lg">Créer un reversement</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="bg-slate-50 rounded-lg p-3 space-y-1.5">
            <div className="flex justify-between text-sm"><span className="text-slate-500">Fournisseur</span><span className="font-medium text-slate-800">{supplier?.full_name}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500">Pièce</span><span className="font-medium text-slate-800">{offer?.part_name}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500">Prix encaissé</span><span className="font-medium text-slate-800">{order.cash_amount} DA</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500">Net à reverser</span><span className="font-bold text-green-700">{offer?.net_price} DA</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500">Commission (5%)</span><span className="font-medium text-slate-600">{Number(order.cash_amount) - Number(offer?.net_price ?? 0)} DA</span></div>
          </div>
          <button onClick={handleReverse} disabled={loading} className="w-full bg-slate-700 hover:bg-slate-800 disabled:bg-slate-400 text-white font-semibold py-3 rounded-xl transition-colors">
            {loading ? 'Enregistrement...' : 'Confirmer le reversement'}
          </button>
        </div>
      </div>
    </div>
  );
}
