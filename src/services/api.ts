import { Table, Reservation, WaitingListEntry } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Helper to construct secure admin headers
const getAdminHeaders = () => {
  const token = localStorage.getItem('bon_appetite_admin_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

export const api = {
  // ----------------------------------------------------
  // CUSTOMER ENDPOINTS
  // ----------------------------------------------------

  async getAvailableSlots(date: string): Promise<{ slot: string; isAvailable: boolean; capacityLeft: number; occupiedCount: number }[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/slots?date=${encodeURIComponent(date)}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to fetch slot availability.');
      }
      const data = await res.json();
      return data.slots || [];
    } catch (err: any) {
      throw new Error(err.message || 'Service is temporarily offline. Please try again later.');
    }
  },

  async submitBooking(payload: {
    customer_name: string;
    phone: string;
    email: string;
    reservation_date: string;
    reservation_time: string;
    guests: number;
  }): Promise<{ success: boolean; reservation?: Reservation; code?: string; message?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to place booking.');
      }
      return res.json();
    } catch (err: any) {
      throw new Error(err.message || 'Server connection failed. Service may be temporarily unavailable.');
    }
  },

  async joinWaitingList(payload: {
    name: string;
    phone: string;
    email: string;
    date: string;
    time: string;
    guests: number;
  }): Promise<{ success: boolean; entry?: WaitingListEntry }> {
    try {
      const res = await fetch(`${API_BASE_URL}/waiting-list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to join waiting list.');
      }
      return res.json();
    } catch (err: any) {
      throw new Error(err.message || 'Server connection failed. Service may be temporarily unavailable.');
    }
  },

  async getHistory(email: string): Promise<Reservation[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/reservations/history?email=${encodeURIComponent(email)}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to load booking history.');
      }
      const data = await res.json();
      return data.history || [];
    } catch (err: any) {
      throw new Error(err.message || 'Server connection failed. Service may be temporarily unavailable.');
    }
  },

  async cancelReservation(id: string): Promise<Reservation> {
    try {
      const res = await fetch(`${API_BASE_URL}/reservations/${id}/cancel`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to cancel reservation.');
      }
      const data = await res.json();
      return data.reservation;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to connect to cancellation server.');
    }
  },

  async verifyQR(id: string, token: string): Promise<{ valid: boolean; status?: string; message: string; reservation?: Reservation }> {
    try {
      const res = await fetch(`${API_BASE_URL}/reservations/verify/${id}?token=${encodeURIComponent(token)}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to verify ticket.');
      }
      return res.json();
    } catch (err: any) {
      throw new Error(err.message || 'Error communicating with ticket verification server.');
    }
  },

  // ----------------------------------------------------
  // ADMIN ENDPOINTS (Authenticated)
  // ----------------------------------------------------

  async adminLogin(email: string, password: string): Promise<{ success: boolean; token: string; user: { email: string; role: string } }> {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Invalid credentials');
      }
      return res.json();
    } catch (err: any) {
      throw new Error(err.message || 'Admin authentication failed.');
    }
  },

  async adminGetReservations(date?: string): Promise<Reservation[]> {
    try {
      const url = date ? `${API_BASE_URL}/admin/reservations?date=${date}` : `${API_BASE_URL}/admin/reservations`;
      const res = await fetch(url, { headers: getAdminHeaders() });
      if (!res.ok) throw new Error('Failed to load dashboard reservations');
      const data = await res.json();
      return data.reservations || [];
    } catch (err: any) {
      throw new Error(err.message || 'Failed to retrieve reservations.');
    }
  },

  async adminGetWaitingList(): Promise<WaitingListEntry[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/waiting-list`, { headers: getAdminHeaders() });
      if (!res.ok) throw new Error('Failed to load waiting list');
      const data = await res.json();
      return data.waitingList || [];
    } catch (err: any) {
      throw new Error(err.message || 'Failed to retrieve waiting list.');
    }
  },

  async adminGetTables(): Promise<Table[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/tables`, { headers: getAdminHeaders() });
      if (!res.ok) throw new Error('Failed to load tables status');
      const data = await res.json();
      return data.tables || [];
    } catch (err: any) {
      throw new Error(err.message || 'Failed to retrieve table information.');
    }
  },

  async adminToggleTable(id: number, available: boolean): Promise<Table> {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/tables/${id}/toggle`, {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify({ available }),
      });
      if (!res.ok) throw new Error('Failed to update table settings');
      const data = await res.json();
      return data.table;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to toggle table status.');
    }
  },

  async adminUpdateReservationStatus(id: string, status: string, tableNumber?: string | null): Promise<Reservation> {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/reservations/${id}/status`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({ status, table_number: tableNumber }),
      });
      if (!res.ok) throw new Error('Failed to update reservation status');
      const data = await res.json();
      return data.reservation;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update reservation.');
    }
  },

  async deleteWaitingList(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/waiting-list/${id}`, {
        method: 'DELETE',
        headers: getAdminHeaders(),
      });
      if (!res.ok) throw new Error('Failed to delete waiting list entry');
      const data = await res.json();
      return data.success;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to remove waiting list entry.');
    }
  },

  // ----------------------------------------------------
  // ADMIN FOOD ORDERING & SYSTEM CONFIG ENDPOINTS
  // ----------------------------------------------------

  async adminGetOrders(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/orders`, { headers: getAdminHeaders() });
      if (!res.ok) throw new Error('Failed to load food orders');
      const data = await res.json();
      return data.orders || [];
    } catch (err: any) {
      throw new Error(err.message || 'Failed to retrieve food orders.');
    }
  },

  async adminVerifyPayment(id: string, status: 'paid' | 'failed', paymentReference?: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/orders/${id}/verify-payment`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({ status, payment_reference: paymentReference || null }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to verify payment');
      }
      return res.json();
    } catch (err: any) {
      throw new Error(err.message || 'Failed to verify payment.');
    }
  },

  async adminUpdateOrderStatus(id: string, status: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/orders/${id}/status`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update order status');
      }
      return res.json();
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update order status.');
    }
  },

  async adminGetSettings(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/settings`, { headers: getAdminHeaders() });
      if (!res.ok) throw new Error('Failed to load system settings');
      const data = await res.json();
      return data.settings || [];
    } catch (err: any) {
      throw new Error(err.message || 'Failed to retrieve settings.');
    }
  },

  async adminUpdateSetting(key: string, value: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/settings`, {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify({ key, value }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update setting');
      }
      return res.json();
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update setting.');
    }
  },

  async adminGetMenu(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/menu`, { headers: getAdminHeaders() });
      if (!res.ok) throw new Error('Failed to load menu catalog');
      const data = await res.json();
      return data.items || [];
    } catch (err: any) {
      throw new Error(err.message || 'Failed to retrieve menu catalog.');
    }
  },

  async adminAddMenuItem(payload: { name: string; price: number; available?: boolean; preparation_time_minutes?: number }): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/menu`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add menu item');
      }
      return res.json();
    } catch (err: any) {
      throw new Error(err.message || 'Failed to add menu item.');
    }
  },

  async adminUpdateMenuItem(id: number, payload: any): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/menu/${id}`, {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update menu item');
      }
      return res.json();
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update menu item.');
    }
  },

  async adminDeleteMenuItem(id: number): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/menu/${id}`, {
        method: 'DELETE',
        headers: getAdminHeaders(),
      });
      if (!res.ok) throw new Error('Failed to delete menu item');
      const data = await res.json();
      return data.success;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to delete menu item.');
    }
  },

  async adminRegenerateTableQR(id: number): Promise<{ success: boolean; table: Table; raw_token: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/tables/${id}/regenerate-qr`, {
        method: 'POST',
        headers: getAdminHeaders()
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to regenerate QR code');
      }
      return res.json();
    } catch (err: any) {
      throw new Error(err.message || 'Failed to regenerate QR code.');
    }
  }
};
