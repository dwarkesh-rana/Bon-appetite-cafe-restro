import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, Users, Phone, Mail, User, CheckCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function TableBooking({ isOpen, onClose }) {
  const { isDarkMode } = useTheme();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    date: '',
    time: '',
    guests: '2 Guests',
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone || !formData.date || !formData.time) {
      alert('Please fill out all fields.');
      return;
    }
    // Simulate booking submission
    setIsSubmitted(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      date: '',
      time: '',
      guests: '2 Guests',
    });
    setIsSubmitted(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal Container */}
          <motion.div
            className={`relative w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl border ${
              isDarkMode 
                ? 'bg-espresso-dark border-gold/20 text-cream' 
                : 'bg-cream border-gold-accent/30 text-espresso'
            }`}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
          >
            {/* Ambient Background Glow */}
            <div className="absolute top-0 left-0 right-0 h-[100px] bg-gradient-to-b from-gold/5 to-transparent pointer-events-none" />

            {/* Header */}
            <div className="relative flex justify-between items-center p-6 border-b border-gold/10">
              <div>
                <h3 className="font-serif text-2xl tracking-wide text-gold-accent">
                  {isSubmitted ? 'Your Golden Reservation' : 'Reserve a Table'}
                </h3>
                <p className="text-xs text-gold-dark/60 tracking-wider uppercase mt-1">
                  {isSubmitted ? 'Confirmed Experience' : 'Bon Appetite Cafe & Restro'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-full hover:bg-gold/10 transition-colors group interactive-hover"
              >
                <X className="w-5 h-5 text-gold-accent group-hover:rotate-90 transition-transform duration-300" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 relative">
              {!isSubmitted ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Name Input */}
                  <div className="relative">
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gold-accent/60" />
                      <input
                        type="text"
                        required
                        placeholder="Dwarkesh Rana"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className={`w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-1 focus:ring-gold transition-all ${
                          isDarkMode
                            ? 'bg-[#120A07] border-gold/15 text-cream placeholder-cream/30'
                            : 'bg-white border-gold-accent/30 text-espresso placeholder-espresso/30'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Contact Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gold-accent/60" />
                        <input
                          type="email"
                          required
                          placeholder="dwarkesh@example.com"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className={`w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-1 focus:ring-gold transition-all ${
                            isDarkMode
                              ? 'bg-[#120A07] border-gold/15 text-cream placeholder-cream/30'
                              : 'bg-white border-gold-accent/30 text-espresso placeholder-espresso/30'
                          }`}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                        Phone Number
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gold-accent/60" />
                        <input
                          type="tel"
                          required
                          placeholder="+91 98765 43210"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className={`w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-1 focus:ring-gold transition-all ${
                            isDarkMode
                              ? 'bg-[#120A07] border-gold/15 text-cream placeholder-cream/30'
                              : 'bg-white border-gold-accent/30 text-espresso placeholder-espresso/30'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Details Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                        Date
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gold-accent/60 pointer-events-none" />
                        <input
                          type="date"
                          required
                          value={formData.date}
                          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                          className={`w-full pl-10 pr-3 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-1 focus:ring-gold transition-all appearance-none cursor-pointer ${
                            isDarkMode
                              ? 'bg-[#120A07] border-gold/15 text-cream scheme-dark'
                              : 'bg-white border-gold-accent/30 text-espresso scheme-light'
                          }`}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                        Time Slot
                      </label>
                      <div className="relative">
                        <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gold-accent/60 pointer-events-none" />
                        <select
                          value={formData.time}
                          required
                          onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                          className={`w-full pl-10 pr-3 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-1 focus:ring-gold transition-all cursor-pointer appearance-none ${
                            isDarkMode
                              ? 'bg-[#120A07] border-gold/15 text-cream'
                              : 'bg-white border-gold-accent/30 text-espresso'
                          }`}
                        >
                          <option value="">Select Time</option>
                          <option value="09:00 AM">09:00 AM (Breakfast)</option>
                          <option value="11:00 AM">11:00 AM (Brunch)</option>
                          <option value="01:00 PM">01:00 PM (Lunch)</option>
                          <option value="03:00 PM">03:00 PM (Tea Time)</option>
                          <option value="06:30 PM">06:30 PM (Dinner)</option>
                          <option value="08:30 PM">08:30 PM (Dinner)</option>
                          <option value="10:00 PM">10:00 PM (Late Dining)</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                        Guests
                      </label>
                      <div className="relative">
                        <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gold-accent/60 pointer-events-none" />
                        <select
                          value={formData.guests}
                          onChange={(e) => setFormData({ ...formData, guests: e.target.value })}
                          className={`w-full pl-10 pr-3 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-1 focus:ring-gold transition-all cursor-pointer appearance-none ${
                            isDarkMode
                              ? 'bg-[#120A07] border-gold/15 text-cream'
                              : 'bg-white border-gold-accent/30 text-espresso'
                          }`}
                        >
                          <option value="1 Guest">1 Guest</option>
                          <option value="2 Guests">2 Guests</option>
                          <option value="3 Guests">3 Guests</option>
                          <option value="4 Guests">4 Guests</option>
                          <option value="5 Guests">5 Guests</option>
                          <option value="6+ Guests">6+ Guests (VIP Room)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Luxury Disclaimer */}
                  <p className="text-[10px] text-center text-gold-accent/60 tracking-wide font-light pt-2">
                    * Elegant dress code suggested. Smart casual minimum. Table held for 15 minutes.
                  </p>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    className="w-full mt-4 bg-gradient-to-r from-gold-dark via-gold to-gold-accent hover:from-gold hover:to-gold-light text-[#0A0A0A] font-medium py-3 rounded-lg text-sm uppercase tracking-widest transition-all duration-300 shadow-md hover:shadow-gold/20 hover:scale-[1.01] active:scale-[0.99] interactive-hover"
                  >
                    Reserve Your Experience
                  </button>
                </form>
              ) : (
                <div className="text-center py-6 space-y-6">
                  {/* Golden Ticket Confirmation */}
                  <motion.div
                    className="inline-flex p-3 rounded-full bg-gold/10 text-gold mb-2"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1, rotate: 360 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                  >
                    <CheckCircle className="w-12 h-12" />
                  </motion.div>

                  <div className="space-y-2">
                    <h4 className="font-serif text-2xl text-gold-accent tracking-wide">
                      Reservation Confirmed
                    </h4>
                    <p className="text-sm opacity-80 max-w-sm mx-auto">
                      A confirmation email and SMS containing your 5-star invitation has been sent to you.
                    </p>
                  </div>

                  {/* Luxury Ticket Card Details */}
                  <motion.div
                    className={`max-w-xs mx-auto p-5 rounded-xl border text-left space-y-3 relative overflow-hidden box-gold-glow ${
                      isDarkMode
                        ? 'bg-espresso-light/40 border-gold/20'
                        : 'bg-[#FAF7F2] border-gold-accent/40 shadow-sm'
                    }`}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    {/* Decorative Sideways Holes for Ticket Look */}
                    <div className="absolute top-1/2 -left-3 w-6 h-6 rounded-full bg-[#0A0A0A] border-r border-gold/20 -translate-y-1/2" />
                    <div className="absolute top-1/2 -right-3 w-6 h-6 rounded-full bg-[#0A0A0A] border-l border-gold/20 -translate-y-1/2" />

                    <div className="text-center pb-2 border-b border-dashed border-gold/20">
                      <p className="text-xs font-serif uppercase tracking-widest text-gold-accent">
                        INVITATION PASS
                      </p>
                      <p className="text-[10px] opacity-50 font-light mt-0.5">
                        NO. BA-{Math.floor(100000 + Math.random() * 900000)}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                      <div>
                        <span className="block opacity-50 uppercase text-[9px] tracking-wider">Guest</span>
                        <strong className="text-gold-accent">{formData.name}</strong>
                      </div>
                      <div>
                        <span className="block opacity-50 uppercase text-[9px] tracking-wider">Table For</span>
                        <strong>{formData.guests}</strong>
                      </div>
                      <div>
                        <span className="block opacity-50 uppercase text-[9px] tracking-wider">Date</span>
                        <strong>{formData.date}</strong>
                      </div>
                      <div>
                        <span className="block opacity-50 uppercase text-[9px] tracking-wider">Time</span>
                        <strong>{formData.time}</strong>
                      </div>
                    </div>
                  </motion.div>

                  <button
                    onClick={resetForm}
                    className="bg-transparent border border-gold/30 hover:border-gold hover:text-gold text-gold-accent text-xs uppercase tracking-widest py-2 px-6 rounded-full transition-colors duration-300 interactive-hover"
                  >
                    Close & Return
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
