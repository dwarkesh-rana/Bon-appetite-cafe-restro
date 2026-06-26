import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { logger } from './logger';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const isUsingSupabase = !!(supabaseUrl && supabaseKey);

// Log database mode
if (isUsingSupabase) {
  logger.info('[Database] Connecting to live Supabase PostgreSQL Instance.');
} else {
  logger.info('[Database] Supabase API credentials not found. Falling back to In-Memory Mock Database.');
}

// ----------------------------------------------------
// Concurrency Control: Mutex Lock
// ----------------------------------------------------
class Mutex {
  private queue: (() => void)[] = [];
  private locked = false;

  async acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      const release = () => {
        if (this.queue.length > 0) {
          const next = this.queue.shift();
          if (next) next();
        } else {
          this.locked = false;
        }
      };

      if (this.locked) {
        this.queue.push(() => resolve(release));
      } else {
        this.locked = true;
        resolve(release);
      }
    });
  }
}

const bookingMutex = new Mutex();
const orderMutex = new Mutex();

// ----------------------------------------------------
// Interfaces
// ----------------------------------------------------
export interface TableRecord {
  id: number;
  table_name: string;
  capacity: number;
  available: boolean;
  qr_token_hash: string;
  status: 'available' | 'occupied' | 'reserved' | 'cleaning';
}

export interface ReservationRecord {
  id: string;
  customer_name: string;
  phone: string;
  email: string;
  reservation_date: string;
  reservation_time: string;
  guests: number;
  table_number: string | null;
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'completed';
  verification_token: string | null;
  email_status: 'pending' | 'sent' | 'failed';
  whatsapp_status: 'pending' | 'sent' | 'failed';
  created_at: string;
}

export interface WaitingListRecord {
  id: string;
  name: string;
  phone: string;
  email: string;
  date: string;
  time: string;
  guests: number;
  created_at: string;
}

export interface SystemSettingRecord {
  key: string;
  value: string;
  description?: string | null;
}

export interface MenuItemRecord {
  id: number;
  name: string;
  price: number;
  available: boolean;
  preparation_time_minutes: number;
  deleted: boolean;
}

export interface OrderRecord {
  id: string;
  order_number: string;
  invoice_number: string | null;
  customer_name: string;
  phone: string | null;
  table_number: string;
  reservation_id: string | null;
  subtotal: number;
  tax_amount: number;
  service_charge: number;
  final_amount: number;
  payment_status: 'pending_payment' | 'pending_verification' | 'paid' | 'failed' | 'expired';
  order_status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'cancelled';
  upi_transaction_id: string | null;
  estimated_ready_time: number;
  order_session_token_hash: string;
  payment_expires_at: string;
  verification_time: string | null;
  verified_by: string | null;
  payment_reference: string | null;
  confirmed_at: string | null;
  preparing_at: string | null;
  ready_at: string | null;
  served_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
}

export interface OrderItemRecord {
  id: string;
  order_id: string;
  food_item: string;
  quantity: number;
  price: number;
  special_instruction: string | null;
}

export interface AuditLogRecord {
  id?: string;
  actor: string;
  action: string;
  details: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at?: string;
}

// ----------------------------------------------------
// Supabase Live Client (if configured)
// ----------------------------------------------------
export const supabase = isUsingSupabase ? createClient(supabaseUrl, supabaseKey) : null;

