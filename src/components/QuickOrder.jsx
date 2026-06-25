import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Plus, Minus, Check, ChevronRight, QrCode, FileText, Sparkles, CreditCard, Clock, AlertTriangle, Play, HelpCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const FALLBACK_MENU = [
  { id: '1', name: 'Grand Espresso Macchiato', price: 450, category: '☕ Coffee', desc: 'Single-origin espresso with whipped cream and gold dust' },
  { id: '2', name: 'Champagne Truffle Latte', price: 650, category: '☕ Coffee', desc: 'Steamed milk, house mocha syrup, infused with white truffle scent' },
  { id: '3', name: 'Truffle Tagliolini', price: 1850, category: 'Main Course', desc: 'Handcrafted pasta, Parmigiano-Reggiano, fresh black truffle shavings' },
  { id: '4', name: 'Wild Mushroom Risotto', price: 1450, category: 'Main Course', desc: 'Arborio rice, forest mushrooms, white wine, mascarpone' },
  { id: '5', name: 'Golden Foil Cheesecake', price: 950, category: '🍰 Desserts', desc: 'Madagascar vanilla bean cheesecake topped with edible 24k gold leaf' },
  { id: '6', name: 'Pistachio Paris-Brest', price: 850, category: '🍰 Desserts', desc: 'Choux pastry ring filled with premium Sicilian pistachio praline cream' }
];

