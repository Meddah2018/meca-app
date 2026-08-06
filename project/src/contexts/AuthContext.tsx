import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile, GarageProfile, SupplierProfile, SupplierBrand } from '@/lib/database.types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  garageProfile: GarageProfile | null;
  supplierProfile: SupplierProfile | null;
  supplierBrands: SupplierBrand[];
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [garageProfile, setGarageProfile] = useState<GarageProfile | null>(null);
  const [supplierProfile, setSupplierProfile] = useState<SupplierProfile | null>(null);
  const [supplierBrands, setSupplierBrands] = useState<SupplierBrand[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    setProfile(prof);

    if (!prof) return;

    if (prof.role === 'mechanic') {
      const { data: gp } = await supabase
        .from('garage_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      setGarageProfile(gp);
    } else if (prof?.role === 'supplier') {
      const { data: sp } = await supabase
        .from('supplier_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      setSupplierProfile(sp);
      if (sp) {
        const { data: brands } = await supabase
          .from('supplier_brands')
          .select('*')
          .eq('supplier_id', sp.id);
        setSupplierBrands(brands ?? []);
      }
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchProfile(s.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      (async () => {
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          await fetchProfile(s.user.id);
        } else {
          setProfile(null);
          setGarageProfile(null);
          setSupplierProfile(null);
          setSupplierBrands([]);
        }
        setLoading(false);
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, garageProfile, supplierProfile, supplierBrands, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