// ----------------------------------------------------
// In-Memory Mock Data Store (Fallback)
// ----------------------------------------------------
class MockDatabase {
  private tables: TableRecord[] = [
    { id: 1, table_name: 'Table 1', capacity: 2, available: true, qr_token_hash: '90cabbd86a48b459fabbf69ce97667a96d1cee0080ad7989955f7955560c0af3', status: 'available' },
    { id: 2, table_name: 'Table 2', capacity: 2, available: true, qr_token_hash: 'bc9788185c2b5ba7e492aaf42af8385abbc34f154fd3c889b3594ca5e630623e', status: 'available' },
    { id: 3, table_name: 'Table 3', capacity: 4, available: true, qr_token_hash: '7ed6f91e3a3d8a3a7cc5f7a234ca718f995640ccb8a745dd4037abd73273743e', status: 'available' },
    { id: 4, table_name: 'Table 4', capacity: 4, available: true, qr_token_hash: 'cc8970a808f96feda05d1a8b4ef71da79ec3a74e0b1033f45394e8a652677695', status: 'available' },
    { id: 5, table_name: 'Table 5', capacity: 6, available: true, qr_token_hash: '73509df31f867d094ce720dd03bfc8715b9c61c5fcb2d709492a05e22f9e71d4', status: 'available' },
    { id: 6, table_name: 'Table 6', capacity: 8, available: true, qr_token_hash: '071569dd69f37db96d3ff8e90a649841ab8720ca1062469d4bbe810c65eb9647', status: 'available' },
  ];

  private reservations: ReservationRecord[] = [];
  private waitingList: WaitingListRecord[] = [];

  private systemSettings: SystemSettingRecord[] = [
    { key: 'gst_percentage', value: '18', description: 'GST Tax percentage applied to orders' },
    { key: 'service_charge', value: '150', description: 'Service charge value' },
    { key: 'service_charge_type', value: 'fixed', description: 'fixed, percentage, or disabled' },
    { key: 'cafe_name', value: 'Bon Appetite Cafe and Restro' },
    { key: 'upi_id', value: 'ranadwarkesh9-1@okicici', description: 'UPI address for receiving customer payments' }
  ];

  private menuItems: MenuItemRecord[] = [
    { name: 'Grand Espresso Macchiato', price: 450, available: true, preparation_time_minutes: 5, deleted: false },
    { name: 'Champagne Truffle Latte', price: 650, available: true, preparation_time_minutes: 7, deleted: false },
    { name: 'Rose Gold Affogato', price: 750, available: true, preparation_time_minutes: 8, deleted: false },
    { name: 'Cold Brew Reserve', price: 550, available: true, preparation_time_minutes: 5, deleted: false },
    { name: 'Truffle Tagliolini', price: 1850, available: true, preparation_time_minutes: 15, deleted: false },
    { name: 'Wild Mushroom Risotto', price: 1450, available: true, preparation_time_minutes: 15, deleted: false },
    { name: 'Wagyu Ribeye Steak (Mock Special)', price: 3850, available: true, preparation_time_minutes: 20, deleted: false },
    { name: 'Saffron Garlic Salmon', price: 2450, available: true, preparation_time_minutes: 18, deleted: false },
    { name: 'Golden Foil Cheesecake', price: 950, available: true, preparation_time_minutes: 6, deleted: false },
    { name: 'Pistachio Paris-Brest', price: 850, available: true, preparation_time_minutes: 6, deleted: false },
    { name: 'Lava Chocolate Souffle', price: 890, available: true, preparation_time_minutes: 12, deleted: false },
    { name: 'Madagascar Creme Brulee', price: 750, available: true, preparation_time_minutes: 8, deleted: false },
    { name: 'Saffron Mango Mocktail', price: 650, available: true, preparation_time_minutes: 6, deleted: false },
    { name: 'Lavender Honey Tonic', price: 590, available: true, preparation_time_minutes: 5, deleted: false },
    { name: 'Smoked Wood Old Fashioned', price: 750, available: true, preparation_time_minutes: 8, deleted: false },
    { name: 'Rosewater Berry Fizz', price: 690, available: true, preparation_time_minutes: 6, deleted: false }
  ].map((item, idx) => ({ ...item, id: idx + 1 }));

  private orders: OrderRecord[] = [];
  private orderItems: OrderItemRecord[] = [];
  private auditLogs: AuditLogRecord[] = [];
  private orderNumCounter = 1;
  private invoiceNumCounter = 1;

  // Table operations
  async getTables(): Promise<TableRecord[]> {
    return [...this.tables];
  }