export default function QuickOrder({ isOpen, onClose }) {
  const { isDarkMode } = useTheme();
  
  // App Config
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  
  // UI States
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  
  // Active QR Table State
  const [tableQR, setTableQR] = useState(null);
  
  // Order Session/Tracking States
  const [activeOrder, setActiveOrder] = useState(null); // Full order object from API
  const [rawSessionToken, setRawSessionToken] = useState('');
  const [upiTxId, setUpiTxId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invoice, setInvoice] = useState(null);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  
  const drawerRef = useRef(null);

  // Load Menu and QR Table details from local storage
  useEffect(() => {
    // 1. Fetch menu items
    fetch(`${apiBase}/menu`)
      .then((res) => {
        if (!res.ok) throw new Error('Menu fetch failed');
        return res.json();
      })
      .then((data) => {
        if (data.items) {
          setMenuItems(data.items);
        }
      })
      .catch((err) => {
        console.error('Menu load error. Using local fallbacks.', err);
        setMenuItems(FALLBACK_MENU);
      });

    // 2. Read Table QR details
    const storedQR = localStorage.getItem('bon_table_qr');
    if (storedQR) {
      try {
        setTableQR(JSON.parse(storedQR));
      } catch (e) {
        console.error(e);
      }
    }

    // 3. Read Active Order tracking session
    const storedSession = localStorage.getItem('bon_order_session');
    if (storedSession) {
      try {
        const session = JSON.parse(storedSession);
        // Fetch current status from backend
        fetchOrderStatus(session.id, session.token);
      } catch (e) {
        console.error(e);
      }
    }
  }, [isOpen]);

  // Polling tracker for active orders
  useEffect(() => {
    if (!activeOrder) return;
    
    // Stop polling if cancelled, expired, or served
    if (['served', 'cancelled'].includes(activeOrder.order_status) || activeOrder.payment_status === 'expired') {
      return;
    }

    const interval = setInterval(() => {
      const storedSession = localStorage.getItem('bon_order_session');
      if (storedSession) {
        const session = JSON.parse(storedSession);
        fetchOrderStatus(session.id, session.token);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [activeOrder]);

  // Focus trap
  useEffect(() => {
    if (!isOpen) return;
    const focusable = drawerRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable && focusable.length > 0) {
      setTimeout(() => focusable[0].focus(), 50);
    }
  }, [isOpen]);

  const fetchOrderStatus = async (orderId, token) => {
    try {
      const res = await fetch(`${apiBase}/orders/track/${orderId}?token=${token}`);
      if (!res.ok) {
        if (res.status === 403 || res.status === 404) {
          // Stale session, discard
          localStorage.removeItem('bon_order_session');
          setActiveOrder(null);
          setRawSessionToken('');
          return;
        }
        throw new Error('Track failed');
      }
      const data = await res.json();
      setActiveOrder(data.order);
      setRawSessionToken(token);
    } catch (e) {
      console.error(e);
    }
  };

  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.name === item.name);
      if (existing) {
        return prev.map((i) => (i.name === item.name ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { ...item, qty: 1, instruction: '' }];
    });
  };

  const updateQty = (name, change) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.name === name) {
            const newQty = item.qty + change;
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const updateInstruction = (name, text) => {
    setCart((prev) =>
      prev.map((item) => (item.name === name ? { ...item, instruction: text } : item))
    );
  };

  const clearTableQR = () => {
    localStorage.removeItem('bon_table_qr');
    setTableQR(null);
  };

  const clearActiveOrder = () => {
    localStorage.removeItem('bon_order_session');
    setActiveOrder(null);
    setRawSessionToken('');
    setSuccessMsg('');
    setErrorMsg('');
    setUpiTxId('');
  };

  const handlePlaceOrder = async () => {
    if (!customerName.trim()) {
      setErrorMsg('Please enter your name.');
      return;
    }
    if (!tableQR) {
      setErrorMsg('No table scanned. Please scan the QR code at your table first.');
      return;
    }
    
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const itemsPayload = cart.map(c => ({
        food_item: c.name,
        quantity: c.qty,
        special_instruction: c.instruction || null
      }));

      const res = await fetch(`${apiBase}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName,
          phone: customerPhone || null,
          table_number: tableQR.table,
          token: tableQR.token,
          items: itemsPayload
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Checkout failed');

      setCart([]);
      setActiveOrder(data.order);
      setRawSessionToken(data.raw_session_token);
      localStorage.setItem('bon_order_session', JSON.stringify({ id: data.order.id, token: data.raw_session_token }));
      setSuccessMsg('Order placed successfully! Please complete payment below.');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitPayment = async () => {
    if (!upiTxId.trim()) {
      setErrorMsg('Please enter the UPI Transaction ID.');
      return;
    }
    
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const res = await fetch(`${apiBase}/orders/${activeOrder.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: rawSessionToken,
          upi_transaction_id: upiTxId
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payment update failed');

      setActiveOrder(data.order);
      setSuccessMsg('Transaction ID submitted! Waiting for admin verification.');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!activeOrder) return;
    if (!window.confirm('Are you sure you want to cancel this order?')) return;

    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const res = await fetch(`${apiBase}/orders/${activeOrder.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: rawSessionToken
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Cancel failed');

      setActiveOrder(data.order);
      setSuccessMsg('Your order has been cancelled.');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewInvoice = async () => {
    try {
      const res = await fetch(`${apiBase}/orders/invoice/${activeOrder.id}?token=${rawSessionToken}`);
      if (!res.ok) throw new Error('Invoice view failed');
      const data = await res.json();
      setInvoice(data);
      setInvoiceOpen(true);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.qty, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/75 backdrop-blur-md z-30 cursor-pointer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Drawer Container */}
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10 pointer-events-none z-40">
            <motion.div
              ref={drawerRef}
              onClick={(e) => e.stopPropagation()}
              className={`w-screen max-w-md border-l relative flex flex-col pointer-events-auto shadow-2xl ${
                isDarkMode 
                  ? 'bg-espresso border-gold/20 text-cream' 
                  : 'bg-[#FDFBF7] border-gold-accent/25 text-espresso'
              }`}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.35, ease: 'easeOut' }}
            >
              {/* Header */}
              <div className="p-6 border-b border-gold/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-gold-accent" />
                  <h3 className="font-serif text-xl tracking-wider font-medium">
                    {activeOrder ? `Order Tracker: ${activeOrder.order_number}` : 'Luxury Dine-In Order'}
                  </h3>
                </div>
                <button
                  onClick={onClose}
                  className="p-1 rounded-full hover:bg-gold/10 transition-colors group"
                  aria-label="Close Order drawer"
                >
                  <X className="w-5 h-5 text-gold-accent group-hover:rotate-90 transition-transform duration-300" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Error Banner */}
                {errorMsg && (
                  <div className="p-3 bg-red-900/40 border border-red-500/30 text-red-200 text-xs rounded-lg flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Success Banner */}
                {successMsg && (
                  <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-xs rounded-lg flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {/* --- STATE 1: ACTIVE ORDER TRACKING (Order exists in session) --- */}
                {activeOrder ? (
                  <div className="space-y-6 text-left">
                    {/* Status Summary */}
                    <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-espresso-light/30 border-gold/10' : 'bg-cream-dark/15 border-gold-accent/20'}`}>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs uppercase tracking-widest text-gold-accent font-semibold italic">Order Status</span>
                        <span className={`text-xs uppercase font-semibold px-2 py-0.5 rounded-full ${
                          activeOrder.order_status === 'served' ? 'bg-emerald-900/30 text-emerald-300 border border-emerald-500/20' :
                          activeOrder.order_status === 'cancelled' ? 'bg-red-900/30 text-red-300 border border-red-500/20' :
                          'bg-amber-900/30 text-amber-300 border border-amber-500/20 animate-pulse'
                        }`}>
                          {activeOrder.order_status === 'pending' ? 'Verification' : activeOrder.order_status}
                        </span>
                      </div>

                      {/* Timeline graphic */}
                      <div className="relative pl-6 space-y-5 py-2 font-serif text-sm">
                        <div className="absolute left-2.5 top-3 bottom-3 w-0.5 bg-gold/20" />
                        
                        {/* Step 1: Placed */}
                        <div className="relative flex items-center gap-3">
                          <div className={`absolute -left-[21px] w-3 h-3 rounded-full border ${activeOrder.created_at ? 'bg-gold border-gold' : 'bg-espresso border-gold/30'}`} />
                          <span className={activeOrder.created_at ? 'text-gold' : 'opacity-50'}>Order Placed</span>
                        </div>

                        {/* Step 2: Confirmed */}
                        <div className="relative flex items-center gap-3">
                          <div className={`absolute -left-[21px] w-3 h-3 rounded-full border ${activeOrder.confirmed_at ? 'bg-gold border-gold' : 'bg-espresso border-gold/30'}`} />
                          <span className={activeOrder.confirmed_at ? 'text-gold' : 'opacity-50'}>Payment Confirmed</span>
                        </div>

                        {/* Step 3: Preparing */}
                        <div className="relative flex items-center gap-3">
                          <div className={`absolute -left-[21px] w-3 h-3 rounded-full border ${activeOrder.preparing_at ? 'bg-gold border-gold' : 'bg-espresso border-gold/30'}`} />
                          <span className={activeOrder.preparing_at ? 'text-gold' : 'opacity-50'}>Preparing in Kitchen</span>
                        </div>

                        {/* Step 4: Ready */}
                        <div className="relative flex items-center gap-3">
                          <div className={`absolute -left-[21px] w-3 h-3 rounded-full border ${activeOrder.ready_at ? 'bg-gold border-gold' : 'bg-espresso border-gold/30'}`} />
                          <span className={activeOrder.ready_at ? 'text-gold' : 'opacity-50'}>Ready for Serving</span>
                        </div>

                        {/* Step 5: Served */}
                        <div className="relative flex items-center gap-3">
                          <div className={`absolute -left-[21px] w-3 h-3 rounded-full border ${activeOrder.served_at ? 'bg-gold border-gold' : 'bg-espresso border-gold/30'}`} />
                          <span className={activeOrder.served_at ? 'text-gold' : 'opacity-50'}>Served to Table</span>
                        </div>
                      </div>

                      {/* Estimated prep time */}
                      {activeOrder.order_status === 'preparing' && (
                        <div className="mt-4 pt-3 border-t border-gold/10 flex items-center gap-2 text-xs text-gold-accent font-sans">
                          <Clock className="w-4 h-4" />
                          <span>Estimated serving time: ~{activeOrder.estimated_ready_time} minutes</span>
                        </div>
                      )}
                    </div>

                    {/* --- UPI Payment details if payment is still pending --- */}
                    {activeOrder.payment_status === 'pending_payment' && (
                      <div className="p-4 rounded-xl border border-gold/20 bg-gold/5 space-y-4">
                        <div className="flex items-center gap-2 text-gold-accent">
                          <CreditCard className="w-5 h-5" />
                          <h4 className="font-serif text-sm tracking-wider font-semibold">GPay / UPI Payment Details</h4>
                        </div>
                        <p className="text-xs opacity-80 leading-relaxed font-light">
                          Please transfer the exact amount using GPay or any UPI client to our registered UPI address.
                        </p>
                        
                        <div className="p-3 bg-black/30 rounded-lg text-xs space-y-2 border border-gold/10">
                          <div className="flex justify-between">
                            <span className="opacity-75">Pay To (UPI ID):</span>
                            <span className="font-semibold text-gold-accent">bonappetite@upi</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="opacity-75">Exact Amount:</span>
                            <span className="font-semibold text-gold-accent text-sm">₹{activeOrder.final_amount}</span>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase tracking-widest text-gold-accent block">Enter UPI Transaction ID</label>
                          <input
                            type="text"
                            placeholder="e.g. 349810248924"
                            value={upiTxId}
                            onChange={(e) => setUpiTxId(e.target.value)}
                            className={`w-full p-2.5 rounded-lg border text-sm focus:outline-none focus:border-gold ${
                              isDarkMode 
                                ? 'bg-espresso-dark border-gold/15 text-cream' 
                                : 'bg-white border-gold-accent/25 text-espresso'
                            }`}
                          />
                        </div>

                        <button
                          onClick={handleSubmitPayment}
                          disabled={isSubmitting || !upiTxId}
                          className="w-full bg-gradient-to-r from-gold-dark to-gold hover:from-gold hover:to-gold-light text-[#0A0A0A] font-semibold py-2.5 rounded-lg text-xs uppercase tracking-widest transition-all duration-300 disabled:opacity-50"
                        >
                          {isSubmitting ? 'Submitting...' : 'Submit Transaction ID'}
                        </button>
                      </div>
                    )}

                    {/* Waiting verification */}
                    {activeOrder.payment_status === 'pending_verification' && (
                      <div className="p-4 rounded-xl border border-gold/10 bg-gold/5 flex items-start gap-3">
                        <Clock className="w-5 h-5 text-gold-accent shrink-0 mt-0.5 animate-spin" />
                        <div className="space-y-1">
                          <h4 className="font-serif text-sm text-gold-accent">Verification Pending</h4>
                          <p className="text-xs opacity-75 leading-relaxed font-light">
                            Our manager is verifying the transaction ID <b>{activeOrder.upi_transaction_id}</b>. Once verified, food preparation will begin.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Cancel & Invoice Buttons */}
                    <div className="flex gap-3">
                      {['pending', 'confirmed'].includes(activeOrder.order_status) && (
                        <button
                          onClick={handleCancelOrder}
                          disabled={isSubmitting}
                          className="flex-1 py-2 px-4 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors text-xs uppercase tracking-widest font-semibold"
                        >
                          Cancel Order
                        </button>
                      )}
                      
                      {activeOrder.payment_status === 'paid' && (
                        <button
                          onClick={handleViewInvoice}
                          className="flex-1 py-2 px-4 rounded-lg bg-gold/10 border border-gold/30 text-gold-accent hover:bg-gold-accent hover:text-[#0a0a0a] transition-all text-xs uppercase tracking-widest font-semibold flex items-center justify-center gap-2"
                        >
                          <FileText className="w-4 h-4" />
                          View Invoice
                        </button>
                      )}
                    </div>

                    <button
                      onClick={clearActiveOrder}
                      className="w-full bg-transparent border border-gold/20 text-gold-accent/60 hover:text-gold hover:border-gold py-2 rounded-lg text-[10px] uppercase tracking-widest transition-colors font-medium"
                    >
                      Track Another Order / New Order
                    </button>
                  </div>
                ) : (
                  /* --- STATE 2: MENU & CHECKOUT SELECTION --- */
                  <>
                    {/* QR Code Scanned details */}
                    {tableQR ? (
                      <div className="p-3 bg-gold/10 border border-gold/20 rounded-xl flex items-center justify-between text-left">
                        <div className="flex items-center gap-2">
                          <QrCode className="w-4 h-4 text-gold-accent" />
                          <span className="text-xs font-serif text-gold-accent">Dine-In: <b>{tableQR.table}</b> active</span>
                        </div>
                        <button
                          onClick={clearTableQR}
                          className="text-[10px] text-red-400 hover:underline"
                        >
                          Clear
                        </button>
                      </div>
                    ) : (
                      <div className="p-3 bg-amber-900/20 border border-amber-500/20 rounded-xl text-left flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <h5 className="text-xs font-semibold text-amber-500 font-serif">Viewing Signature Items</h5>
                          <p className="text-[10px] opacity-70 leading-relaxed font-light">
                            To place orders directly to your table, please scan the QR code located on your table.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Item list */}
                    <div className="space-y-4">
                      <h4 className="text-xs uppercase tracking-widest text-gold-accent font-semibold italic text-left">
                        Luxury Menu Items
                      </h4>
                      <div className="divide-y divide-gold/10 text-left">
                        {menuItems.map((item) => {
                          const inCart = cart.find((i) => i.name === item.name);
                          return (
                            <div key={item.id} className="py-4 flex justify-between items-start gap-4">
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-semibold">{item.name}</span>
                                  {!item.available && (
                                    <span className="text-[9px] bg-red-900/30 border border-red-500/20 text-red-300 px-1 py-0.5 rounded uppercase">Out of Stock</span>
                                  )}
                                  <span className="text-xs text-gold-accent font-serif font-medium">₹{item.price}</span>
                                </div>
                                <p className="text-xs opacity-60 leading-relaxed font-light italic">
                                  {item.desc || 'Handcrafted delicacies prepared fresh.'}
                                </p>
                              </div>
                              {inCart ? (
                                <div className="flex items-center border border-gold/30 rounded-lg overflow-hidden bg-gold/5 shrink-0">
                                  <button
                                    onClick={() => updateQty(item.name, -1)}
                                    className="p-1.5 hover:bg-gold/15 text-gold-accent transition-colors"
                                    aria-label={`Decrease quantity of ${item.name}`}
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="px-2 text-xs font-semibold">{inCart.qty}</span>
                                  <button
                                    onClick={() => updateQty(item.name, 1)}
                                    className="p-1.5 hover:bg-gold/15 text-gold-accent transition-colors"
                                    aria-label={`Increase quantity of ${item.name}`}
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => addToCart(item)}
                                  disabled={!item.available}
                                  className="p-1.5 rounded-lg border border-gold-accent/40 text-gold-accent hover:bg-gold-accent hover:text-[#0A0A0A] transition-all shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
                                  aria-label={`Add ${item.name} to order`}
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Cart Items Summary & Request input boxes */}
                    {cart.length > 0 && (
                      <div className={`p-4 rounded-xl border text-left space-y-4 ${isDarkMode ? 'bg-espresso-light/40 border-gold/10' : 'bg-cream-dark/50 border-gold-accent/20'}`}>
                        <h4 className="text-xs uppercase tracking-widest text-gold-accent font-semibold italic">
                          Order Customizations
                        </h4>
                        <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                          {cart.map((item) => (
                            <div key={item.name} className="space-y-1.5">
                              <div className="text-xs flex justify-between font-semibold">
                                <span className="opacity-90">{item.qty}x {item.name}</span>
                                <span>₹{item.price * item.qty}</span>
                              </div>
                              <input
                                type="text"
                                placeholder="Special instruction (e.g. Extra cheese, no onion)"
                                value={item.instruction}
                                onChange={(e) => updateInstruction(item.name, e.target.value)}
                                className={`w-full p-1.5 rounded text-[11px] focus:outline-none focus:border-gold/50 ${
                                  isDarkMode ? 'bg-espresso-dark border border-gold/10 text-cream' : 'bg-white border border-gold-accent/15 text-espresso'
                                }`}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Footer */}
              {!activeOrder && (
                <div className="p-6 border-t border-gold/10 space-y-4">
                  {cart.length > 0 && tableQR && (
                    <div className="space-y-4 text-left">
                      {/* Name fields */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase tracking-widest text-gold-accent block font-medium">Your Name</label>
                          <input
                            type="text"
                            placeholder="e.g. Rahul"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            className={`w-full p-2 rounded border text-xs focus:outline-none focus:border-gold ${
                              isDarkMode ? 'bg-espresso-dark border-gold/10 text-cream' : 'bg-white border-gold-accent/20 text-espresso'
                            }`}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase tracking-widest text-gold-accent block font-medium">Phone (Optional)</label>
                          <input
                            type="text"
                            placeholder="e.g. 9876543210"
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            className={`w-full p-2 rounded border text-xs focus:outline-none focus:border-gold ${
                              isDarkMode ? 'bg-espresso-dark border-gold/10 text-cream' : 'bg-white border-gold-accent/20 text-espresso'
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5 text-sm text-left">
                    <div className="flex justify-between opacity-70">
                      <span>Subtotal</span>
                      <span>₹{subtotal}</span>
                    </div>
                    <div className="flex justify-between opacity-70 text-xs">
                      <span>GST (18%) & service charges calculated at check out</span>
                    </div>
                    <div className="flex justify-between font-serif text-base text-gold-accent font-semibold pt-2 border-t border-gold/10">
                      <span>Estimated Subtotal</span>
                      <span>₹{subtotal}</span>
                    </div>
                  </div>

                  <button
                    onClick={handlePlaceOrder}
                    disabled={cart.length === 0 || !tableQR || isSubmitting}
                    className="w-full bg-gradient-to-r from-gold-dark to-gold hover:from-gold hover:to-gold-light text-[#0A0A0A] font-semibold py-3 rounded-lg text-xs uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Placing Order...' : tableQR ? 'Place Dine-In Order' : 'Scan Table QR to Order'}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}

      {/* --- INVOICE VIEW MODAL --- */}
      {invoiceOpen && invoice && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setInvoiceOpen(false)} />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`w-full max-w-sm rounded-2xl border p-6 relative z-10 font-mono text-xs shadow-2xl ${
              isDarkMode ? 'bg-espresso-dark border-gold/15 text-cream' : 'bg-white border-gold-accent/20 text-espresso'
            }`}
          >
            <button
              onClick={() => setInvoiceOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-gold/10"
            >
              <X className="w-4 h-4 text-gold-accent" />
            </button>

            <div className="text-center pb-4 border-b border-dashed border-gold/20 space-y-1">
              <h4 className="font-serif text-base text-gold-accent font-semibold tracking-wider italic">BON APPETITE</h4>
              <p className="text-[10px] opacity-60">Gourmet Cafe & Restro</p>
              <p className="text-[10px] opacity-60">INVOICE: <b>{invoice.order.invoice_number}</b></p>
              <p className="text-[9px] opacity-40">DATE: {new Date(invoice.order.verification_time).toLocaleString()}</p>
            </div>

            <div className="space-y-3 py-4 border-b border-dashed border-gold/20">
              <div className="flex justify-between text-[10px] opacity-60 font-sans">
                <span>Guest: {invoice.order.customer_name}</span>
                <span>Table: {invoice.order.table_number}</span>
              </div>
              <div className="space-y-1.5">
                {invoice.items.map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <span>{item.food_item} x{item.quantity}</span>
                    <span>₹{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 space-y-1.5 text-xs">
              <div className="flex justify-between opacity-70">
                <span>Subtotal</span>
                <span>₹{invoice.order.subtotal}</span>
              </div>
              <div className="flex justify-between opacity-70">
                <span>GST Tax</span>
                <span>₹{invoice.order.tax_amount}</span>
              </div>
              <div className="flex justify-between opacity-70">
                <span>Service Fee</span>
                <span>₹{invoice.order.service_charge}</span>
              </div>
              <div className="flex justify-between font-bold text-gold-accent text-sm pt-2 border-t border-dashed border-gold/20">
                <span>FINAL PAID</span>
                <span>₹{invoice.order.final_amount}</span>
              </div>
            </div>

            <div className="text-center space-y-1 pt-6">
              <div className="inline-flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded-full font-sans">
                <Check className="w-3.5 h-3.5" />
                <span>Transaction Approved</span>
              </div>
              <p className="text-[9px] opacity-40 pt-1 font-sans italic">
                Thank you for dining with elegance.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
