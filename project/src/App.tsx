import { useAuth } from '@/contexts/AuthContext';
import AuthPage from '@/pages/AuthPage';
import OnboardingMechanic from '@/pages/OnboardingMechanic';
import OnboardingSupplier from '@/pages/OnboardingSupplier';
import MechanicDashboard from '@/pages/MechanicDashboard';
import SupplierDashboard from '@/pages/SupplierDashboard';
import DeliveryDashboard from '@/pages/DeliveryDashboard';
import AdminDashboard from '@/pages/AdminDashboard';
import { ShieldCheck, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function App() {
  const { user, profile, garageProfile, supplierProfile, loading } = useAuth();
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    setOnboarded(false);
  }, [profile?.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  if (!user || !profile) {
    return <AuthPage onAuth={() => {}} />;
  }

  // Inactive accounts are blocked
  if (profile.is_active === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Compte désactivé</h1>
          <p className="text-slate-500 text-sm">Votre compte a été désactivé par l'administrateur. Contactez-le pour plus d'informations.</p>
        </div>
      </div>
    );
  }

  // Onboarding checks
  if (!onboarded) {
    if (profile.role === 'mechanic' && !garageProfile) {
      return <OnboardingMechanic onComplete={() => setOnboarded(true)} />;
    }
    if (profile.role === 'supplier' && !supplierProfile) {
      return <OnboardingSupplier onComplete={() => setOnboarded(true)} />;
    }
    setOnboarded(true);
  }

  switch (profile.role) {
    case 'mechanic':
      return <MechanicDashboard />;
    case 'supplier':
      return <SupplierDashboard />;
    case 'delivery':
      return <DeliveryDashboard />;
    case 'admin':
      return <AdminDashboard />;
    default:
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500">Rôle inconnu</p>
          </div>
        </div>
      );
  }
}
