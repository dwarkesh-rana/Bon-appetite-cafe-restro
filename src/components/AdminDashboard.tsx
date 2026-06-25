import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Users, Shield, RefreshCw, Check, Ban, Clock, CheckSquare, Trash2, Power, Bell, BellOff, Edit, Plus, ToggleLeft, ToggleRight, DollarSign, Settings, QrCode } from 'lucide-react';
import { api } from '../services/api';
import { Table, Reservation, WaitingListEntry } from '../types';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminDashboard({ isOpen, onClose }: AdminDashboardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [userRole, setUserRole] = useState<'owner' | 'manager' | 'kitchen' | 'staff'>('staff');

  // Dashboard Data State
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [waitingList, setWaitingList] = useState<WaitingListEntry[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  
  // Dine-In Ordering & Settings States
  const [orders, setOrders] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [sysSettings, setSysSettings] = useState<any[]>([]);
  
  // Tabs & Filters
  const [selectedTab, setSelectedTab] = useState<'reservations' | 'waiting' | 'tables' | 'orders' | 'menu' | 'settings' | 'scanner'>('orders');
  const [filterType, setFilterType] = useState<'today' | 'tomorrow' | 'range'>('today');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  
  // Alert sound config
  const [soundEnabled, setSoundEnabled] = useState(true);
  const prevOrdersCountRef = useRef<number>(0);

  // QR Scanner Simulator States
  const [scanId, setScanId] = useState('');
  const [scanToken, setScanToken] = useState('');
  const [scanRawJson, setScanRawJson] = useState('');
  const [scanResult, setScanResult] = useState<{
    valid: boolean;
    status?: string;
    message: string;
    reservation?: Reservation;
  } | null>(null);
  const [verifyingScan, setVerifyingScan] = useState(false);

  // Menu Creation/Editing Modal States
  const [menuModalOpen, setMenuModalOpen] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState<any | null>(null);
  const [menuFormName, setMenuFormName] = useState('');
  const [menuFormPrice, setMenuFormPrice] = useState(0);
  const [menuFormTime, setMenuFormTime] = useState(15);
  const [menuFormAvailable, setMenuFormAvailable] = useState(true);

  // Table QR Regeneration states
  const [regeneratedQR, setRegeneratedQR] = useState<{ tableId: number; rawToken: string } | null>(null);

  // Parse JWT token to check user role helper
  const parseTokenRole = (token: string) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload).role || 'staff';
    } catch (e) {
      return 'staff';
    }
  };

  // Check login on startup
  useEffect(() => {
    const token = localStorage.getItem('bon_appetite_admin_token');
    if (token) {
      setIsAuthenticated(true);
      const role = parseTokenRole(token);
      setUserRole(role);
      // Adjust default tab according to role permissions
      if (role === 'kitchen') {
        setSelectedTab('orders');
      } else {
        setSelectedTab('reservations');
      }
    }
  }, []);

  // Fetch Dashboard Data
  const fetchData = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const resList = await api.adminGetReservations();
      const waitList = await api.adminGetWaitingList();
      const tableList = await api.adminGetTables();
      
      setReservations(resList);
      setWaitingList(waitList);
      setTables(tableList);

      // Fetch food order configurations
      const orderList = await api.adminGetOrders();
      setOrders(orderList);

      // Fetch settings and menu items
      const menuList = await api.adminGetMenu();
      setMenuItems(menuList);

      const settingsList = await api.adminGetSettings();
      setSysSettings(settingsList);

      // Play chime if new order count has increased
      const activeOrdersCount = orderList.filter(o => o.order_status === 'pending' || (o.order_status === 'confirmed' && o.payment_status === 'paid')).length;
      if (activeOrdersCount > prevOrdersCountRef.current) {
        if (soundEnabled && prevOrdersCountRef.current > 0) {
          playAlertSound();
        }
      }
      prevOrdersCountRef.current = activeOrdersCount;

    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Background polling loop for updates
    let pollInterval: any;
    if (isAuthenticated) {
      pollInterval = setInterval(fetchData, 8000);
    }
    return () => clearInterval(pollInterval);
  }, [isAuthenticated, soundEnabled]);

  // Web Audio Synth chime generator
  const playAlertSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.35);
    } catch (e) {
      console.error('Synthesized sound playback blocked.', e);
    }
  };

  // Login Handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const response = await api.adminLogin(email, password);
      if (response.success) {
        localStorage.setItem('bon_appetite_admin_token', response.token);
        setIsAuthenticated(true);
        const role = parseTokenRole(response.token);
        setUserRole(role);
        
        if (role === 'kitchen') {
          setSelectedTab('orders');
        } else {
          setSelectedTab('reservations');
        }
        
        setEmail('');
        setPassword('');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Login failed.');
    }
  };

  // Logout Handler
  const handleLogout = () => {
    localStorage.removeItem('bon_appetite_admin_token');
    setIsAuthenticated(false);
    setUserRole('staff');
  };

  // Update Reservation Status Handler
  const handleUpdateStatus = async (id: string, status: Reservation['status'], tableNumber?: string | null) => {
    try {
      await api.adminUpdateReservationStatus(id, status, tableNumber);
      fetchData();
    } catch (err) {
      alert('Failed to update reservation status');
    }
  };

  // Toggle Table Availability
  const handleToggleTable = async (tableId: number, currentAvailable: boolean) => {
    try {
      await api.adminToggleTable(tableId, !currentAvailable);
      fetchData();
    } catch (err) {
      alert('Failed to toggle table availability');
    }
  };

  // Table QR Code regeneration
  const handleRegenerateQR = async (tableId: number) => {
    if (!window.confirm('Are you sure you want to regenerate the QR code token for this table? Old QR codes printed will be immediately invalidated.')) return;
    try {
      const res = await api.adminRegenerateTableQR(tableId);
      setRegeneratedQR({ tableId, rawToken: res.raw_token });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to regenerate table QR.');
    }
  };

  // Delete waiting list item
  const handleDeleteWaiting = async (id: string) => {
    if (!window.confirm('Remove from waiting list?')) return;
    try {
      await api.deleteWaitingList(id);
      fetchData();
    } catch (err) {
      alert('Failed to delete waiting list item');
    }
  };

  // Order payment verification
  const handleVerifyPayment = async (orderId: string, status: 'paid' | 'failed') => {
    const paymentRef = prompt(status === 'paid' ? 'Enter Bank/UPI Reference ID (Optional):' : 'Reason for rejection:');
    if (paymentRef === null) return; // cancelled prompt
    
    setLoading(true);
    try {
      await api.adminVerifyPayment(orderId, status, paymentRef);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to verify payment status.');
    } finally {
      setLoading(false);
    }
  };

  // Order kitchen workflow update
  const handleUpdateOrderWorkflow = async (orderId: string, status: string) => {
    setLoading(true);
    try {
      await api.adminUpdateOrderStatus(orderId, status);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update kitchen status.');
    } finally {
      setLoading(false);
    }
  };

  // System Settings management
  const handleUpdateSetting = async (key: string, value: string) => {
    const newVal = prompt(`Update setting value for key "${key}":`, value);
    if (newVal === null) return;
    
    setLoading(true);
    try {
      await api.adminUpdateSetting(key, newVal);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update system setting.');
    } finally {
      setLoading(false);
    }
  };

  // Menu Catalog item submissions (Add/Edit)
  const handleSaveMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!menuFormName.trim() || menuFormPrice <= 0) {
      alert('Name and price are required.');
      return;
    }
    
    setLoading(true);
    try {
      if (editingMenuItem) {
        // Edit update
        await api.adminUpdateMenuItem(editingMenuItem.id, {
          name: menuFormName,
          price: menuFormPrice,
          preparation_time_minutes: menuFormTime,
          available: menuFormAvailable
        });
      } else {
        // Create new
        await api.adminAddMenuItem({
          name: menuFormName,
          price: menuFormPrice,
          preparation_time_minutes: menuFormTime,
          available: menuFormAvailable
        });
      }
      setMenuModalOpen(false);
      setEditingMenuItem(null);
      setMenuFormName('');
      setMenuFormPrice(0);
      setMenuFormTime(15);
      setMenuFormAvailable(true);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to save menu configuration.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditMenuItemClick = (item: any) => {
    setEditingMenuItem(item);
    setMenuFormName(item.name);
    setMenuFormPrice(item.price);
    setMenuFormTime(item.preparation_time_minutes);
    setMenuFormAvailable(item.available);
    setMenuModalOpen(true);
  };

  const handleDeleteMenuItem = async (id: number) => {
    if (!window.confirm('Are you sure you want to soft-delete this menu item? Old orders will keep their historical pricing records, but new orders will not be able to checkout this item.')) return;
    
    setLoading(true);
    try {
      await api.adminDeleteMenuItem(id);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete menu item.');
    } finally {
      setLoading(false);
    }
  };

  // Scan QR JSON Parse helper
  const handleParseRawJson = () => {
    try {
      const parsed = JSON.parse(scanRawJson);
      if (parsed.id && parsed.token) {
        setScanId(parsed.id);
        setScanToken(parsed.token);
        setScanRawJson('');
      } else {
        alert('JSON does not contain required booking ID or verification token.');
      }
    } catch (e) {
      alert('Invalid JSON input. Please paste a valid ticket JSON.');
    }
  };

  // Verification Scan Handler
  const handleVerifyScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanId || !scanToken) {
      alert('Please fill out reservation ID and token.');
      return;
    }
    setVerifyingScan(true);
    setScanResult(null);
    try {
      const result = await api.verifyQR(scanId, scanToken);
      setScanResult(result);
    } catch (err: any) {
      setScanResult({
        valid: false,
        message: err.message || 'Failed to verify ticket.'
      });
    } finally {
      setVerifyingScan(false);
    }
  };

  // Filter reservations by date
  const getFilteredReservations = () => {
    const today = new Date().toISOString().split('T')[0];
    const tomorrowObj = new Date();
    tomorrowObj.setDate(tomorrowObj.getDate() + 1);
    const tomorrow = tomorrowObj.toISOString().split('T')[0];

    if (filterType === 'today') {
      return reservations.filter(r => r.reservation_date === today);
    }
    if (filterType === 'tomorrow') {
      return reservations.filter(r => r.reservation_date === tomorrow);
    }
    return reservations.filter(
      r => r.reservation_date >= startDate && r.reservation_date <= endDate
    );
  };

  const filteredReservations = getFilteredReservations();

  // Helper to determine if a table is occupied in a certain time slot on selected date
  const getTableStatusForSlot = (tableName: string, date: string) => {
    const slotReservations = reservations.filter(
      r => r.reservation_date === date && 
           (r.status === 'confirmed' || r.status === 'pending') &&
           r.table_number && r.table_number.split(',').map(n => n.trim()).includes(tableName)
    );
    
    if (slotReservations.length > 0) {
      return {
        occupied: true,
        details: slotReservations.map(r => `${r.customer_name} (${r.reservation_time})`).join(', ')
      };
    }
    return { occupied: false, details: '' };
  };

  // Role permissions checking helper
  const hasAccess = (requiredRoles: ('owner' | 'manager' | 'kitchen')[]) => {
    return requiredRoles.includes(userRole as any);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/80 backdrop-blur-md z-10 cursor-pointer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal Container */}
          <motion.div
            className="w-full max-w-5xl h-[85vh] bg-[#140D09] border border-gold/15 rounded-2xl relative z-20 flex flex-col overflow-hidden text-cream"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            {/* Header */}
            <div className="p-6 border-b border-gold/10 flex justify-between items-center bg-[#0D0805]">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-gold-accent" />
                <h3 className="font-serif text-xl tracking-wider uppercase text-gold-accent flex items-center gap-2">
                  Concierge Admin Console
                  {isAuthenticated && (
                    <span className="text-[10px] bg-gold/10 border border-gold/30 text-gold-accent px-2 py-0.5 rounded-full font-mono font-semibold tracking-normal uppercase">
                      {userRole}
                    </span>
                  )}
                </h3>
              </div>
              <div className="flex items-center gap-4">
                {isAuthenticated && (
                  <>
                    {/* Audio toggle bell */}
                    <button
                      onClick={() => setSoundEnabled(!soundEnabled)}
                      className="p-1 rounded-full hover:bg-gold/15 text-gold-accent"
                      title={soundEnabled ? 'Disable sound alarms' : 'Enable sound alarms'}
                    >
                      {soundEnabled ? <Bell className="w-4.5 h-4.5" /> : <BellOff className="w-4.5 h-4.5 opacity-55" />}
                    </button>
                    
                    <button
                      onClick={handleLogout}
                      className="text-xs text-red-400 hover:text-red-300 font-semibold uppercase tracking-wider transition-colors flex items-center gap-1.5"
                    >
                      <Power className="w-3.5 h-3.5" /> Logout
                    </button>
                  </>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-full hover:bg-gold/10 transition-colors"
                >
                  <X className="w-5 h-5 text-gold-accent" />
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {!isAuthenticated ? (
                // ==========================================
                // LOGIN SCREEN
                // ==========================================
                <div className="max-w-md mx-auto py-16 space-y-6">
                  <div className="text-center space-y-2">
                    <Shield className="w-12 h-12 text-gold-accent mx-auto animate-pulse" />
                    <h4 className="font-serif text-xl text-gold-accent italic">Secure Authentication Required</h4>
                    <p className="text-xs opacity-65 font-light">
                      Please enter your credentials to access order workflows, seating, and bookings.
                    </p>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-4 p-6 rounded-xl border border-gold/10 bg-[#0D0805]/50">
                    <div className="space-y-1.5 text-left">
                      <label className="text-[10px] font-semibold uppercase tracking-widest opacity-80">Email Address</label>
                      <input
                        type="email"
                        required
                        placeholder="admin@bonappetite.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-gold/10 bg-[#0D0805] text-cream focus:outline-none focus:ring-1 focus:ring-gold text-sm"
                      />
                    </div>

                    <div className="space-y-1.5 text-left">
                      <label className="text-[10px] font-semibold uppercase tracking-widest opacity-80">Access Password</label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-gold/10 bg-[#0D0805] text-cream focus:outline-none focus:ring-1 focus:ring-gold text-sm"
                      />
                    </div>

                    {loginError && (
                      <p className="text-xs text-red-400 text-left italic">{loginError}</p>
                    )}

                    <div className="flex gap-3">
                      <button
                        type="submit"
                        className="flex-1 py-3 bg-gold-accent hover:bg-gold text-[#0A0A0A] font-semibold rounded-lg text-xs uppercase tracking-widest transition-colors duration-300 cursor-pointer"
                      >
                        Authenticate Access
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEmail('admin@bonappetite.com');
                          setPassword('luxuryrestro2026');
                        }}
                        className="px-4 py-3 border border-gold/30 hover:border-gold text-gold-accent rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors duration-300 cursor-pointer"
                        title="Autofills admin ID and password for quick demo testing"
                      >
                        Demo (Owner)
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                // ==========================================
                // LOGGED-IN ADMIN CONSOLE
                // ==========================================
                <div className="space-y-6">
                  {/* Today's Metrics Overview Dashboard */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-[#0D0805]/50 border border-gold/10">
                    <div className="text-left p-3 rounded-lg bg-[#140D09]/50 border border-gold/5 space-y-1">
                      <div className="text-[10px] uppercase tracking-widest opacity-60 font-semibold text-gold-accent">Reservations Today</div>
                      <div className="text-xl font-serif font-bold text-cream">
                        {reservations.filter(r => r.reservation_date === new Date().toISOString().split('T')[0] && r.status !== 'cancelled').length}
                      </div>
                    </div>
                    <div className="text-left p-3 rounded-lg bg-[#140D09]/50 border border-gold/5 space-y-1">
                      <div className="text-[10px] uppercase tracking-widest opacity-60 font-semibold text-gold-accent">Active Table Orders</div>
                      <div className="text-xl font-serif font-bold text-red-400">
                        {orders.filter(o => ['pending', 'confirmed', 'preparing', 'ready'].includes(o.order_status)).length}
                      </div>
                    </div>
                    <div className="text-left p-3 rounded-lg bg-[#140D09]/50 border border-gold/5 space-y-1">
                      <div className="text-[10px] uppercase tracking-widest opacity-60 font-semibold text-gold-accent">Available Tables</div>
                      <div className="text-xl font-serif font-bold text-green-400">
                        {tables.filter(t => t.available && t.status !== 'occupied').length} / {tables.length}
                      </div>
                    </div>
                    <div className="text-left p-3 rounded-lg bg-[#140D09]/50 border border-gold/5 space-y-1">
                      <div className="text-[10px] uppercase tracking-widest opacity-60 font-semibold text-gold-accent">Unpaid checkouts</div>
                      <div className="text-xl font-serif font-bold text-blue-400">
                        {orders.filter(o => o.payment_status === 'pending_payment').length}
                      </div>
                    </div>
                  </div>

                  {/* Tabs Selector depending on role */}
                  <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 pb-4 border-b border-gold/10">
                    <div className="flex flex-wrap gap-2">
                      {hasAccess(['owner', 'manager']) && (
                        <>
                          <button
                            onClick={() => setSelectedTab('reservations')}
                            className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
                              selectedTab === 'reservations' ? 'bg-gold-accent text-[#0A0A0A]' : 'bg-[#0D0805]/60 hover:bg-gold/5'
                            }`}
                          >
                            Reservations ({reservations.length})
                          </button>
                          <button
                            onClick={() => setSelectedTab('waiting')}
                            className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
                              selectedTab === 'waiting' ? 'bg-gold-accent text-[#0A0A0A]' : 'bg-[#0D0805]/60 hover:bg-gold/5'
                            }`}
                          >
                            Waiting List ({waitingList.length})
                          </button>
                        </>
                      )}
                      
                      <button
                        onClick={() => setSelectedTab('orders')}
                        className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
                          selectedTab === 'orders' ? 'bg-gold-accent text-[#0A0A0A]' : 'bg-[#0D0805]/60 hover:bg-gold/5'
                        }`}
                      >
                        Food Orders ({orders.length})
                      </button>

                      {hasAccess(['owner', 'manager']) && (
                        <button
                          onClick={() => setSelectedTab('tables')}
                          className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
                            selectedTab === 'tables' ? 'bg-gold-accent text-[#0A0A0A]' : 'bg-[#0D0805]/60 hover:bg-gold/5'
                          }`}
                        >
                          Tables Visuals ({tables.length})
                        </button>
                      )}

                      {hasAccess(['owner']) && (
                        <>
                          <button
                            onClick={() => setSelectedTab('menu')}
                            className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
                              selectedTab === 'menu' ? 'bg-gold-accent text-[#0A0A0A]' : 'bg-[#0D0805]/60 hover:bg-gold/5'
                            }`}
                          >
                            Menu Manager ({menuItems.filter(m => !m.deleted).length})
                          </button>
                          <button
                            onClick={() => setSelectedTab('settings')}
                            className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
                              selectedTab === 'settings' ? 'bg-gold-accent text-[#0A0A0A]' : 'bg-[#0D0805]/60 hover:bg-gold/5'
                            }`}
                          >
                            System Settings
                          </button>
                        </>
                      )}

                      {hasAccess(['owner', 'manager']) && (
                        <button
                          onClick={() => setSelectedTab('scanner')}
                          className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-1.5 ${
                            selectedTab === 'scanner' ? 'bg-gold-accent text-[#0A0A0A]' : 'bg-[#0D0805]/60 hover:bg-gold/5'
                          }`}
                        >
                          Ticket Verifier
                        </button>
                      )}
                    </div>

                    {/* Refresh & Filters */}
                    <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                      <button
                        onClick={fetchData}
                        disabled={loading}
                        className="p-2 rounded-lg bg-[#0D0805] border border-gold/10 hover:bg-gold/5 transition-colors disabled:opacity-50 text-gold-accent"
                        title="Reload Data"
                      >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                      </button>

                      {selectedTab === 'reservations' && (
                        <div className="flex flex-wrap items-center gap-2 bg-[#0D0805] px-3 py-1.5 rounded-lg border border-gold/10 w-full sm:w-auto">
                          <span className="text-[10px] uppercase font-bold tracking-wider opacity-60 mr-1">Filter Date:</span>
                          <div className="flex gap-1.5 font-sans">
                            <button
                              onClick={() => setFilterType('today')}
                              className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase ${filterType === 'today' ? 'bg-gold text-[#0A0A0A]' : 'bg-[#140D09] border border-gold/15'}`}
                            >
                              Today
                            </button>
                            <button
                              onClick={() => setFilterType('tomorrow')}
                              className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase ${filterType === 'tomorrow' ? 'bg-gold text-[#0A0A0A]' : 'bg-[#140D09] border border-gold/15'}`}
                            >
                              Tomorrow
                            </button>
                            <button
                              onClick={() => setFilterType('range')}
                              className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase ${filterType === 'range' ? 'bg-gold text-[#0A0A0A]' : 'bg-[#140D09] border border-gold/15'}`}
                            >
                              Range
                            </button>
                          </div>

                          {filterType === 'range' && (
                            <div className="flex items-center gap-1.5 ml-2 border-l border-gold/20 pl-2">
                              <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-transparent text-[10px] focus:outline-none scheme-dark text-cream border-none p-0 cursor-pointer"
                              />
                              <span className="text-[10px] opacity-50">to</span>
                              <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-transparent text-[10px] focus:outline-none scheme-dark text-cream border-none p-0 cursor-pointer"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* --- TAB 1: RESERVATIONS --- */}
                  {selectedTab === 'reservations' && hasAccess(['owner', 'manager']) && (
                    <div className="space-y-4 text-left">
                      <h4 className="font-serif text-lg text-gold-accent italic">
                        {filterType === 'today'
                          ? `Bookings Today (${filteredReservations.length})`
                          : filterType === 'tomorrow'
                          ? `Bookings Tomorrow (${filteredReservations.length})`
                          : `Bookings ${startDate} to ${endDate} (${filteredReservations.length})`}
                      </h4>

                      {filteredReservations.length === 0 ? (
                        <div className="text-center py-16 border border-dashed border-gold/10 rounded-xl">
                          <Calendar className="w-10 h-10 text-gold-accent/40 mx-auto mb-2" />
                          <p className="text-sm opacity-60">No reservations scheduled.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-gold/15 bg-[#0D0805]/30">
                          <table className="w-full border-collapse text-xs">
                            <thead>
                              <tr className="bg-[#0D0805]/80 text-gold-accent uppercase tracking-widest text-[9px] border-b border-gold/15">
                                <th className="p-4">Guest</th>
                                <th className="p-4">Time Slot</th>
                                <th className="p-4 text-center">Guests</th>
                                <th className="p-4">Assigned Table</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gold/10">
                              {filteredReservations.map((r) => (
                                <tr key={r.id} className="hover:bg-gold/5 transition-colors">
                                  <td className="p-4 space-y-0.5">
                                    <div className="font-bold text-cream">{r.customer_name}</div>
                                    <div className="opacity-50 font-mono text-[10px]">{r.email} | {r.phone}</div>
                                  </td>
                                  <td className="p-4 font-semibold">{r.reservation_date} @ {r.reservation_time}</td>
                                  <td className="p-4 text-center font-bold">{r.guests}</td>
                                  <td className="p-4 text-gold-accent font-semibold">{r.table_number || 'Unassigned'}</td>
                                  <td className="p-4">
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-semibold ${
                                      r.status === 'confirmed' ? 'bg-green-500/10 text-green-400' :
                                      r.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' :
                                      'bg-red-500/10 text-red-400'
                                    }`}>
                                      {r.status}
                                    </span>
                                  </td>
                                  <td className="p-4 text-right">
                                    <div className="flex justify-end gap-1.5">
                                      {r.status === 'pending' && (
                                        <button
                                          onClick={() => handleUpdateStatus(r.id, 'confirmed', r.table_number)}
                                          className="p-1.5 rounded-lg border border-green-500/25 bg-green-500/5 hover:bg-green-500/20 text-green-400"
                                        >
                                          <Check className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                      {(r.status === 'confirmed' || r.status === 'pending') && (
                                        <>
                                          <button
                                            onClick={() => handleUpdateStatus(r.id, 'completed', r.table_number)}
                                            className="p-1.5 rounded-lg border border-blue-500/25 bg-blue-500/5 hover:bg-blue-500/20 text-blue-400"
                                          >
                                            <CheckSquare className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            onClick={() => handleUpdateStatus(r.id, 'cancelled', null)}
                                            className="p-1.5 rounded-lg border border-red-500/25 bg-red-500/5 hover:bg-red-500/20 text-red-400"
                                          >
                                            <Ban className="w-3.5 h-3.5" />
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* --- TAB 2: WAITING LIST --- */}
                  {selectedTab === 'waiting' && hasAccess(['owner', 'manager']) && (
                    <div className="space-y-4 text-left">
                      <h4 className="font-serif text-lg text-gold-accent italic">FIFO Waiting List Entries ({waitingList.length})</h4>
                      {waitingList.length === 0 ? (
                        <div className="text-center py-16 border border-dashed border-gold/10 rounded-xl">
                          <Users className="w-10 h-10 text-gold-accent/40 mx-auto mb-2" />
                          <p className="text-sm opacity-60">Waitlist is currently empty.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-gold/15 bg-[#0D0805]/30">
                          <table className="w-full border-collapse text-xs">
                            <thead>
                              <tr className="bg-[#0D0805]/80 text-gold-accent uppercase tracking-widest text-[9px] border-b border-gold/15">
                                <th className="p-4">Customer</th>
                                <th className="p-4">Target Date / Slot</th>
                                <th className="p-4 text-center">Guests</th>
                                <th className="p-4 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gold/10">
                              {waitingList.map((w) => (
                                <tr key={w.id} className="hover:bg-gold/5 transition-colors">
                                  <td className="p-4 space-y-0.5">
                                    <div className="font-bold text-cream">{w.name}</div>
                                    <div className="opacity-50 font-mono text-[10px]">{w.email} | {w.phone}</div>
                                  </td>
                                  <td className="p-4 font-semibold">{w.date} @ {w.time}</td>
                                  <td className="p-4 text-center font-bold">{w.guests}</td>
                                  <td className="p-4 text-right">
                                    <button
                                      onClick={() => handleDeleteWaiting(w.id)}
                                      className="p-1.5 rounded-lg border border-red-500/25 bg-red-500/5 hover:bg-red-500/20 text-red-400"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* --- TAB 3: DINE-IN ORDERS WORKFLOW QUEUE --- */}
                  {selectedTab === 'orders' && (
                    <div className="space-y-4 text-left">
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <h4 className="font-serif text-lg text-gold-accent italic">Live Kitchen & Order Queue</h4>
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4 text-gold-accent" />
                          <span className="text-[10px] uppercase font-bold tracking-widest opacity-60">Sound alerts enabled</span>
                        </div>
                      </div>

                      {orders.length === 0 ? (
                        <div className="text-center py-16 border border-dashed border-gold/10 rounded-xl">
                          <Clock className="w-10 h-10 text-gold-accent/40 mx-auto mb-2" />
                          <p className="text-sm opacity-60">No active dining orders found.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-gold/15 bg-[#0D0805]/30">
                          <table className="w-full border-collapse text-xs">
                            <thead>
                              <tr className="bg-[#0D0805]/80 text-gold-accent uppercase tracking-widest text-[9px] border-b border-gold/15">
                                <th className="p-4">Order ID / Table</th>
                                <th className="p-4">Customer</th>
                                <th className="p-4 text-center">Amount</th>
                                <th className="p-4">Payment</th>
                                <th className="p-4">Kitchen Workflow</th>
                                <th className="p-4 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gold/10">
                              {orders.map((o) => (
                                <tr key={o.id} className="hover:bg-gold/5 transition-colors">
                                  <td className="p-4 space-y-0.5">
                                    <div className="font-bold text-cream font-mono text-[13px]">{o.order_number}</div>
                                    <div className="text-gold-accent font-semibold">Table: {o.table_number}</div>
                                  </td>
                                  <td className="p-4 space-y-0.5">
                                    <div className="font-bold">{o.customer_name}</div>
                                    <div className="opacity-55 font-mono text-[10px]">{o.phone || 'No phone'}</div>
                                  </td>
                                  <td className="p-4 text-center font-bold text-cream">₹{o.final_amount}</td>
                                  <td className="p-4 space-y-1">
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-bold ${
                                      o.payment_status === 'paid' ? 'bg-green-500/10 text-green-400' :
                                      o.payment_status === 'pending_verification' ? 'bg-amber-500/10 text-amber-400 animate-pulse' :
                                      o.payment_status === 'expired' ? 'bg-red-900/20 text-red-400' :
                                      'bg-gray-500/10 text-gray-400'
                                    }`}>
                                      {o.payment_status === 'pending_verification' ? 'To Verify' : o.payment_status}
                                    </span>
                                    {o.upi_transaction_id && (
                                      <div className="text-[10px] font-mono text-gold-accent">Tx ID: {o.upi_transaction_id}</div>
                                    )}
                                  </td>
                                  <td className="p-4 font-semibold uppercase tracking-wider text-[10px]">
                                    <span className={`px-2 py-0.5 rounded-full ${
                                      o.order_status === 'served' ? 'bg-blue-500/10 text-blue-400' :
                                      o.order_status === 'preparing' ? 'bg-purple-500/10 text-purple-400 animate-pulse' :
                                      o.order_status === 'ready' ? 'bg-emerald-500/10 text-emerald-400 animate-bounce' :
                                      o.order_status === 'cancelled' ? 'bg-red-500/10 text-red-400' :
                                      'bg-yellow-500/10 text-yellow-400'
                                    }`}>
                                      {o.order_status}
                                    </span>
                                  </td>
                                  <td className="p-4 text-right">
                                    <div className="flex justify-end gap-2 flex-wrap max-w-[200px]">
                                      {/* Payment Verification Buttons (Owner/Manager role only) */}
                                      {o.payment_status === 'pending_verification' && hasAccess(['owner', 'manager']) && (
                                        <div className="flex gap-1 mb-1">
                                          <button
                                            onClick={() => handleVerifyPayment(o.id, 'paid')}
                                            className="px-2 py-1 bg-green-900/30 border border-green-500/30 text-green-400 rounded text-[9px] uppercase font-bold"
                                          >
                                            Confirm Paid
                                          </button>
                                          <button
                                            onClick={() => handleVerifyPayment(o.id, 'failed')}
                                            className="px-2 py-1 bg-red-900/30 border border-red-500/30 text-red-400 rounded text-[9px] uppercase font-bold"
                                          >
                                            Reject
                                          </button>
                                        </div>
                                      )}

                                      {/* Kitchen workflow buttons (Staff roles) */}
                                      {o.payment_status === 'paid' && o.order_status === 'confirmed' && (
                                        <button
                                          onClick={() => handleUpdateOrderWorkflow(o.id, 'preparing')}
                                          className="px-2 py-1 bg-purple-900/30 border border-purple-500/30 text-purple-400 rounded text-[9px] uppercase font-bold"
                                        >
                                          Start Prep
                                        </button>
                                      )}
                                      {o.order_status === 'preparing' && (
                                        <button
                                          onClick={() => handleUpdateOrderWorkflow(o.id, 'ready')}
                                          className="px-2 py-1 bg-emerald-900/30 border border-emerald-500/30 text-emerald-400 rounded text-[9px] uppercase font-bold"
                                        >
                                          Mark Ready
                                        </button>
                                      )}
                                      {o.order_status === 'ready' && (
                                        <button
                                          onClick={() => handleUpdateOrderWorkflow(o.id, 'served')}
                                          className="px-2 py-1 bg-blue-900/30 border border-blue-500/30 text-blue-400 rounded text-[9px] uppercase font-bold"
                                        >
                                          Mark Served
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* --- TAB 4: TABLES VISUALS & REGISTRATION --- */}
                  {selectedTab === 'tables' && hasAccess(['owner', 'manager']) && (
                    <div className="space-y-6 text-left">
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <div>
                          <h4 className="font-serif text-lg text-gold-accent italic">Interactive Seating occupancy</h4>
                          <p className="text-xs opacity-65 font-light">Generate secure crypto tokens for QR table printing stickers.</p>
                        </div>
                      </div>

                      {regeneratedQR && (
                        <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-xs rounded-xl space-y-2">
                          <h5 className="font-semibold font-serif text-emerald-400">QR Code Secret Token Regenerated!</h5>
                          <p className="opacity-80">
                            Sticker QR URL link: <b className="font-mono text-[10px] break-all">{window.location.origin}/?table={regeneratedQR.tableId}&token={regeneratedQR.rawToken}</b>
                          </p>
                          <p className="text-[10px] opacity-60">
                            Invalidated all previous stickers printed for this table.
                          </p>
                          <button
                            onClick={() => setRegeneratedQR(null)}
                            className="underline text-[10px] hover:text-emerald-300"
                          >
                            Dismiss
                          </button>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                        {tables.map((table) => {
                          const status = getTableStatusForSlot(table.table_name, startDate);
                          return (
                            <div
                              key={table.id}
                              className={`p-6 rounded-xl border flex flex-col justify-between transition-all ${
                                !table.available ? 'bg-[#150D0A]/30 border-gray-500/20 opacity-50' :
                                table.status === 'occupied' ? 'bg-[#1C1410] border-red-500/30' :
                                table.status === 'cleaning' ? 'bg-[#1C1410] border-yellow-500/30 animate-pulse' :
                                'bg-[#1C1410] border-green-500/30'
                              }`}
                            >
                              <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <h5 className="font-serif text-base text-gold-accent font-semibold">{table.table_name}</h5>
                                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                                    !table.available ? 'bg-gray-500/10 text-gray-400' :
                                    table.status === 'occupied' ? 'bg-red-500/10 text-red-400' :
                                    table.status === 'cleaning' ? 'bg-yellow-500/10 text-yellow-400' :
                                    'bg-green-500/10 text-green-400'
                                  }`}>
                                    {!table.available ? 'Inactive' : table.status || 'Available'}
                                  </span>
                                </div>
                                <div className="text-xs">Capacity: <b className="text-gold-accent">{table.capacity} Guests</b></div>
                              </div>

                              <div className="pt-4 border-t border-gold/10 mt-4 flex items-center justify-between">
                                <button
                                  onClick={() => handleToggleTable(table.id, table.available)}
                                  className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors ${
                                    table.available ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-green-900 text-green-300 hover:bg-green-800'
                                  }`}
                                >
                                  {table.available ? 'Disable' : 'Enable'}
                                </button>
                                
                                <button
                                  onClick={() => handleRegenerateQR(table.id)}
                                  className="text-[10px] text-gold-accent hover:underline flex items-center gap-1.5"
                                >
                                  <QrCode className="w-3.5 h-3.5" /> Regenerate QR
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* --- TAB 5: MENU MANAGER CATALOG --- */}
                  {selectedTab === 'menu' && hasAccess(['owner']) && (
                    <div className="space-y-4 text-left">
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <h4 className="font-serif text-lg text-gold-accent italic">Gourmet Food Catalog</h4>
                        <button
                          onClick={() => {
                            setEditingMenuItem(null);
                            setMenuFormName('');
                            setMenuFormPrice(0);
                            setMenuFormTime(15);
                            setMenuFormAvailable(true);
                            setMenuModalOpen(true);
                          }}
                          className="px-4 py-2 bg-gold-accent hover:bg-gold text-[#0A0A0A] font-semibold rounded-lg text-xs uppercase tracking-widest transition-colors flex items-center gap-1.5"
                        >
                          <Plus className="w-4 h-4" /> Add Dish
                        </button>
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-gold/15 bg-[#0D0805]/30">
                        <table className="w-full border-collapse text-xs">
                          <thead>
                            <tr className="bg-[#0D0805]/80 text-gold-accent uppercase tracking-widest text-[9px] border-b border-gold/15">
                              <th className="p-4">Dish Name</th>
                              <th className="p-4 text-center">Base Price</th>
                              <th className="p-4 text-center">Prep Time</th>
                              <th className="p-4">Status</th>
                              <th className="p-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gold/10">
                            {menuItems.filter(m => !m.deleted).map((item) => (
                              <tr key={item.id} className="hover:bg-gold/5 transition-colors">
                                <td className="p-4 font-bold text-cream">{item.name}</td>
                                <td className="p-4 text-center font-semibold text-gold-accent">₹{item.price}</td>
                                <td className="p-4 text-center">{item.preparation_time_minutes} min</td>
                                <td className="p-4">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-bold ${
                                    item.available ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                                  }`}>
                                    {item.available ? 'In Stock' : 'Out of Stock'}
                                  </span>
                                </td>
                                <td className="p-4 text-right">
                                  <div className="flex justify-end gap-1.5">
                                    <button
                                      onClick={() => handleEditMenuItemClick(item)}
                                      className="p-1.5 rounded-lg border border-gold/25 text-gold-accent hover:bg-gold/10"
                                      title="Edit details"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteMenuItem(item.id)}
                                      className="p-1.5 rounded-lg border border-red-500/25 text-red-400 hover:bg-red-500/10"
                                      title="Soft-Delete item"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* --- TAB 6: SYSTEM CONFIG SETTINGS --- */}
                  {selectedTab === 'settings' && hasAccess(['owner']) && (
                    <div className="space-y-4 text-left">
                      <h4 className="font-serif text-lg text-gold-accent italic">Core System Configurations</h4>
                      <div className="overflow-x-auto rounded-xl border border-gold/15 bg-[#0D0805]/30">
                        <table className="w-full border-collapse text-xs">
                          <thead>
                            <tr className="bg-[#0D0805]/80 text-gold-accent uppercase tracking-widest text-[9px] border-b border-gold/15">
                              <th className="p-4">Configuration Key</th>
                              <th className="p-4">Current Value</th>
                              <th className="p-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gold/10">
                            {sysSettings.map((s) => (
                              <tr key={s.id} className="hover:bg-gold/5 transition-colors">
                                <td className="p-4 font-mono font-bold text-gold-accent">{s.key}</td>
                                <td className="p-4 text-cream font-semibold">{s.value}</td>
                                <td className="p-4 text-right">
                                  <button
                                    onClick={() => handleUpdateSetting(s.key, s.value)}
                                    className="px-2.5 py-1 rounded border border-gold/20 text-gold-accent hover:bg-gold-accent hover:text-[#0A0A0A] font-bold text-[10px] uppercase tracking-wider transition-all"
                                  >
                                    Edit
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* --- TAB 7: TICKET SCANNER --- */}
                  {selectedTab === 'scanner' && hasAccess(['owner', 'manager']) && (
                    <div className="space-y-6 max-w-xl mx-auto text-left">
                      <div className="space-y-1">
                        <h4 className="font-serif text-lg text-gold-accent italic">Digital Ticket Verification</h4>
                        <p className="text-xs opacity-65 font-light">Simulate scanning a reservation QR code ticket.</p>
                      </div>

                      <div className="p-4 rounded-xl bg-[#0D0805]/50 border border-gold/10 space-y-3">
                        <label className="text-[10px] font-semibold uppercase tracking-widest opacity-80 block">Paste Raw QR Ticket Code (JSON)</label>
                        <textarea
                          rows={2}
                          value={scanRawJson}
                          onChange={(e) => setScanRawJson(e.target.value)}
                          placeholder='{"id":"BA-1234","token":"abcdef123456"}'
                          className="w-full px-4 py-2.5 rounded-lg border border-gold/10 bg-[#0D0805] text-cream text-xs font-mono focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleParseRawJson}
                          className="px-4 py-2 bg-[#1C1410] border border-gold/25 text-gold-accent hover:bg-gold/10 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors"
                        >
                          Auto-populate fields
                        </button>
                      </div>

                      <form onSubmit={handleVerifyScan} className="space-y-4 p-4 rounded-xl bg-[#0D0805]/50 border border-gold/10">
                        <div className="grid grid-cols-2 gap-4 font-sans">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-semibold uppercase block">Booking ID</label>
                            <input
                              type="text"
                              required
                              value={scanId}
                              onChange={(e) => setScanId(e.target.value)}
                              placeholder="BA-XXXX"
                              className="w-full px-4 py-2 rounded-lg border border-gold/10 bg-[#0D0805] text-cream text-xs focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-semibold uppercase block">Verification Token</label>
                            <input
                              type="text"
                              required
                              value={scanToken}
                              onChange={(e) => setScanToken(e.target.value)}
                              placeholder="16-character hex token"
                              className="w-full px-4 py-2 rounded-lg border border-gold/10 bg-[#0D0805] text-cream text-xs focus:outline-none"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={verifyingScan}
                          className="w-full py-2.5 bg-gold-accent hover:bg-gold text-[#0A0A0A] font-semibold rounded-lg text-xs uppercase tracking-widest transition-colors disabled:opacity-50"
                        >
                          {verifyingScan ? 'Verifying Ticket...' : 'Verify Ticket Status'}
                        </button>
                      </form>

                      {scanResult && (
                        <div className={`p-5 rounded-xl border ${scanResult.valid ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'} space-y-3`}>
                          <div className="flex justify-between items-center">
                            <h5 className="font-serif text-base font-bold text-cream">Verification Result</h5>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-semibold ${
                              scanResult.valid ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                            }`}>
                              {scanResult.valid ? 'Valid Ticket' : scanResult.status || 'Invalid'}
                            </span>
                          </div>

                          <p className="text-xs opacity-80 font-light italic">{scanResult.message}</p>

                          {scanResult.reservation && (
                            <div className="grid grid-cols-2 gap-3 text-xs bg-[#0D0805]/50 p-3 rounded border border-gold/10 mt-2">
                              <div>Guest: <b>{scanResult.reservation.customer_name}</b></div>
                              <div>Guests count: <b>{scanResult.reservation.guests}</b></div>
                              <div>Date: <b>{scanResult.reservation.reservation_date}</b></div>
                              <div>Time Slot: <b>{scanResult.reservation.reservation_time}</b></div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* --- ADD/EDIT MENU ITEM MODAL --- */}
      {menuModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80" onClick={() => setMenuModalOpen(false)} />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md bg-[#140D09] border border-gold/15 p-6 rounded-2xl relative z-10 text-cream font-sans"
          >
            <h4 className="font-serif text-lg text-gold-accent mb-4 italic">
              {editingMenuItem ? 'Edit Menu Item' : 'Add Menu Item'}
            </h4>

            <form onSubmit={handleSaveMenuItem} className="space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-[10px] uppercase block font-semibold text-gold-accent">Item Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lobster Thermidor"
                  value={menuFormName}
                  onChange={(e) => setMenuFormName(e.target.value)}
                  className="w-full p-2.5 rounded border border-gold/10 bg-[#0D0805] text-xs text-cream focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase block font-semibold text-gold-accent">Base Price (₹)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 1200"
                    value={menuFormPrice}
                    onChange={(e) => setMenuFormPrice(parseInt(e.target.value) || 0)}
                    className="w-full p-2.5 rounded border border-gold/10 bg-[#0D0805] text-xs text-cream focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase block font-semibold text-gold-accent">Prep Time (min)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 20"
                    value={menuFormTime}
                    onChange={(e) => setMenuFormTime(parseInt(e.target.value) || 15)}
                    className="w-full p-2.5 rounded border border-gold/10 bg-[#0D0805] text-xs text-cream focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 py-2">
                <input
                  type="checkbox"
                  id="menuFormAvailable"
                  checked={menuFormAvailable}
                  onChange={(e) => setMenuFormAvailable(e.target.checked)}
                  className="w-4 h-4 accent-gold"
                />
                <label htmlFor="menuFormAvailable" className="text-xs cursor-pointer select-none">
                  Available in stock (Item can be ordered)
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMenuModalOpen(false)}
                  className="flex-1 py-2 rounded bg-gray-800 hover:bg-gray-700 text-xs font-semibold uppercase tracking-wider text-cream"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded bg-gold-accent hover:bg-gold text-xs font-semibold uppercase tracking-wider text-[#0a0a0a]"
                >
                  Save Item
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
