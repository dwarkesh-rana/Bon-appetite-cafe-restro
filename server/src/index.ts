import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { db, isUsingSupabase, TableRecord, ReservationRecord } from './db';
import { allocateTable } from './allocator';
import { sendConfirmationEmail } from './email';
import { sendConfirmationWhatsApp } from './whatsapp';
import { logger } from './logger';
import { hashPassword, verifyPassword, generateToken, authenticateAdmin, AuthenticatedRequest } from './auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors());
app.use(express.json());

// Logger middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, { ip: req.ip });
  next();
});

// Admin credentials - Hashed dynamically at startup
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@bonappetite.com';
const ADMIN_PASSWORD_RAW = process.env.ADMIN_PASSWORD || 'luxuryrestro2026';
const ADMIN_PASSWORD_HASH = hashPassword(ADMIN_PASSWORD_RAW);
const JWT_SECRET = process.env.JWT_SECRET || 'bonappetite_jwt_super_secret_key_2026';

// ----------------------------------------------------
// Security & Rate Limiting
// ----------------------------------------------------
const ipRequestCounts = new Map<string, { count: number; resetTime: number }>();
function rateLimiter(limit: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    
    const record = ipRequestCounts.get(ip);
    if (!record || now > record.resetTime) {
      ipRequestCounts.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    record.count++;
    if (record.count > limit) {
      logger.warn(`[Security] Rate limit exceeded by IP: ${ip}`);
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    next();
  };
}

// ----------------------------------------------------
// Time Slot & Date Helpers
// ----------------------------------------------------
const ALLOWED_SLOTS = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM',
  '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM',
  '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM', '08:00 PM', '08:30 PM',
  '09:00 PM', '09:30 PM', '10:00 PM'
];

