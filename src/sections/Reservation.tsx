import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, Users, Mail, Phone, User, CheckCircle, MessageSquare, List, ArrowLeft, Trash2, QrCode } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { Reservation as ReservationType, WaitingListEntry } from '../types';
import QRCode from 'qrcode';

export default function Reservation() {
  const { isDarkMode } = useTheme();

  // Booking Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    date: '',
    time: '',
    guests: 2,
    specialRequest: '',
  });

  // Flow control states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<ReservationType | null>(null);
  const [confirmedWaitingList, setConfirmedWaitingList] = useState<WaitingListEntry | null>(null);
  const [showWaitingListPrompt, setShowWaitingListPrompt] = useState(false);
  const [historyEmail, setHistoryEmail] = useState('');
  const [bookingHistory, setBookingHistory] = useState<ReservationType[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyMessage, setHistoryMessage] = useState('');

  // Canvas for QR Code
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Dynamic slot booking states
  const [slots, setSlots] = useState<{ slot: string; isAvailable: boolean; capacityLeft: number; occupiedCount: number }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Fetch slot availability from backend when date changes
  useEffect(() => {
    if (formData.date) {
      setLoadingSlots(true);
      api.getAvailableSlots(formData.date)
        .then((res) => {
          setSlots(res);
          // If previously selected slot is no longer available in the fresh list, clear it
          const isStillAvailable = res.find(s => s.slot === formData.time && s.isAvailable);
          if (!isStillAvailable) {
            setFormData(prev => ({ ...prev, time: '' }));
          }
        })
        .catch((err) => {
          console.error('Error loading slots availability:', err);
        })
        .finally(() => {
          setLoadingSlots(false);
        });
    } else {
      setSlots([]);
    }
  }, [formData.date]);

  // Generate QR Code once reservation is confirmed
  useEffect(() => {
    if (confirmedBooking && qrCanvasRef.current) {
      const qrData = JSON.stringify({
        id: confirmedBooking.id,
        token: confirmedBooking.verification_token || '', // Added secure token
        name: confirmedBooking.customer_name,
        date: confirmedBooking.reservation_date,
        time: confirmedBooking.reservation_time,
        guests: confirmedBooking.guests,
        table: confirmedBooking.table_number || 'Assigned on arrival',
      });
      QRCode.toCanvas(qrCanvasRef.current, qrData, {
        width: 140,
        margin: 1,
        color: {
          dark: '#D4AF37', // Gold
          light: isDarkMode ? '#0D0805' : '#FFFFFF',
        },
      }, (err) => {
        if (err) console.error('Error generating QR code', err);
      });
    }
  }, [confirmedBooking, isDarkMode]);

  // Main Booking Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone || !formData.date || !formData.time) {
      alert('Please fill out all fields.');
      return;
    }

    setIsSubmitting(true);
    setShowWaitingListPrompt(false);
    setConfirmedBooking(null);
    setConfirmedWaitingList(null);

    try {
      const response = await api.submitBooking({
        customer_name: formData.name,
        phone: formData.phone,
        email: formData.email,
        reservation_date: formData.date,
        reservation_time: formData.time,
        guests: formData.guests,
      });

      if (response.success && response.reservation) {
        setConfirmedBooking(response.reservation);
      } else if (response.code === 'NO_TABLES') {
        setShowWaitingListPrompt(true);
      } else {
        alert(response.message || 'An error occurred during reservation.');
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Server connection failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Join Waiting List Handler
  const handleJoinWaitingList = async () => {
    setIsSubmitting(true);
    try {
      const response = await api.joinWaitingList({
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        date: formData.date,
        time: formData.time,
        guests: formData.guests,
      });
      if (response.success && response.entry) {
        setConfirmedWaitingList(response.entry);
        setShowWaitingListPrompt(false);
      } else {
        alert('Could not join waiting list. Please try again.');
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Server connection failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Search History Handler
  const handleLoadHistory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!historyEmail) return;
    setHistoryLoading(true);
    setHistoryMessage('');
    try {
      const history = await api.getHistory(historyEmail);
      setBookingHistory(history);
      if (history.length === 0) {
        setHistoryMessage('No reservation history found for this email.');
      }
    } catch (err: any) {
      console.error(err);
      setHistoryMessage('Failed to load history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  // Cancel reservation Handler
  const handleCancelBooking = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this reservation?')) return;
    try {
      await api.cancelReservation(id);
      // Reload history
      const history = await api.getHistory(historyEmail);
      setBookingHistory(history);
      alert('Reservation successfully cancelled.');
    } catch (err: any) {
      console.error(err);
      alert('Failed to cancel reservation.');
    }
  };

  const handleReset = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      date: '',
      time: '',
      guests: 2,
      specialRequest: '',
    });
    setConfirmedBooking(null);
    setConfirmedWaitingList(null);
    setShowWaitingListPrompt(false);
  };

  return (
    <section
      id="reservation"
      className={`py-24 px-6 md:px-12 relative overflow-hidden transition-colors duration-500 ${
        isDarkMode ? 'bg-[#0D0805]' : 'bg-[#FAF7F2]'
      }`}
    >
      {/* Decorative vertical lines */}
      <div className="absolute top-0 left-0 w-[1px] h-full bg-gradient-to-b from-gold/20 via-transparent to-gold/20" />
      <div className="absolute top-0 right-0 w-[1px] h-full bg-gradient-to-b from-gold/20 via-transparent to-gold/20" />

      <div className="max-w-4xl mx-auto space-y-12">
        {/* Title */}
        <div className="text-center space-y-3">
          <span className="text-[10px] tracking-[0.4em] uppercase text-gold-accent font-semibold block">
            Exclusive Seating
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl text-gold-accent tracking-wide">
            Book Your Experience
          </h2>
          <div className="h-[1px] w-28 bg-gold/40 mx-auto" />
          <p className="text-xs opacity-75 max-w-md mx-auto leading-relaxed font-light">
            Secure your table for a 5-star culinary trip. You can also view and manage your reservation history.
          </p>
        </div>

        {/* Action Toggle (Reserve vs History) */}
        <div className="flex justify-center gap-4">
          <button
            onClick={() => { setShowHistory(false); handleReset(); }}
            className={`px-6 py-2 rounded-full text-xs font-semibold tracking-wider uppercase border transition-all ${
              !showHistory
                ? 'bg-gold-accent text-[#0A0A0A] border-gold-accent'
                : 'bg-transparent text-gold-accent border-gold-accent/30 hover:border-gold-accent'
            }`}
          >
            Reservation Form
          </button>
          <button
            onClick={() => { setShowHistory(true); setBookingHistory([]); setHistoryEmail(''); }}
            className={`px-6 py-2 rounded-full text-xs font-semibold tracking-wider uppercase border transition-all ${
              showHistory
                ? 'bg-gold-accent text-[#0A0A0A] border-gold-accent'
                : 'bg-transparent text-gold-accent border-gold-accent/30 hover:border-gold-accent'
            }`}
          >
            Booking History
          </button>
        </div>

        {/* Booking Card Container */}
        <motion.div
          className={`p-8 rounded-2xl border relative overflow-hidden box-gold-glow ${
            isDarkMode
              ? 'bg-[#150D0A]/70 border-gold/15'
              : 'bg-white border-gold-accent/25 shadow-xl'
          }`}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.8 }}
        >
          {/* Subtle Ambient Background Flare */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-gold/5 rounded-full blur-3xl pointer-events-none" />

          {!showHistory ? (
            // ==========================================
            // RESERVATION AND WAITING LIST FORMS
            // ==========================================
            <AnimatePresence mode="wait">
              {/* 1. INITIAL FORM */}
              {!confirmedBooking && !confirmedWaitingList && !showWaitingListPrompt && (
                <motion.form
                  key="booking-form"
                  onSubmit={handleSubmit}
                  className="space-y-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Name */}
                    <div className="relative text-left">
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-2 opacity-80">
                        Full Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gold-accent/65" />
                        <input
                          type="text"
                          required
                          placeholder="Dwarkesh Rana"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className={`w-full pl-10 pr-4 py-3 rounded-lg border text-sm focus:outline-none focus:ring-1 focus:ring-gold transition-all ${
                            isDarkMode
                              ? 'bg-[#0D0805] border-gold/15 text-cream placeholder-cream/30'
                              : 'bg-white border-gold-accent/20 text-espresso placeholder-espresso/35'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div className="relative text-left">
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-2 opacity-80">
                        Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gold-accent/65" />
                        <input
                          type="email"
                          required
                          placeholder="dwarkesh@example.com"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className={`w-full pl-10 pr-4 py-3 rounded-lg border text-sm focus:outline-none focus:ring-1 focus:ring-gold transition-all ${
                            isDarkMode
                              ? 'bg-[#0D0805] border-gold/15 text-cream placeholder-cream/30'
                              : 'bg-white border-gold-accent/20 text-espresso placeholder-espresso/35'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Phone */}
                    <div className="relative text-left">
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-2 opacity-80">
                        Phone Number
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gold-accent/65" />
                        <input
                          type="tel"
                          required
                          placeholder="+91 98765 43210"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className={`w-full pl-10 pr-4 py-3 rounded-lg border text-sm focus:outline-none focus:ring-1 focus:ring-gold transition-all ${
                            isDarkMode
                              ? 'bg-[#0D0805] border-gold/15 text-cream placeholder-cream/30'
                              : 'bg-white border-gold-accent/20 text-espresso placeholder-espresso/35'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Date */}
                    <div className="relative text-left">
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-2 opacity-80">
                        Select Date
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gold-accent/65 pointer-events-none" />
                        <input
                          type="date"
                          required
                          min={new Date().toISOString().split('T')[0]}
                          value={formData.date}
                          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                          className={`w-full pl-10 pr-3 py-3 rounded-lg border text-sm focus:outline-none focus:ring-1 focus:ring-gold transition-all appearance-none cursor-pointer ${
                            isDarkMode
                              ? 'bg-[#0D0805] border-gold/15 text-cream scheme-dark'
                              : 'bg-white border-gold-accent/20 text-espresso scheme-light'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Time */}
                    <div className="relative text-left">
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-2 opacity-80">
                        Preferred Time
                      </label>
                      <div className="relative">
                        <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gold-accent/65 pointer-events-none" />
                        <select
                          value={formData.time}
                          required
                          disabled={loadingSlots || !formData.date}
                          onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                          className={`w-full pl-10 pr-3 py-3 rounded-lg border text-sm focus:outline-none focus:ring-1 focus:ring-gold transition-all cursor-pointer appearance-none ${
                            isDarkMode
                              ? 'bg-[#0D0805] border-gold/15 text-cream'
                              : 'bg-white border-gold-accent/20 text-espresso'
                          }`}
                        >
                          <option value="">
                            {loadingSlots ? 'Loading Slots...' : !formData.date ? 'Select Date First' : 'Select Time'}
                          </option>
                          {slots.map(s => (
                            <option key={s.slot} value={s.slot} disabled={!s.isAvailable}>
                              {s.slot} {!s.isAvailable ? '(Fully Booked / Past)' : `(${s.capacityLeft} seats left)`}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Guests */}
                    <div className="relative text-left">
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-2 opacity-80">
                        Number of Guests
                      </label>
                      <div className="relative">
                        <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gold-accent/65 pointer-events-none" />
                        <select
                          value={formData.guests}
                          onChange={(e) => setFormData({ ...formData, guests: parseInt(e.target.value) })}
                          className={`w-full pl-10 pr-3 py-3 rounded-lg border text-sm focus:outline-none focus:ring-1 focus:ring-gold transition-all cursor-pointer appearance-none ${
                            isDarkMode
                              ? 'bg-[#0D0805] border-gold/15 text-cream'
                              : 'bg-white border-gold-accent/20 text-espresso'
                          }`}
                        >
                          <option value="1">1 Guest</option>
                          <option value="2">2 Guests</option>
                          <option value="3">3 Guests</option>
                          <option value="4">4 Guests</option>
                          <option value="5">5 Guests</option>
                          <option value="6">6 Guests</option>
                          <option value="7">7 Guests</option>
                          <option value="8">8 Guests</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Special Request */}
                  <div className="relative text-left">
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-2 opacity-80">
                      Special Request
                    </label>
                    <div className="relative">
                      <MessageSquare className="absolute left-3.5 top-3 w-4 h-4 text-gold-accent/65" />
                      <textarea
                        rows={3}
                        placeholder="Allergies, table preferences, anniversaries..."
                        value={formData.specialRequest}
                        onChange={(e) => setFormData({ ...formData, specialRequest: e.target.value })}
                        className={`w-full pl-10 pr-4 py-3 rounded-lg border text-sm focus:outline-none focus:ring-1 focus:ring-gold transition-all ${
                          isDarkMode
                            ? 'bg-[#0D0805] border-gold/15 text-cream placeholder-cream/30'
                            : 'bg-white border-gold-accent/20 text-espresso placeholder-espresso/35'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Submit Action */}
                  <div className="text-center pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-10 py-4 bg-gradient-to-r from-gold-dark via-gold to-gold-accent hover:from-gold hover:to-gold-light text-[#0A0A0A] font-semibold text-xs uppercase tracking-widest rounded-full transition-all duration-300 shadow-md hover:shadow-gold/15 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 interactive-hover"
                    >
                      {isSubmitting ? 'Requesting Table...' : 'Reserve Your Experience'}
                    </button>
                  </div>
                </motion.form>
              )}

              {/* 2. NO TABLES AVAILABLE: WAITING LIST PROMPT */}
              {showWaitingListPrompt && (
                <motion.div
                  key="waiting-list-prompt"
                  className="text-center py-6 space-y-6"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="inline-flex p-3 rounded-full bg-gold/10 text-gold mb-2">
                    <List className="w-12 h-12" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-serif text-2xl text-gold-accent tracking-wide italic">No Tables Available</h4>
                    <p className="text-sm opacity-80 max-w-sm mx-auto leading-relaxed font-light">
                      We have reached maximum capacity for this specific date and time slot. Would you like to join our waiting list?
                    </p>
                  </div>
                  <div className="flex justify-center gap-4 pt-2">
                    <button
                      onClick={handleReset}
                      className="px-6 py-2.5 rounded-full border border-gold/30 hover:border-gold hover:text-gold text-gold-accent text-xs uppercase tracking-widest transition-colors duration-300"
                    >
                      Change Details
                    </button>
                    <button
                      onClick={handleJoinWaitingList}
                      disabled={isSubmitting}
                      className="px-6 py-2.5 bg-gold-accent text-[#0A0A0A] text-xs uppercase tracking-widest font-semibold rounded-full hover:bg-gold-light transition-colors duration-300"
                    >
                      {isSubmitting ? 'Adding...' : 'Join Waiting List'}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* 3. CONFIRMED RESERVATION TICKET */}
              {confirmedBooking && (
                <motion.div
                  key="confirmed-booking"
                  className="text-center py-6 space-y-6"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="inline-flex p-3 rounded-full bg-gold/10 text-gold mb-2">
                    <CheckCircle className="w-12 h-12 animate-pulse" />
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-serif text-2xl text-gold-accent tracking-wide">
                      Reservation Confirmed
                    </h4>
                    <p className="text-sm opacity-80 max-w-sm mx-auto font-light italic">
                      Bon Appetite Cafe and Restro
                    </p>
                  </div>

                  {/* Ticketing Card */}
                  <div
                    className={`max-w-md mx-auto p-6 rounded-xl border text-left grid grid-cols-1 md:grid-cols-3 gap-6 relative overflow-hidden box-gold-glow ${
                      isDarkMode
                        ? 'bg-[#0D0805] border-gold/15'
                        : 'bg-[#FAF7F2] border-gold-accent/40 shadow-sm'
                    }`}
                  >
                    <div className="absolute top-1/2 -left-3 w-6 h-6 rounded-full bg-[#0A0A0A] border-r border-gold/15 -translate-y-1/2" />
                    <div className="absolute top-1/2 -right-3 w-6 h-6 rounded-full bg-[#0A0A0A] border-l border-gold/15 -translate-y-1/2" />

                    {/* QR Code Section */}
                    <div className="flex flex-col items-center justify-center p-2 border-r border-dashed border-gold/20 md:col-span-1">
                      <canvas ref={qrCanvasRef} className="rounded-lg shadow-md border border-gold/20 bg-white p-1" />
                      <span className="text-[9px] opacity-40 uppercase tracking-widest mt-2 font-mono flex items-center gap-1">
                        <QrCode className="w-2.5 h-2.5" /> Scan Ticket
                      </span>
                    </div>

                    {/* Booking Details */}
                    <div className="space-y-4 md:col-span-2 flex flex-col justify-center">
                      <div className="border-b border-dashed border-gold/20 pb-2">
                        <p className="text-xs font-serif uppercase tracking-widest text-gold-accent">INVITATION PASS</p>
                        <p className="text-sm font-bold font-mono text-gold-accent">ID: {confirmedBooking.id}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-x-2 gap-y-3 text-xs pt-1">
                        <div>
                          <span className="block opacity-50 uppercase text-[9px] tracking-wider">Guest</span>
                          <strong className="text-cream-light font-medium truncate block">{confirmedBooking.customer_name}</strong>
                        </div>
                        <div>
                          <span className="block opacity-50 uppercase text-[9px] tracking-wider">Table(s)</span>
                          <strong className="text-gold block">{confirmedBooking.table_number || 'Assigned'}</strong>
                        </div>
                        <div>
                          <span className="block opacity-50 uppercase text-[9px] tracking-wider">Date</span>
                          <strong>{confirmedBooking.reservation_date}</strong>
                        </div>
                        <div>
                          <span className="block opacity-50 uppercase text-[9px] tracking-wider">Time</span>
                          <strong>{confirmedBooking.reservation_time}</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={handleReset}
                      className="px-8 py-2.5 bg-transparent border border-gold/30 hover:border-gold hover:text-gold text-gold-accent text-xs uppercase tracking-widest rounded-full transition-colors duration-300"
                    >
                      Book Another Table
                    </button>
                  </div>
                </motion.div>
              )}

              {/* 4. WAITING LIST CONFIRMED TICKET */}
              {confirmedWaitingList && (
                <motion.div
                  key="confirmed-waiting-list"
                  className="text-center py-6 space-y-6"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="inline-flex p-3 rounded-full bg-gold/10 text-gold mb-2">
                    <CheckCircle className="w-12 h-12" />
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-serif text-2xl text-gold-accent tracking-wide italic">Waiting List Joined</h4>
                    <p className="text-sm opacity-80 max-w-sm mx-auto font-light">
                      We will notify you immediately if a table opens up for your slot.
                    </p>
                  </div>

                  {/* Ticketing Card */}
                  <div
                    className={`max-w-xs mx-auto p-5 rounded-xl border text-left space-y-3 relative overflow-hidden box-gold-glow ${
                      isDarkMode
                        ? 'bg-[#0D0805] border-gold/15'
                        : 'bg-[#FAF7F2] border-gold-accent/40 shadow-sm'
                    }`}
                  >
                    <div className="text-center pb-2 border-b border-dashed border-gold/20">
                      <p className="text-xs font-serif uppercase tracking-widest text-gold-accent">WAITING LIST PASS</p>
                      <p className="text-[10px] opacity-50 font-light mt-0.5">ID: {confirmedWaitingList.id}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                      <div>
                        <span className="block opacity-50 uppercase text-[9px] tracking-wider">Guest</span>
                        <strong className="text-gold-accent">{confirmedWaitingList.name}</strong>
                      </div>
                      <div>
                        <span className="block opacity-50 uppercase text-[9px] tracking-wider">Size</span>
                        <strong>{confirmedWaitingList.guests} Guests</strong>
                      </div>
                      <div>
                        <span className="block opacity-50 uppercase text-[9px] tracking-wider">Date</span>
                        <strong>{confirmedWaitingList.date}</strong>
                      </div>
                      <div>
                        <span className="block opacity-50 uppercase text-[9px] tracking-wider">Time Slot</span>
                        <strong>{confirmedWaitingList.time}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={handleReset}
                      className="px-8 py-2.5 bg-transparent border border-gold/30 hover:border-gold hover:text-gold text-gold-accent text-xs uppercase tracking-widest rounded-full transition-colors duration-300"
                    >
                      Done
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          ) : (
            // ==========================================
            // CUSTOMER BOOKING HISTORY & CANCELLATION
            // ==========================================
            <div className="space-y-6">
              <div className="text-left max-w-md mx-auto">
                <form onSubmit={handleLoadHistory} className="space-y-4">
                  <label className="block text-xs font-semibold uppercase tracking-wider opacity-85">
                    Look up Email Address
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      required
                      placeholder="dwarkesh@example.com"
                      value={historyEmail}
                      onChange={(e) => setHistoryEmail(e.target.value)}
                      className={`flex-1 px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-1 focus:ring-gold ${
                        isDarkMode
                          ? 'bg-[#0D0805] border-gold/15 text-cream'
                          : 'bg-white border-gold-accent/20 text-espresso'
                      }`}
                    />
                    <button
                      type="submit"
                      disabled={historyLoading}
                      className="bg-gold-accent hover:bg-gold-light text-[#0A0A0A] font-semibold px-6 py-2 rounded-lg text-xs uppercase tracking-widest transition-colors duration-300"
                    >
                      {historyLoading ? 'Loading...' : 'Find'}
                    </button>
                  </div>
                </form>
                {historyMessage && (
                  <p className="text-xs text-red-400 mt-2 italic">{historyMessage}</p>
                )}
              </div>

              {/* History List */}
              {bookingHistory.length > 0 && (
                <div className="space-y-4 text-left max-w-2xl mx-auto pt-4 border-t border-gold/10">
                  <h4 className="text-xs uppercase tracking-wider text-gold-accent font-semibold italic">
                    Active & Past Reservations ({bookingHistory.length})
                  </h4>
                  <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
                    {bookingHistory.map((booking) => (
                      <div
                        key={booking.id}
                        className={`p-4 rounded-xl border flex justify-between items-center ${
                          isDarkMode
                            ? 'bg-[#0D0805]/50 border-gold/10'
                            : 'bg-[#FAF7F2]/50 border-gold-accent/15'
                        }`}
                      >
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gold-accent">{booking.id}</span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-semibold ${
                                booking.status === 'confirmed'
                                  ? 'bg-green-500/10 text-green-400'
                                  : booking.status === 'pending'
                                  ? 'bg-yellow-500/10 text-yellow-400'
                                  : booking.status === 'cancelled'
                                  ? 'bg-red-500/10 text-red-400'
                                  : 'bg-gray-500/10 text-gray-400'
                              }`}
                            >
                              {booking.status}
                            </span>
                          </div>
                          <p className="opacity-75">
                            {booking.reservation_date} at <strong>{booking.reservation_time}</strong> &bull; {booking.guests} Guests
                          </p>
                          {booking.table_number && (
                            <p className="text-gold-accent">
                              Table: <strong>{booking.table_number}</strong>
                            </p>
                          )}
                        </div>

                        {/* Cancel Action */}
                        {(booking.status === 'confirmed' || booking.status === 'pending') && (
                          <button
                            onClick={() => handleCancelBooking(booking.id)}
                            className="p-2 rounded-lg border border-red-500/20 hover:bg-red-500/10 text-red-400 transition-all flex items-center gap-1.5 text-xs font-semibold"
                            title="Cancel Reservation"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Cancel</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
