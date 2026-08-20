import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import AuthPage from '@/pages/AuthPage';
import OnboardingMechanic from '@/pages/OnboardingMechanic';
import OnboardingSupplier from '@/pages/OnboardingSupplier';
import MechanicDashboard from '@/pages/MechanicDashboard';
import SupplierDashboard from '@/pages/SupplierDashboard';
import DeliveryDashboard from '@/pages/DeliveryDashboard';
import AdminDashboard from '@/pages/AdminDashboard';
import { ShieldCheck, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import ImpersonationBanner from '@/components/ImpersonationBanner';
import InstallPrompt from '@/components/InstallPrompt';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function App() {
  const { user, profile, garageProfile, supplierProfile, loading } = useAuth();
  const { t } = useLanguage();
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    setOnboarded(false);
  }, [profile?.id]);

  let content: React.ReactNode;

  if (loading) {
    content = (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  } else if (!user || !profile) {
    content = <AuthPage onAuth={() => {}} />;
  } else if (profile.is_active === false) {
    content = (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">{t('common.accountDisabledTitle')}</h1>
          <p className="text-slate-500 text-sm">{t('common.accountDisabledMessage')}</p>
        </div>
      </div>
    );
  } else {
    // Onboarding checks
    if (!onboarded) {
      if (profile.role === 'mechanic' && !garageProfile) {
        content = <OnboardingMechanic onComplete={() => setOnboarded(true)} />;
      } else if (profile.role === 'supplier' && !supplierProfile) {
        content = <OnboardingSupplier onComplete={() => setOnboarded(true)} />;
      } else {
        setOnboarded(true);
      }
    }

    if (!content) {
      switch (profile.role) {
        case 'mechanic':
          content = <MechanicDashboard />;
          break;
        case 'supplier':
          content = <SupplierDashboard />;
          break;
        case 'delivery':
          content = <DeliveryDashboard />;
          break;
        case 'admin':
          content = <AdminDashboard />;
          break;
        default:
          content = (
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500">{t('common.unknownRole')}</p>
              </div>
            </div>
          );
      }
    }
  }

  return (
    <>
      <LanguageSwitcher />
      <ImpersonationBanner />
      {content}
      <InstallPrompt />
    </>
  );
}
