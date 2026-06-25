export interface Table {
  id: number;
  table_name: string;
  capacity: number;
  available: boolean;
}

export interface Reservation {
  id: string;
  customer_name: string;
  phone: string;
  email: string;
  reservation_date: string;
  reservation_time: string;
  guests: number;
  table_number: string | null;
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'completed';
  created_at: string;
}

export interface WaitingListEntry {
  id: string;
  name: string;
  phone: string;
  email: string;
  date: string;
  time: string;
  guests: number;
  created_at: string;
}

export interface AdminUser {
  email: string;
  role: 'admin';
}
