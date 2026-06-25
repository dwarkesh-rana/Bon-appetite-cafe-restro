import React, { useState } from 'react';
import { MapPin, Phone, Mail, Clock, Send, CheckCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Contact() {
  const { isDarkMode } = useTheme();
  const [emailInput, setEmailInput] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!emailInput) return;
    setSubscribed(true);
  };

  return (
    <section
      id="contact"
      className={`py-24 px-6 md:px-12 relative overflow-hidden transition-colors duration-500 ${
        isDarkMode ? 'bg-[#0D0805]' : 'bg-[#FAF7F2]'
      }`}
    >
      {/* Decorative vertical lines */}
      <div className="absolute top-0 left-0 w-[1px] h-full bg-gradient-to-b from-gold/20 via-transparent to-gold/20" />
      <div className="absolute top-0 right-0 w-[1px] h-full bg-gradient-to-b from-gold/20 via-transparent to-gold/20" />

      <div className="max-w-7xl mx-auto space-y-16">
        {/* Section Header */}
        <div className="text-center space-y-3">
          <span className="text-[10px] tracking-[0.4em] uppercase text-gold-accent font-semibold block">
            Location & Concierge
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl text-gold-accent tracking-wide">
            Connect With Us
          </h2>
          <div className="h-[1px] w-28 bg-gold/40 mx-auto" />
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-stretch">
          {/* Left Column: Contact Cards */}
          <div className="space-y-8 flex flex-col justify-between">
            {/* Details Panel */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left">
              {/* Address */}
              <div className={`p-5 rounded-xl border ${isDarkMode ? 'bg-espresso/20 border-gold/10' : 'bg-white border-gold-accent/20 shadow-sm'}`}>
                <MapPin className="w-5 h-5 text-gold-accent mb-3" />
                <h4 className="font-serif text-base text-gold-accent font-semibold">Our Salon</h4>
                <p className="text-xs opacity-75 font-light mt-1.5 leading-relaxed">
                  45 Boutique Avenue,<br /> Mayfair, London, W1S 2YA
                </p>
              </div>

              {/* Opening Hours */}
              <div className={`p-5 rounded-xl border ${isDarkMode ? 'bg-espresso/20 border-gold/10' : 'bg-white border-gold-accent/20 shadow-sm'}`}>
                <Clock className="w-5 h-5 text-gold-accent mb-3" />
                <h4 className="font-serif text-base text-gold-accent font-semibold">Opening Hours</h4>
                <p className="text-xs opacity-75 font-light mt-1.5 leading-relaxed">
                  Mon – Fri: 08:00 AM – 11:00 PM<br />
                  Sat – Sun: 09:00 AM – midnight
                </p>
              </div>

              {/* Phone */}
              <div className={`p-5 rounded-xl border ${isDarkMode ? 'bg-espresso/20 border-gold/10' : 'bg-white border-gold-accent/20 shadow-sm'}`}>
                <Phone className="w-5 h-5 text-gold-accent mb-3" />
                <h4 className="font-serif text-base text-gold-accent font-semibold">Telephone</h4>
                <p className="text-xs opacity-75 font-light mt-1.5 leading-relaxed">
                  Direct: +44 (0) 20 7946 0958<br />
                  Concierge: +44 (0) 20 7946 0959
                </p>
              </div>

              {/* Email */}
              <div className={`p-5 rounded-xl border ${isDarkMode ? 'bg-espresso/20 border-gold/10' : 'bg-white border-gold-accent/20 shadow-sm'}`}>
                <Mail className="w-5 h-5 text-gold-accent mb-3" />
                <h4 className="font-serif text-base text-gold-accent font-semibold">Electronic Mail</h4>
                <p className="text-xs opacity-75 font-light mt-1.5 leading-relaxed">
                  concierge@bonappetite.com<br />
                  events@bonappetite.com
                </p>
              </div>
            </div>

            {/* Newsletter Subscription */}
            <div className={`p-6 rounded-xl border text-left ${isDarkMode ? 'bg-espresso/25 border-gold/15' : 'bg-cream-dark/40 border-gold-accent/20 shadow-sm'}`}>
              <h4 className="font-serif text-lg text-gold-accent font-semibold mb-2">
                Join the Epicurean Club
              </h4>
              <p className="text-xs opacity-70 font-light mb-4 leading-relaxed">
                Subscribe to receive private invitations to gourmet tasting sessions, chef table events, and VIP reservation privileges.
              </p>

              {!subscribed ? (
                <form onSubmit={handleSubscribe} className="flex gap-2">
                  <input
                    type="email"
                    required
                    placeholder="dwarkesh@example.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className={`flex-1 px-4 py-2 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-gold transition-all ${
                      isDarkMode
                        ? 'bg-[#0D0805] border-gold/15 text-cream placeholder-cream/35'
                        : 'bg-white border-gold-accent/25 text-espresso placeholder-espresso/35'
                    }`}
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gold hover:bg-gold-light text-[#0A0A0A] font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 shrink-0 interactive-hover"
                  >
                    Subscribe
                    <Send className="w-3 h-3" />
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-2 text-gold-accent text-xs font-semibold">
                  <CheckCircle className="w-4 h-4" />
                  <span>Thank you. Your private luxury invitation will arrive shortly.</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Google Map Placeholder (Luxurious Mock Styling) */}
          <div className="relative rounded-2xl overflow-hidden border border-gold/25 box-gold-glow flex flex-col justify-center items-center min-h-[350px] bg-black">
            {/* Mock Google Map Canvas */}
            <div className="absolute inset-0 z-0 opacity-45 bg-[radial-gradient(#1c120e_1px,transparent_1px)] [background-size:16px_16px]" />
            
            {/* Stylized map layout shapes */}
            <div className="absolute top-[20%] left-[30%] w-48 h-2 bg-gold/10 rounded-full rotate-12" />
            <div className="absolute top-[40%] left-[10%] w-64 h-2.5 bg-gold/10 rounded-full -rotate-45" />
            <div className="absolute top-[60%] left-[50%] w-56 h-1.5 bg-gold/10 rounded-full -rotate-6" />

            {/* Glowing Map pin */}
            <div className="relative z-10 flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gold/15 border border-gold/40 flex items-center justify-center animate-bounce shadow-lg">
                <MapPin className="w-6 h-6 text-gold" />
              </div>
              <div className="text-center p-3 rounded-lg border border-gold/30 bg-[#0D0805]/95 backdrop-blur-md max-w-xs shadow-xl">
                <h5 className="font-serif text-xs text-gold-accent font-semibold tracking-wide">
                  Bon Appetite Cafe & Restro
                </h5>
                <p className="text-[9px] opacity-70 mt-1">
                  45 Boutique Ave, Mayfair, London
                </p>
                <a
                  href="https://maps.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[9px] text-gold hover:text-gold-light underline block mt-2 font-semibold tracking-wider uppercase interactive-hover"
                >
                  Get Route Directions
                </a>
              </div>
            </div>

            {/* Social Icons Float */}
            <div className="absolute bottom-6 flex gap-4 z-10">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-full border border-gold/35 hover:border-gold text-gold-accent hover:text-gold flex items-center justify-center bg-black/50 transition-colors interactive-hover"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-full border border-gold/35 hover:border-gold text-gold-accent hover:text-gold flex items-center justify-center bg-black/50 transition-colors interactive-hover"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-full border border-gold/35 hover:border-gold text-gold-accent hover:text-gold flex items-center justify-center bg-black/50 transition-colors interactive-hover"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