function isSlotInFuture(dateStr: string, slotStr: string): boolean {
  const today = new Date();
  const bookingDate = new Date(dateStr);
  
  if (bookingDate.toDateString() !== today.toDateString()) {
    // If the booking is in the future, check if it's after today
    const normalizedToday = new Date();
    normalizedToday.setHours(0,0,0,0);
    const normalizedBooking = new Date(bookingDate);
    normalizedBooking.setHours(0,0,0,0);
    return normalizedBooking >= normalizedToday;
  }
  
  // Same day: Parse slot time (e.g., "06:30 PM")
  const match = slotStr.match(/^(\d{2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return false;
  
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const ampm = match[3].toUpperCase();
  
  if (ampm === 'PM' && hours !== 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  
  const slotTime = new Date();
  slotTime.setHours(hours, minutes, 0, 0);
  
  // Require booking to be at least 1 hour in the future
  const minLeadTime = new Date();
  minLeadTime.setHours(today.getHours() + 1);
  
  return slotTime > minLeadTime;
}

function canCancelReservation(dateStr: string, slotStr: string): boolean {
  const today = new Date();
  const bookingDate = new Date(dateStr);
  
  const match = slotStr.match(/^(\d{2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return false;
  
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const ampm = match[3].toUpperCase();
  
  if (ampm === 'PM' && hours !== 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  
  const reservationTime = new Date(bookingDate);
  reservationTime.setHours(hours, minutes, 0, 0);
  
  const timeDiffMs = reservationTime.getTime() - today.getTime();
  const hoursDiff = timeDiffMs / (1000 * 60 * 60);
  
  return hoursDiff >= 2; // minimum 2 hours lead time
}

function generateVerificationToken(reservationId: string): string {
  return crypto.createHmac('sha256', JWT_SECRET).update(reservationId).digest('hex').substring(0, 16);
}

function sanitizeInput(str: any): string {
  if (typeof str !== 'string') return '';
  return str.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();
}


// ----------------------------------------------------
// PUBLIC API: Slots & Bookings
// ----------------------------------------------------

// Fetch slots availability status
app.get('/api/slots', async (req: Request, res: Response) => {
  try {
    const date = req.query.date as string;
    if (!date) return res.status(400).json({ error: 'Date query parameter is required.' });

    const allReservations = await db.getReservations(date);
    const activeReservations = allReservations.filter(r => r.status === 'confirmed' || r.status === 'pending');
    
    const tables = await db.getTables();
    const activeTables = tables.filter(t => t.available);
    const totalCapacity = activeTables.reduce((sum, t) => sum + t.capacity, 0);

    const slotStates = ALLOWED_SLOTS.map(slot => {
      // Calculate occupied tables in this slot
      const occupiedTables = new Set<string>();
      let occupiedCapacity = 0;
      
      activeReservations.forEach(r => {
        if (r.reservation_time === slot && r.table_number) {
          r.table_number.split(',').forEach(t => occupiedTables.add(t.trim()));
        }
      });

      activeTables.forEach(t => {
        if (occupiedTables.has(t.table_name)) {
          occupiedCapacity += t.capacity;
        }
      });

      const isFuture = isSlotInFuture(date, slot);

      return {
        slot,
        isAvailable: isFuture && (occupiedTables.size < activeTables.length),
        capacityLeft: totalCapacity - occupiedCapacity,
        occupiedCount: occupiedTables.size
      };
    });

    return res.status(200).json({ success: true, date, slots: slotStates });
  } catch (error: any) {
    logger.error('[API] Error fetching slots availability:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Submit a Booking Attempt (rate limited to 10 attempts per minute)
app.post('/api/reservations', rateLimiter(10, 60000), async (req: Request, res: Response) => {
  try {
    const { customer_name, phone, email, reservation_date, reservation_time, guests } = req.body;

    if (!customer_name || !phone || !email || !reservation_date || !reservation_time || !guests) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    // Sanitize inputs
    const cleanName = sanitizeInput(customer_name);
    const cleanPhone = sanitizeInput(phone);
    const cleanEmail = sanitizeInput(email).toLowerCase();

    // Input Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ error: 'Invalid email address format.' });
    }

    if (cleanPhone.replace(/\D/g, '').length < 8) {
      return res.status(400).json({ error: 'Invalid contact phone number.' });
    }

    const guestCount = parseInt(guests);
    if (isNaN(guestCount) || guestCount <= 0 || guestCount > 20) {
      return res.status(400).json({ error: 'Guests must be a positive number up to 20.' });
    }

    // Slot Verification
    if (!ALLOWED_SLOTS.includes(reservation_time)) {
      return res.status(400).json({ error: 'Selected time slot is outside operating slots.' });
    }

    // Date/Time validation
    if (!isSlotInFuture(reservation_date, reservation_time)) {
      return res.status(400).json({ error: 'Cannot book past dates or same-day slots with less than 1 hour notice.' });
    }

    // Run table allocation algorithm
    logger.info(`[Allocation] Evaluating table allocation for ${cleanName} (${guestCount} guests) on ${reservation_date} @ ${reservation_time}`);
    const allocation = await allocateTable(reservation_date, reservation_time, guestCount);

    if (!allocation.success) {
      return res.status(200).json({
        success: false,
        code: 'NO_TABLES',
        message: 'No tables available for your party size. Join waiting list?',
      });
    }

    // Generate Verification Token
    const mockIdForToken = 'BA-' + Math.floor(1000 + Math.random() * 9000);
    const verificationToken = generateVerificationToken(mockIdForToken);

    // Save reservation with status = 'confirmed'
    const newReservation = await db.createReservation({
      customer_name: cleanName,
      phone: cleanPhone,
      email: cleanEmail,
      reservation_date,
      reservation_time,
      guests: guestCount,
      table_number: allocation.tableNumber,
      status: 'confirmed',
      verification_token: verificationToken,
      email_status: 'pending',
      whatsapp_status: 'pending'
    });

    // Send notifications (Email & WhatsApp)
    dispatchNotifications(newReservation);

    return res.status(201).json({
      success: true,
      reservation: newReservation,
    });
  } catch (error: any) {
    logger.error('[API] Error placing reservation:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// Join Waiting List
app.post('/api/waiting-list', rateLimiter(15, 60000), async (req: Request, res: Response) => {
  try {
    const { name, phone, email, date, time, guests } = req.body;

    if (!name || !phone || !email || !date || !time || !guests) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    // Sanitize inputs
    const cleanName = sanitizeInput(name);
    const cleanPhone = sanitizeInput(phone);
    const cleanEmail = sanitizeInput(email).toLowerCase();

    // Validate Input
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ error: 'Invalid email address format.' });
    }

    const newWaitingEntry = await db.createWaitingList({
      name: cleanName,
      phone: cleanPhone,
      email: cleanEmail,
      date,
      time,
      guests: parseInt(guests),
    });

    logger.info(`[Waiting List] Added: ${cleanName} for ${guests} guests on ${date} @ ${time}`);

    return res.status(201).json({
      success: true,
      entry: newWaitingEntry,
    });
  } catch (error: any) {
    logger.error('[API] Error adding to waiting list:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// Customer Booking History
app.get('/api/reservations/history', async (req: Request, res: Response) => {
  try {
    const email = req.query.email as string;
    if (!email) {
      return res.status(400).json({ error: 'Email parameter is required.' });
    }

    const cleanEmail = sanitizeInput(email).toLowerCase();

    const allReservations = await db.getReservations();
    const customerHistory = allReservations.filter(
      r => r.email.trim().toLowerCase() === cleanEmail
    );

    return res.status(200).json({
      success: true,
      history: customerHistory,
    });
  } catch (error: any) {
    logger.error('[API] Error loading history:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Cancel Reservation (with 2 hour cancellation rule)
app.post('/api/reservations/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const allRes = await db.getReservations();
    const reservation = allRes.find(r => r.id === id);

    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found.' });
    }

    if (reservation.status === 'cancelled') {
      return res.status(400).json({ error: 'Reservation is already cancelled.' });
    }

    // Check cancellation deadline (2 hours minimum before slot)
    if (!canCancelReservation(reservation.reservation_date, reservation.reservation_time)) {
      return res.status(400).json({ error: 'Cannot cancel reservation less than 2 hours before the time slot.' });
    }

    const updated = await db.updateReservationStatus(id, 'cancelled', null);
    logger.info(`❌ [API] Cancelled reservation ID: ${id}`);

    // Auto-promote waiting list if a table is freed
    autoPromoteWaitingList(updated.reservation_date, updated.reservation_time);

    return res.status(200).json({
      success: true,
      reservation: updated,
    });
  } catch (error: any) {
    logger.error('[API] Error cancelling reservation:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Verify QR Reservation Tickets
app.get('/api/reservations/verify/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const token = req.query.token as string;

    const allRes = await db.getReservations();
    const reservation = allRes.find(r => r.id === id);

    if (!reservation) {
      return res.status(404).json({ valid: false, message: 'Reservation not found.' });
    }

    const expectedToken = generateVerificationToken(id);
    if (token !== expectedToken && reservation.verification_token !== token) {
      return res.status(400).json({ valid: false, message: 'Invalid verification token.' });
    }

    if (reservation.status === 'cancelled') {
      return res.status(200).json({ valid: false, status: 'cancelled', message: 'Reservation has been cancelled.' });
    }

    if (reservation.status === 'completed') {
      return res.status(200).json({ valid: false, status: 'completed', message: 'Reservation is already completed.' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (reservation.reservation_date < todayStr) {
      return res.status(200).json({ valid: false, status: 'expired', message: 'Reservation date is in the past.' });
    }

    return res.status(200).json({
      valid: true,
      status: reservation.status,
      message: 'Valid Reservation Ticket.',
      reservation
    });
  } catch (error: any) {
    logger.error('[API] Error verifying reservation token:', error);
    return res.status(500).json({ error: error.message });
  }
});


// ----------------------------------------------------
// ADMIN API: Management & Control (JWT Protected)
// ----------------------------------------------------

// 1. Admin Login Endpoint (Hashed validation)
app.post('/api/admin/login', rateLimiter(5, 60000), async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (email === ADMIN_EMAIL && verifyPassword(password, ADMIN_PASSWORD_HASH)) {
    const token = generateToken(ADMIN_EMAIL, 'admin');
    logger.info(`[Auth] Admin logged in: ${email}`);
    return res.status(200).json({
      success: true,
      token: token,
      user: { email: ADMIN_EMAIL, role: 'admin' },
    });
  }

  logger.warn(`[Auth] Failed login attempt for: ${email}`);
  return res.status(401).json({ error: 'Invalid email address or access password.' });
});

// 2. Fetch Dashboard reservations list (Protected)
app.get('/api/admin/reservations', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const date = req.query.date as string;
    const list = await db.getReservations(date);
    return res.status(200).json({ success: true, reservations: list });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 3. Fetch Waiting List (Protected)
app.get('/api/admin/waiting-list', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const list = await db.getWaitingList();
    return res.status(200).json({ success: true, waitingList: list });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 4. Fetch Table States (Protected)
app.get('/api/admin/tables', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const list = await db.getTables();
    return res.status(200).json({ success: true, tables: list });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 5. Toggle Table Active Status (Protected)
app.put('/api/admin/tables/:id/toggle', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { available } = req.body;

    const updated = await db.updateTableAvailability(id, available);
    logger.info(`🔧 [Admin] Changed Table ${id} availability to: ${available} by ${req.user?.email}`);
    return res.status(200).json({ success: true, table: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 6. Action: Update Reservation Status (Protected)
app.post('/api/admin/reservations/:id/status', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, table_number } = req.body;

    const updated = await db.updateReservationStatus(id, status, table_number);
    logger.info(`🔧 [Admin] Updated Reservation ${id} to status: ${status} with Table: ${table_number} by ${req.user?.email}`);

    // If marked confirmed, dispatch notifications
    if (status === 'confirmed') {
      dispatchNotifications(updated);
    }

    // Auto promote waiting list if marked completed or cancelled
    if (status === 'completed' || status === 'cancelled') {
      autoPromoteWaitingList(updated.reservation_date, updated.reservation_time);
    }

    return res.status(200).json({ success: true, reservation: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 7. Delete Waiting list entry (Protected)
app.delete('/api/admin/waiting-list/:id', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    await db.deleteWaitingList(id);
    logger.info(`🔧 [Admin] Deleted waiting list entry ${id} by ${req.user?.email}`);
    return res.status(200).json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});


// ----------------------------------------------------
// Notification Dispatcher & Background Workers
// ----------------------------------------------------
async function dispatchNotifications(resRecord: ReservationRecord) {
  // 1. Email Dispatch
  try {
    const emailSuccess = await sendConfirmationEmail({
      customerName: resRecord.customer_name,
      email: resRecord.email,
      reservationId: resRecord.id,
      date: resRecord.reservation_date,
      time: resRecord.reservation_time,
      guests: resRecord.guests,
      tableNumber: resRecord.table_number,
    });
    await db.updateNotificationStatus(resRecord.id, 'email', emailSuccess ? 'sent' : 'failed');
  } catch (emailErr) {
    logger.error(`[Email] Dispatch error for reservation ${resRecord.id}:`, emailErr);
    await db.updateNotificationStatus(resRecord.id, 'email', 'failed');
  }

  // 2. WhatsApp Dispatch
  try {
    const waSuccess = await sendConfirmationWhatsApp({
      customerName: resRecord.customer_name,
      phone: resRecord.phone,
      reservationId: resRecord.id,
      date: resRecord.reservation_date,
      time: resRecord.reservation_time,
      guests: resRecord.guests,
      tableNumber: resRecord.table_number,
    });
    await db.updateNotificationStatus(resRecord.id, 'whatsapp', waSuccess ? 'sent' : 'failed');
  } catch (waErr) {
    logger.error(`[WhatsApp] Dispatch error for reservation ${resRecord.id}:`, waErr);
    await db.updateNotificationStatus(resRecord.id, 'whatsapp', 'failed');
  }
}

// Background Retry Worker (Runs every 60 seconds)
async function retryFailedNotifications() {
  try {
    const reservations = await db.getReservations();
    const failedEmails = reservations.filter(r => r.email_status === 'failed' && (r.status === 'confirmed' || r.status === 'pending'));
    const failedWhatsApps = reservations.filter(r => r.whatsapp_status === 'failed' && (r.status === 'confirmed' || r.status === 'pending'));

    for (const r of failedEmails) {
      logger.info(`[Retry] Retrying failed confirmation email for reservation ID: ${r.id}`);
      const success = await sendConfirmationEmail({
        customerName: r.customer_name,
        email: r.email,
        reservationId: r.id,
        date: r.reservation_date,
        time: r.reservation_time,
        guests: r.guests,
        tableNumber: r.table_number
      });
      if (success) {
        await db.updateNotificationStatus(r.id, 'email', 'sent');
      }
    }

    for (const r of failedWhatsApps) {
      logger.info(`[Retry] Retrying failed confirmation WhatsApp for reservation ID: ${r.id}`);
      const success = await sendConfirmationWhatsApp({
        customerName: r.customer_name,
        phone: r.phone,
        reservationId: r.id,
        date: r.reservation_date,
        time: r.reservation_time,
        guests: r.guests,
        tableNumber: r.table_number
      });
      if (success) {
        await db.updateNotificationStatus(r.id, 'whatsapp', 'sent');
      }
    }
  } catch (err) {
    logger.error('[Worker] Error in notification retry worker:', err);
  }
}
setInterval(retryFailedNotifications, 60000);

// Waiting List Automatic Promotion Logic
async function autoPromoteWaitingList(date: string, time: string) {
  try {
    logger.info(`[Waiting List] Evaluation triggered for slot: ${date} @ ${time}`);
    const waitingList = await db.getWaitingList();
    
    // Filter waitlist entries for this date & slot, sorted by created_at (FIFO queue)
    const slotWaiting = waitingList
      .filter(w => w.date === date && w.time === time)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    if (slotWaiting.length === 0) return;

    for (const entry of slotWaiting) {
      const allocation = await allocateTable(date, time, entry.guests);
      if (allocation.success && allocation.tableNumber) {
        // Table available! Promote waitlist entry to active reservation
        logger.info(`[Waiting List] Promoting customer ${entry.name} from waitlist to table ${allocation.tableNumber}`);
        
        const token = generateVerificationToken(entry.id);
        const newReservation = await db.createReservation({
          customer_name: entry.name,
          phone: entry.phone,
          email: entry.email,
          reservation_date: date,
          reservation_time: time,
          guests: entry.guests,
          table_number: allocation.tableNumber,
          status: 'confirmed',
          verification_token: token,
          email_status: 'pending',
          whatsapp_status: 'pending'
        });

        // Delete from waiting list
        await db.deleteWaitingList(entry.id);

        // Send notifications
        dispatchNotifications(newReservation);
        
        // Break out after promoting the first matching waitlist entry to prevent over-allocation in this run
        break;
      }
    }
  } catch (err) {
    logger.error('[Waiting List] Error in auto-promotion execution:', err);
  }
}


// ----------------------------------------------------
// Dine-In Ordering System Endpoints
// ----------------------------------------------------

// 0.5. Get Menu Items (Public / Guest)
app.get('/api/menu', async (req: Request, res: Response) => {
  try {
    const items = await db.getMenuItems();
    return res.status(200).json({ items });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 1. Submit Dine-In Order (Public / Guest - rate limited)
app.post('/api/orders', rateLimiter(10, 60000), async (req: Request, res: Response) => {
  try {
    const { customer_name, phone, table_number, token, items, upi_transaction_id } = req.body;

    if (!customer_name || !table_number || !token || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Missing required parameters: customer_name, table_number, token, and items.' });
    }

    // Hash parameter token to match against DB Table qr_token_hash
    const hashedParamToken = crypto.createHash('sha256').update(String(token).trim()).digest('hex');

    // Retrieve tables and verify table token
    const tables = await db.getTables();
    const tableIdStr = String(table_number).replace(/[^\d]/g, '');
    const tableId = parseInt(tableIdStr);
    const table = tables.find(t => t.id === tableId || t.table_name.toLowerCase() === String(table_number).trim().toLowerCase());

    if (!table) {
      return res.status(404).json({ error: `Table "${table_number}" does not exist in our configuration.` });
    }

    if (table.qr_token_hash !== hashedParamToken) {
      return res.status(403).json({ error: 'Table QR security verification failed. Unauthorized order attempt.' });
    }

    // Prevent duplicate checkout sessions (another active checkout on same table)
    const existingOrders = await db.getOrders();
    const activeTableCheckout = existingOrders.find(o => 
      o.table_number === table.table_name && 
      ['pending_payment', 'pending_verification'].includes(o.payment_status) &&
      o.order_status !== 'cancelled'
    );
    if (activeTableCheckout) {
      return res.status(400).json({ error: 'An active order/payment verification session is already in progress for this table.' });
    }

    // Retrieve system settings and calculate totals authoritatively
    const settings = await db.getSettings();
    const getSetting = (key: string, defVal: string) => settings.find(s => s.key === key)?.value || defVal;
    
    const gstPct = parseFloat(getSetting('gst_percentage', '18'));
    const serviceChargeVal = parseFloat(getSetting('service_charge', '150'));
    const serviceChargeType = getSetting('service_charge_type', 'fixed');

    const menuItems = await db.getMenuItems();
    let subtotal = 0;
    let maxPrepTime = 0;
    const itemsPayload: any[] = [];

    for (const item of items) {
      const menuItem = menuItems.find(m => m.name.toLowerCase() === String(item.food_item).trim().toLowerCase() && !m.deleted);
      if (!menuItem) {
        return res.status(400).json({ error: `Menu item "${item.food_item}" is currently unavailable.` });
      }
      if (!menuItem.available) {
        return res.status(400).json({ error: `Menu item "${item.food_item}" is out of stock.` });
      }

      const qty = parseInt(item.quantity);
      if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({ error: `Invalid quantity specified for item "${item.food_item}".` });
      }

      subtotal += menuItem.price * qty;
      if (menuItem.preparation_time_minutes > maxPrepTime) {
        maxPrepTime = menuItem.preparation_time_minutes;
      }

      itemsPayload.push({
        food_item: menuItem.name,
        quantity: qty,
        price: menuItem.price,
        special_instruction: item.special_instruction ? String(item.special_instruction).trim().slice(0, 500) : null
      });
    }

    const taxAmount = Math.round(subtotal * (gstPct / 100));
    let serviceCharge = 0;
    if (serviceChargeType === 'fixed') {
      serviceCharge = serviceChargeVal;
    } else if (serviceChargeType === 'percentage') {
      serviceCharge = Math.round(subtotal * (serviceChargeVal / 100));
    }

    const finalAmount = subtotal + taxAmount + serviceCharge;

    // Check if table currently holds an active reservation to associate order
    const reservations = await db.getReservations();
    const todayStr = new Date().toISOString().split('T')[0];
    const activeRes = reservations.find(r => 
      r.reservation_date === todayStr &&
      (r.status === 'confirmed' || r.status === 'pending') &&
      r.table_number && r.table_number.split(',').map(t => t.trim()).includes(table.table_name)
    );

    // Generate Session Tokens
    const rawSessionToken = crypto.randomBytes(32).toString('hex');
    const sessionTokenHash = crypto.createHash('sha256').update(rawSessionToken).digest('hex');

    const paymentExpiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString(); // 20 min expiry

    const newOrder = await db.createOrder(
      {
        customer_name: String(customer_name).trim().slice(0, 100),
        phone: phone ? String(phone).trim().slice(0, 30) : null,
        table_number: table.table_name,
        reservation_id: activeRes ? activeRes.id : null,
        subtotal,
        tax_amount: taxAmount,
        service_charge: serviceCharge,
        final_amount: finalAmount,
        payment_status: upi_transaction_id ? 'pending_verification' : 'pending_payment',
        order_status: 'pending',
        upi_transaction_id: upi_transaction_id ? String(upi_transaction_id).trim().slice(0, 100) : null,
        estimated_ready_time: maxPrepTime,
        order_session_token_hash: sessionTokenHash,
        payment_expires_at: paymentExpiresAt,
        verification_time: null,
        verified_by: null,
        payment_reference: null,
        confirmed_at: null,
        preparing_at: null,
        ready_at: null,
        served_at: null,
        completed_at: null,
        cancelled_at: null
      },
      itemsPayload
    );

    logger.info(`🛎️ [Order] Placed new order ${newOrder.order_number} for table ${table.table_name}. Final amount: ₹${finalAmount}`);
    
    return res.status(201).json({
      success: true,
      order: newOrder,
      raw_session_token: rawSessionToken
    });
  } catch (error: any) {
    logger.error('[Order] Create order error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Helper validation for customer sessions
async function getValidatedOrder(orderId: string, sessionToken: string): Promise<any> {
  const order = await db.getOrderById(orderId);
  if (!order) return null;

  const inputHash = crypto.createHash('sha256').update(String(sessionToken).trim()).digest('hex');
  if (order.order_session_token_hash !== inputHash) {
    throw new Error('Unauthorized session token.');
  }
  return order;
}

// 2. Track Order Details (Public / Guest with Session)
app.get('/api/orders/track/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const sessionToken = req.query.token as string;

    if (!sessionToken) {
      return res.status(400).json({ error: 'Session token required.' });
    }

    const order = await getValidatedOrder(id, sessionToken);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const items = await db.getOrderItems(id);
    return res.status(200).json({ order, items });
  } catch (error: any) {
    if (error.message === 'Unauthorized session token.') {
      return res.status(403).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message });
  }
});

// 3. Customer Cancel Order before prep starts (Public / Guest with Session - rate limited)
app.post('/api/orders/:id/cancel', rateLimiter(5, 60000), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Session token required.' });
    }

    const order = await getValidatedOrder(id, token);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    // Order can only be cancelled if still pending or confirmed. Once preparing, it's locked.
    if (!['pending', 'confirmed'].includes(order.order_status)) {
      return res.status(400).json({ error: `Cannot cancel order in status: "${order.order_status}". Food preparation already started.` });
    }

    const updated = await db.updateOrderStatus(id, 'cancelled');
    await db.createAuditLog({
      actor: 'Guest (' + order.customer_name + ')',
      action: 'cancel_order',
      details: `Cancelled order ${order.order_number} by customer`,
      ip_address: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null,
      user_agent: req.headers['user-agent'] || null
    });

    logger.info(`🚫 [Order] Order ${order.order_number} cancelled by customer.`);
    return res.status(200).json({ success: true, order: updated });
  } catch (error: any) {
    if (error.message === 'Unauthorized session token.') {
      return res.status(403).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message });
  }
});

// 4. Customer Invoice View (Public / Guest with Session)
app.get('/api/orders/invoice/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const sessionToken = req.query.token as string;

    if (!sessionToken) {
      return res.status(400).json({ error: 'Session token required.' });
    }

    const order = await getValidatedOrder(id, sessionToken);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    // Invoices should only be viewed if paid
    if (order.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Invoice is only accessible after payment has been verified.' });
    }

    const items = await db.getOrderItems(id);
    return res.status(200).json({ order, items });
  } catch (error: any) {
    if (error.message === 'Unauthorized session token.') {
      return res.status(403).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message });
  }
});

// 4.5. Customer UPI payment Submission (Public / Guest with Session - rate limited)
app.post('/api/orders/:id/pay', rateLimiter(5, 60000), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { token, upi_transaction_id } = req.body;

    if (!token || !upi_transaction_id) {
      return res.status(400).json({ error: 'Session token and UPI Transaction ID are required.' });
    }

    const order = await getValidatedOrder(id, token);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    // Ensure we do not overwrite a previously verified or expired order
    if (order.payment_status === 'paid' || order.payment_status === 'expired') {
      return res.status(400).json({ error: `Cannot submit payment for order with payment status: ${order.payment_status}` });
    }

    // Block duplicate transaction IDs across all orders to prevent double submissions
    const allOrders = await db.getOrders();
    const isDuplicateTx = allOrders.some(o => o.id !== id && o.upi_transaction_id === String(upi_transaction_id).trim());
    if (isDuplicateTx) {
      return res.status(400).json({ error: 'This UPI transaction ID has already been submitted for verification.' });
    }

    const updated = await db.updateOrderPaymentStatus(id, 'pending_verification', {
      upi_transaction_id: String(upi_transaction_id).trim()
    });

    await db.createAuditLog({
      actor: 'Guest (' + order.customer_name + ')',
      action: 'submit_payment_id',
      details: `Submitted transaction ID ${upi_transaction_id} for Order ${order.order_number}`,
      ip_address: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null,
      user_agent: req.headers['user-agent'] || null
    });

    logger.info(`💳 [Order] Submitted transaction ID ${upi_transaction_id} for order ${order.order_number}`);
    return res.status(200).json({ success: true, order: updated });
  } catch (error: any) {
    if (error.message === 'Unauthorized session token.') {
      return res.status(403).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message });
  }
});

// 5. Fetch Active Orders Queue (Admin / Staff Role Protected)
app.get('/api/admin/orders', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orders = await db.getOrders();
    // Return all orders (can be filtered by status on front-end)
    return res.status(200).json({ orders });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 6. Admin Payment Verification & Invoice Generation (Admin / Manager Role Protected)
app.post('/api/admin/orders/:id/verify-payment', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, payment_reference } = req.body; // status: 'paid' | 'failed'

    if (!['paid', 'failed'].includes(status)) {
      return res.status(400).json({ error: 'Status must be paid or failed.' });
    }

    // Role protection - Kitchen cannot access payment
    if (req.user?.role === 'kitchen') {
      return res.status(403).json({ error: 'Kitchen staff do not have permissions to verify payments.' });
    }

    const order = await db.getOrderById(id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const updated = await db.updateOrderPaymentStatus(id, status, {
      verified_by: req.user?.email || 'Admin',
      payment_reference: payment_reference || null
    });

    // Auto status transitions:
    if (status === 'paid') {
      await db.updateOrderStatus(id, 'confirmed');
      // Table occupancy update
      const tableIdStr = order.table_number.replace(/[^\d]/g, '');
      const tableId = parseInt(tableIdStr);
      if (tableId) {
        await db.updateTableStatus(tableId, 'occupied');
      }
    } else {
      await db.updateOrderStatus(id, 'cancelled');
    }

    await db.createAuditLog({
      actor: req.user?.email || 'Admin',
      action: 'verify_payment',
      details: `Payment for Order ${order.order_number} verified as: ${status}. Table status set to occupied.`,
      ip_address: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null,
      user_agent: req.headers['user-agent'] || null
    });

    logger.info(`✅ [Admin] Payment verified for ${order.order_number}: ${status} by ${req.user?.email}`);
    return res.status(200).json({ success: true, order: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 7. Admin Kitchen Workflow Updates (Admin / Staff Role Protected)
app.post('/api/admin/orders/:id/status', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'confirmed' | 'preparing' | 'ready' | 'served' | 'cancelled'

    const allowed = ['confirmed', 'preparing', 'ready', 'served', 'cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `Invalid status: ${status}. Allowed: ${allowed.join(', ')}` });
    }

    const order = await db.getOrderById(id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const updated = await db.updateOrderStatus(id, status);

    // If served -> Table status updates to cleaning
    if (status === 'served') {
      const tableIdStr = order.table_number.replace(/[^\d]/g, '');
      const tableId = parseInt(tableIdStr);
      if (tableId) {
        await db.updateTableStatus(tableId, 'cleaning');
      }
    }

    await db.createAuditLog({
      actor: req.user?.email || 'Staff',
      action: 'update_order_status',
      details: `Updated order status for ${order.order_number} to: ${status}`,
      ip_address: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null,
      user_agent: req.headers['user-agent'] || null
    });

    logger.info(`🍳 [Kitchen] Order ${order.order_number} status set to: ${status} by ${req.user?.email}`);
    return res.status(200).json({ success: true, order: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 8. Admin Settings Management (Admin / Manager Role Protected)
app.get('/api/admin/settings', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const settings = await db.getSettings();
    return res.status(200).json({ settings });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.put('/api/admin/settings', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { key, value } = req.body;
    if (!key || value === undefined) {
      return res.status(400).json({ error: 'Key and value are required.' });
    }

    if (req.user?.role === 'kitchen') {
      return res.status(403).json({ error: 'Kitchen staff cannot edit settings.' });
    }

    const updated = await db.updateSetting(key, String(value));
    await db.createAuditLog({
      actor: req.user?.email || 'Admin',
      action: 'update_setting',
      details: `Setting ${key} updated to: ${value}`,
      ip_address: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null,
      user_agent: req.headers['user-agent'] || null
    });

    logger.info(`🔧 [Settings] Updated key "${key}" to "${value}" by ${req.user?.email}`);
    return res.status(200).json({ success: true, setting: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 9. Admin Menu Catalog with Soft Delete (Admin / Manager Role Protected)
app.get('/api/admin/menu', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const items = await db.getMenuItems();
    return res.status(200).json({ items });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/menu', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, price, available, preparation_time_minutes } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ error: 'Name and price are required.' });
    }

    if (req.user?.role === 'kitchen') {
      return res.status(403).json({ error: 'Kitchen staff cannot modify menu items.' });
    }

    const newItem = await db.addMenuItem({
      name: String(name).trim(),
      price: parseInt(price),
      available: available !== undefined ? !!available : true,
      preparation_time_minutes: parseInt(preparation_time_minutes) || 15
    });

    await db.createAuditLog({
      actor: req.user?.email || 'Admin',
      action: 'add_menu_item',
      details: `Added menu item ${newItem.name} with price ₹${newItem.price}`,
      ip_address: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null,
      user_agent: req.headers['user-agent'] || null
    });

    return res.status(201).json({ success: true, item: newItem });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.put('/api/admin/menu/:id', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, price, available, preparation_time_minutes } = req.body;

    if (req.user?.role === 'kitchen') {
      return res.status(403).json({ error: 'Kitchen staff cannot modify menu items.' });
    }

    const payload: any = {};
    if (name !== undefined) payload.name = String(name).trim();
    if (price !== undefined) payload.price = parseInt(price);
    if (available !== undefined) payload.available = !!available;
    if (preparation_time_minutes !== undefined) payload.preparation_time_minutes = parseInt(preparation_time_minutes);

    const updated = await db.updateMenuItem(parseInt(id), payload);

    await db.createAuditLog({
      actor: req.user?.email || 'Admin',
      action: 'update_menu_item',
      details: `Updated menu item ID ${id}: ${JSON.stringify(payload)}`,
      ip_address: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null,
      user_agent: req.headers['user-agent'] || null
    });

    return res.status(200).json({ success: true, item: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.delete('/api/admin/menu/:id', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (req.user?.role === 'kitchen') {
      return res.status(403).json({ error: 'Kitchen staff cannot delete menu items.' });
    }

    await db.deleteMenuItem(parseInt(id));
    await db.createAuditLog({
      actor: req.user?.email || 'Admin',
      action: 'delete_menu_item',
      details: `Soft-deleted menu item ID: ${id}`,
      ip_address: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null,
      user_agent: req.headers['user-agent'] || null
    });

    return res.status(200).json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 10. Admin Table QR Code Token Regeneration
app.post('/api/admin/tables/:id/regenerate-qr', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (req.user?.role === 'kitchen') {
      return res.status(403).json({ error: 'Kitchen staff cannot regenerate QR codes.' });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const table = await db.updateTableQRHash(parseInt(id), hash);

    await db.createAuditLog({
      actor: req.user?.email || 'Admin',
      action: 'regenerate_qr_token',
      details: `Regenerated QR token for table ID ${id}.`,
      ip_address: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null,
      user_agent: req.headers['user-agent'] || null
    });

    logger.info(`🔑 [Admin] Regenerated QR token for Table ID ${id} by ${req.user?.email}`);
    return res.status(200).json({ success: true, table, raw_token: rawToken });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 11. Background payment timeout loop (Runs every 10 seconds)
async function checkExpiredPayments() {
  try {
    const orders = await db.getOrders();
    const now = new Date();
    for (const o of orders) {
      if (['pending_payment', 'pending_verification'].includes(o.payment_status) && o.order_status === 'pending') {
        if (now > new Date(o.payment_expires_at)) {
          logger.info(`[Payment Worker] Expiring order ${o.order_number} due to payment timeout.`);
          await db.updateOrderPaymentStatus(o.id, 'expired');
          await db.updateOrderStatus(o.id, 'cancelled');
        }
      }
    }
  } catch (err) {
    logger.error('[Worker] Error in checkExpiredPayments worker:', err);
  }
}
setInterval(checkExpiredPayments, 10000);


// Start Express Server
app.listen(PORT, () => {
  logger.info(`Bon Appetite Reservation Backend running on port: ${PORT}`);
});