  async updateTableAvailability(id: number, available: boolean): Promise<TableRecord> {
    const table = this.tables.find(t => t.id === id);
    if (!table) throw new Error(`Table ${id} not found`);
    table.available = available;
    return { ...table };
  }

  async updateTableStatus(id: number, status: TableRecord['status']): Promise<TableRecord> {
    const table = this.tables.find(t => t.id === id);
    if (!table) throw new Error(`Table ${id} not found`);
    table.status = status;
    return { ...table };
  }

  async updateTableQRHash(id: number, qrTokenHash: string): Promise<TableRecord> {
    const table = this.tables.find(t => t.id === id);
    if (!table) throw new Error(`Table ${id} not found`);
    table.qr_token_hash = qrTokenHash;
    return { ...table };
  }

  // Settings
  async getSettings(): Promise<SystemSettingRecord[]> {
    return [...this.systemSettings];
  }

  async updateSetting(key: string, value: string): Promise<SystemSettingRecord> {
    const s = this.systemSettings.find(set => set.key === key);
    if (!s) {
      const newS = { key, value };
      this.systemSettings.push(newS);
      return newS;
    }
    s.value = value;
    return { ...s };
  }

  // Menu items
  async getMenuItems(): Promise<MenuItemRecord[]> {
    return this.menuItems.filter(item => !item.deleted);
  }

  async addMenuItem(item: Omit<MenuItemRecord, 'id' | 'deleted'>): Promise<MenuItemRecord> {
    const newItem: MenuItemRecord = {
      ...item,
      id: this.menuItems.length + 1,
      deleted: false
    };
    this.menuItems.push(newItem);
    return { ...newItem };
  }

  async updateMenuItem(id: number, item: Partial<Omit<MenuItemRecord, 'id'>>): Promise<MenuItemRecord> {
    const idx = this.menuItems.findIndex(i => i.id === id);
    if (idx === -1) throw new Error(`Menu item ${id} not found`);
    this.menuItems[idx] = { ...this.menuItems[idx], ...item };
    return { ...this.menuItems[idx] };
  }

  async deleteMenuItem(id: number): Promise<boolean> {
    const idx = this.menuItems.findIndex(i => i.id === id);
    if (idx === -1) return false;
    this.menuItems[idx].deleted = true;
    return true;
  }

  // Reservations
  async getReservations(): Promise<ReservationRecord[]> {
    return [...this.reservations];
  }

  async addReservation(record: Omit<ReservationRecord, 'id' | 'created_at'>): Promise<ReservationRecord> {
    const newReservation: ReservationRecord = {
      ...record,
      id: 'BA-' + Math.floor(1000 + Math.random() * 9000),
      created_at: new Date().toISOString()
    };
    this.reservations.push(newReservation);
    return { ...newReservation };
  }

  async updateReservationStatus(
    id: string,
    status: ReservationRecord['status'],
    tableNumber?: string | null
  ): Promise<ReservationRecord> {
    const idx = this.reservations.findIndex(r => r.id === id);
    if (idx === -1) throw new Error(`Reservation ${id} not found`);
    this.reservations[idx].status = status;
    if (tableNumber !== undefined) {
      this.reservations[idx].table_number = tableNumber;
    }
    return { ...this.reservations[idx] };
  }

  async updateNotificationStatus(
    id: string,
    type: 'email' | 'whatsapp',
    status: 'pending' | 'sent' | 'failed'
  ): Promise<ReservationRecord> {
    const idx = this.reservations.findIndex(r => r.id === id);
    if (idx === -1) throw new Error(`Reservation ${id} not found`);
    if (type === 'email') {
      this.reservations[idx].email_status = status;
    } else {
      this.reservations[idx].whatsapp_status = status;
    }
    return { ...this.reservations[idx] };
  }

  // Waiting list
  async getWaitingList(): Promise<WaitingListRecord[]> {
    return [...this.waitingList];
  }

