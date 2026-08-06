export type Role = 'mechanic' | 'supplier' | 'delivery' | 'admin';
export type RequestStatus = 'open' | 'offer_selected' | 'closed';
export type OfferStatus = 'active' | 'selected' | 'rejected';
export type DeliveryStatus = 'to_pickup' | 'in_delivery' | 'delivered';
export type ReversementStatus = 'pending' | 'paid';
export type Urgency = 'normal' | 'urgent';

export interface Profile {
  id: string;
  role: Role;
  full_name: string;
  phone: string;
  is_approved: boolean;
  created_at: string;
  login_id: string | null;
  anonymous_reference: string | null;
  first_name: string;
  last_name: string;
  employee_id: string | null;
  address: string;
  city: string;
  is_active: boolean;
  first_login_completed: boolean;
  created_by: string | null;
}

export interface PublicProfile {
  id: string;
  anonymous_reference: string;
  role: Role;
}

export interface GarageProfile {
  id: string;
  user_id: string;
  garage_name: string;
  address: string;
  city: string;
  wilaya: string;
  created_at: string;
}

export interface SupplierProfile {
  id: string;
  user_id: string;
  company_name: string;
  address: string;
  city: string;
  wilaya: string;
  specialties: string;
  zone: string;
  created_at: string;
}

export interface Request {
  id: string;
  mechanic_id: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number | null;
  vehicle_brand_id: string | null;
  vehicle_model_id: string | null;
  description: string;
  audio_url: string | null;
  urgency: Urgency;
  status: RequestStatus;
  part_name: string | null;
  part_category: string | null;
  carte_grise_url: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface Offer {
  id: string;
  request_id: string;
  supplier_id: string;
  part_name: string;
  part_brand: string;
  reference: string | null;
  net_price: number;
  displayed_price: number;
  delivery_estimate: string;
  status: OfferStatus;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  offer_id: string;
  mechanic_id: string;
  supplier_id: string;
  delivery_status: DeliveryStatus;
  selected_at: string;
  delivery_date: string | null;
  cash_amount: number;
  created_at: string;
}

export interface Reversement {
  id: string;
  supplier_id: string;
  order_id: string;
  net_amount: number;
  status: ReversementStatus;
  payment_date: string | null;
  created_at: string;
}

export interface Rating {
  id: string;
  author_id: string;
  target_id: string;
  order_id: string;
  score: number;
  comment: string | null;
  created_at: string;
}

export interface SupplierBrand {
  supplier_id: string;
  brand_id: string;
  created_at: string;
}

type Row<T> = { Row: T };
type Insert<T> = { Insert: T };
type Update<T> = { Update: Partial<T> };

export interface Database {
  public: {
    Tables: {
      profiles: Row<Profile> & Insert<Profile> & Update<Profile>;
      garage_profiles: Row<GarageProfile> & Insert<GarageProfile> & Update<GarageProfile>;
      supplier_profiles: Row<SupplierProfile> & Insert<SupplierProfile> & Update<SupplierProfile>;
      requests: Row<Request> & Insert<Request> & Update<Request>;
      offers: Row<Offer> & Insert<Offer> & Update<Offer>;
      orders: Row<Order> & Insert<Order> & Update<Order>;
      reversements: Row<Reversement> & Insert<Reversement> & Update<Reversement>;
      ratings: Row<Rating> & Insert<Rating> & Update<Rating>;
    };
  };
}