  async addWaitingList(record: Omit<WaitingListRecord, 'id' | 'created_at'>): Promise<WaitingListRecord> {
    const newEntry: WaitingListRecord = {
      ...record,
      id: 'WL-' + Math.floor(1000 + Math.random() * 9000),
      created_at: new Date().toISOString()
    };
    this.waitingList.push(newEntry);
    return { ...newEntry };
  }

  async deleteWaitingList(id: string): Promise<boolean> {
    const initialLen = this.waitingList.length;
    this.waitingList = this.waitingList.filter(w => w.id !== id);
    return this.waitingList.length < initialLen;
  }

  // Orders & Items
  async getOrders(): Promise<OrderRecord[]> {
    return [...this.orders];
  }

  async getOrderById(id: string): Promise<OrderRecord | null> {
    const order = this.orders.find(o => o.id === id);
    return order ? { ...order } : null;
  }

  async getOrderItems(orderId: string): Promise<OrderItemRecord[]> {
    return this.orderItems.filter(item => item.order_id === orderId);
  }

  async addOrder(
    order: Omit<OrderRecord, 'id' | 'order_number' | 'invoice_number' | 'created_at'>,
    items: Omit<OrderItemRecord, 'id' | 'order_id'>[]
  ): Promise<OrderRecord> {
    items.forEach(item => {
      if (item.quantity <= 0) {
        throw new Error('Quantity must be a positive integer');
      }
    });

    const uuid = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
    const orderNum = 'BON-' + String(this.orderNumCounter++).padStart(4, '0');
    
    const newOrder: OrderRecord = {
      ...order,
      id: uuid,
      order_number: orderNum,
      invoice_number: null,
      created_at: new Date().toISOString()
    };
    
    this.orders.push(newOrder);

    items.forEach(item => {
      const itemId = 'ITEM-' + Math.floor(10000 + Math.random() * 90000);
      this.orderItems.push({
        ...item,
        id: itemId,
        order_id: uuid
      });
    });

    return { ...newOrder };
  }

  async updateOrderStatus(id: string, status: OrderRecord['order_status']): Promise<OrderRecord> {
    const idx = this.orders.findIndex(o => o.id === id);
    if (idx === -1) throw new Error(`Order ${id} not found`);
    this.orders[idx].order_status = status;
    
    const now = new Date().toISOString();
    if (status === 'confirmed') this.orders[idx].confirmed_at = now;
    else if (status === 'preparing') this.orders[idx].preparing_at = now;
    else if (status === 'ready') this.orders[idx].ready_at = now;
    else if (status === 'served') {
      this.orders[idx].served_at = now;
      this.orders[idx].completed_at = now;
    } else if (status === 'cancelled') this.orders[idx].cancelled_at = now;

    return { ...this.orders[idx] };
  }

  async updateOrderPaymentStatus(
    id: string,
    paymentStatus: OrderRecord['payment_status'],
    extra?: { verified_by?: string; payment_reference?: string; upi_transaction_id?: string }
  ): Promise<OrderRecord> {
    const idx = this.orders.findIndex(o => o.id === id);
    if (idx === -1) throw new Error(`Order ${id} not found`);
    
    this.orders[idx].payment_status = paymentStatus;
    if (extra?.verified_by) this.orders[idx].verified_by = extra.verified_by;
    if (extra?.payment_reference) this.orders[idx].payment_reference = extra.payment_reference;
    if (extra?.upi_transaction_id) this.orders[idx].upi_transaction_id = extra.upi_transaction_id;

    if (paymentStatus === 'paid') {
      this.orders[idx].verification_time = new Date().toISOString();
      if (!this.orders[idx].invoice_number) {
        this.orders[idx].invoice_number = 'BON-INV-' + String(this.invoiceNumCounter++).padStart(6, '0');
      }
    }

    return { ...this.orders[idx] };
  }

  // Audit Logs
  async getAuditLogs(): Promise<AuditLogRecord[]> {
    return [...this.auditLogs];
  }

  async addAuditLog(log: AuditLogRecord): Promise<AuditLogRecord> {
    const newLog = {
      ...log,
      id: 'AUD-' + Math.floor(10000 + Math.random() * 90000),
      created_at: new Date().toISOString()
    };
    this.auditLogs.push(newLog);
    return newLog;
  }
}

const mockDB = new MockDatabase();

// ----------------------------------------------------
// Unified DB Wrapper Methods
// ----------------------------------------------------
export const db = {
  // Get all physical tables
  async getTables(): Promise<TableRecord[]> {
    if (supabase) {
      const { data, error } = await supabase.from('tables').select('*').order('id', { ascending: true });
      if (error) throw error;
      return data || [];
    }
    return mockDB.getTables();
  },

  // Toggle table availability
  async updateTableAvailability(id: number, available: boolean): Promise<TableRecord> {
    if (supabase) {
      const { data, error } = await supabase
        .from('tables')
        .update({ available })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    return mockDB.updateTableAvailability(id, available);
  },

  // Update physical table status
  async updateTableStatus(id: number, status: TableRecord['status']): Promise<TableRecord> {
    if (supabase) {
      const { data, error } = await supabase
        .from('tables')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    return mockDB.updateTableStatus(id, status);
  },

  // Update Table QR Hash
  async updateTableQRHash(id: number, qrTokenHash: string): Promise<TableRecord> {
    if (supabase) {
      const { data, error } = await supabase
        .from('tables')
        .update({ qr_token_hash: qrTokenHash })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    return mockDB.updateTableQRHash(id, qrTokenHash);
  },

  // Fetch settings
  async getSettings(): Promise<SystemSettingRecord[]> {
    if (supabase) {
      const { data, error } = await supabase.from('system_settings').select('*');
      if (error) throw error;
      return data || [];
    }
    return mockDB.getSettings();
  },

  // Update setting
  async updateSetting(key: string, value: string): Promise<SystemSettingRecord> {
    if (supabase) {
      const { data, error } = await supabase
        .from('system_settings')
        .upsert({ key, value })
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    return mockDB.updateSetting(key, value);
  },

  // Fetch Menu Items (Soft Delete Filters)
  async getMenuItems(): Promise<MenuItemRecord[]> {
    if (supabase) {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('deleted', false)
        .order('id', { ascending: true });
      if (error) throw error;
      return data || [];
    }
    return mockDB.getMenuItems();
  },

  // Add Menu item
  async addMenuItem(item: Omit<MenuItemRecord, 'id' | 'deleted'>): Promise<MenuItemRecord> {
    if (supabase) {
      const { data, error } = await supabase
        .from('menu_items')
        .insert([item])
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    return mockDB.addMenuItem(item);
  },

  // Update Menu item
  async updateMenuItem(id: number, item: Partial<Omit<MenuItemRecord, 'id'>>): Promise<MenuItemRecord> {
    if (supabase) {
      const { data, error } = await supabase
        .from('menu_items')
        .update(item)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    return mockDB.updateMenuItem(id, item);
  },

  // Soft delete menu item
  async deleteMenuItem(id: number): Promise<boolean> {
    if (supabase) {
      const { error } = await supabase
        .from('menu_items')
        .update({ deleted: true })
        .eq('id', id);
      if (error) throw error;
      return true;
    }
    return mockDB.deleteMenuItem(id);
  },

  // Fetch all reservations
  async getReservations(date?: string): Promise<ReservationRecord[]> {
    if (supabase) {
      let query = supabase.from('reservations').select('*').order('created_at', { ascending: false });
      if (date) {
        query = query.eq('reservation_date', date);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }
    const list = await mockDB.getReservations();
    if (date) {
      return list.filter(r => r.reservation_date === date);
    }
    return list;
  },

  // Create new reservation with concurrency control
  async createReservation(record: Omit<ReservationRecord, 'id' | 'created_at'>): Promise<ReservationRecord> {
    const release = await bookingMutex.acquire();
    try {
      if (supabase) {
        // First re-verify table availability to prevent race condition
        const activeReservations = await this.getReservations(record.reservation_date);
        const occupiedTables = new Set<string>();
        activeReservations.forEach(r => {
          if (r.status === 'confirmed' || r.status === 'pending') {
            if (r.table_number && r.reservation_time === record.reservation_time) {
              r.table_number.split(',').forEach(t => occupiedTables.add(t.trim()));
            }
          }
        });

        if (record.table_number) {
          const requested = record.table_number.split(',').map(t => t.trim());
          const isOverlapping = requested.some(t => occupiedTables.has(t));
          if (isOverlapping) {
            throw new Error('Double Booking Detected: One or more allocated tables were already reserved.');
          }
        }

        const { data, error } = await supabase
          .from('reservations')
          .insert([{
            customer_name: record.customer_name,
            phone: record.phone,
            email: record.email,
            reservation_date: record.reservation_date,
            reservation_time: record.reservation_time,
            guests: record.guests,
            table_number: record.table_number,
            status: record.status,
            verification_token: record.verification_token,
            email_status: record.email_status,
            whatsapp_status: record.whatsapp_status
          }])
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }

      // Check for mock DB table conflict
      const activeReservations = await mockDB.getReservations();
      const occupiedTables = new Set<string>();
      activeReservations.forEach(r => {
        if (r.status === 'confirmed' || r.status === 'pending') {
          if (r.table_number && r.reservation_date === record.reservation_date && r.reservation_time === record.reservation_time) {
            r.table_number.split(',').forEach(t => occupiedTables.add(t.trim()));
          }
        }
      });

      if (record.table_number) {
        const requested = record.table_number.split(',').map(t => t.trim());
        const isOverlapping = requested.some(t => occupiedTables.has(t));
        if (isOverlapping) {
          throw new Error('Double Booking Detected: One or more allocated tables were already reserved.');
        }
      }

      return await mockDB.addReservation(record);
    } finally {
      release();
    }
  },

  // Update reservation status
  async updateReservationStatus(
    id: string,
    status: ReservationRecord['status'],
    tableNumber?: string | null
  ): Promise<ReservationRecord> {
    if (supabase) {
      const updatePayload: any = { status };
      if (tableNumber !== undefined) {
        updatePayload.table_number = tableNumber;
      }
      const { data, error } = await supabase
        .from('reservations')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    return mockDB.updateReservationStatus(id, status, tableNumber);
  },

  // Update Notification dispatch status
  async updateNotificationStatus(
    id: string,
    type: 'email' | 'whatsapp',
    status: 'pending' | 'sent' | 'failed'
  ): Promise<ReservationRecord> {
    if (supabase) {
      const updatePayload = type === 'email' ? { email_status: status } : { whatsapp_status: status };
      const { data, error } = await supabase
        .from('reservations')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    return mockDB.updateNotificationStatus(id, type, status);
  },

  // Fetch waiting list
  async getWaitingList(date?: string): Promise<WaitingListRecord[]> {
    if (supabase) {
      let query = supabase.from('waiting_list').select('*').order('created_at', { ascending: true });
      if (date) {
        query = query.eq('date', date);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }
    const list = await mockDB.getWaitingList();
    if (date) {
      return list.filter(w => w.date === date);
    }
    return list;
  },

  // Add to waiting list
  async createWaitingList(record: Omit<WaitingListRecord, 'id' | 'created_at'>): Promise<WaitingListRecord> {
    if (supabase) {
      const { data, error } = await supabase
        .from('waiting_list')
        .insert([record])
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    return mockDB.addWaitingList(record);
  },

  // Delete from waiting list
  async deleteWaitingList(id: string): Promise<boolean> {
    if (supabase) {
      const { error } = await supabase.from('waiting_list').delete().eq('id', id);
      if (error) throw error;
      return true;
    }
    return mockDB.deleteWaitingList(id);
  },

  // Fetch orders
  async getOrders(): Promise<OrderRecord[]> {
    if (supabase) {
      const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
    return mockDB.getOrders();
  },

  // Fetch single order
  async getOrderById(id: string): Promise<OrderRecord | null> {
    if (supabase) {
      const { data, error } = await supabase.from('orders').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data;
    }
    return mockDB.getOrderById(id);
  },

  // Fetch order items
  async getOrderItems(orderId: string): Promise<OrderItemRecord[]> {
    if (supabase) {
      const { data, error } = await supabase.from('order_items').select('*').eq('order_id', orderId);
      if (error) throw error;
      return data || [];
    }
    return mockDB.getOrderItems(orderId);
  },

  // Place order with concurrency session constraints
  async createOrder(
    order: Omit<OrderRecord, 'id' | 'order_number' | 'invoice_number' | 'created_at'>,
    items: Omit<OrderItemRecord, 'id' | 'order_id'>[]
  ): Promise<OrderRecord> {
    const release = await orderMutex.acquire();
    try {
      if (supabase) {
        // Create order record
        const { data: newOrder, error: orderErr } = await supabase
          .from('orders')
          .insert([order])
          .select()
          .single();

        if (orderErr) throw orderErr;

        // Create order items
        const itemPayloads = items.map(item => ({
          ...item,
          order_id: newOrder.id
        }));

        const { error: itemsErr } = await supabase.from('order_items').insert(itemPayloads);
        if (itemsErr) throw itemsErr;

        return newOrder;
      }
      return await mockDB.addOrder(order, items);
    } finally {
      release();
    }
  },

  // Update order status
  async updateOrderStatus(id: string, status: OrderRecord['order_status']): Promise<OrderRecord> {
    if (supabase) {
      const updatePayload: any = { order_status: status };
      const now = new Date().toISOString();
      if (status === 'confirmed') updatePayload.confirmed_at = now;
      else if (status === 'preparing') updatePayload.preparing_at = now;
      else if (status === 'ready') updatePayload.ready_at = now;
      else if (status === 'served') {
        updatePayload.served_at = now;
        updatePayload.completed_at = now;
      } else if (status === 'cancelled') updatePayload.cancelled_at = now;

      const { data, error } = await supabase
        .from('orders')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    return mockDB.updateOrderStatus(id, status);
  },

  // Update payment status (generate invoice number when set to 'paid')
  async updateOrderPaymentStatus(
    id: string,
    paymentStatus: OrderRecord['payment_status'],
    extra?: { verified_by?: string; payment_reference?: string; upi_transaction_id?: string }
  ): Promise<OrderRecord> {
    if (supabase) {
      const updatePayload: any = { payment_status: paymentStatus };
      if (extra?.verified_by) updatePayload.verified_by = extra.verified_by;
      if (extra?.payment_reference) updatePayload.payment_reference = extra.payment_reference;
      if (extra?.upi_transaction_id) updatePayload.upi_transaction_id = extra.upi_transaction_id;

      if (paymentStatus === 'paid') {
        updatePayload.verification_time = new Date().toISOString();
        
        // Generate sequential invoice number in transaction-safe method:
        const { data: invoiceNumData, error: seqErr } = await supabase.rpc('get_next_invoice_number');
        if (!seqErr && invoiceNumData) {
          updatePayload.invoice_number = invoiceNumData;
        } else {
          // Fallback to random invoice number if function not registered
          updatePayload.invoice_number = 'BON-INV-' + Math.floor(100000 + Math.random() * 900000);
        }
      }

      const { data, error } = await supabase
        .from('orders')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    return mockDB.updateOrderPaymentStatus(id, paymentStatus, extra);
  },

  // Save audit logs
  async createAuditLog(log: AuditLogRecord): Promise<AuditLogRecord> {
    if (supabase) {
      const { data, error } = await supabase.from('audit_logs').insert([log]).select().single();
      if (error) throw error;
      return data;
    }
    return mockDB.addAuditLog(log);
  }
};
