import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, ArrowUp } from 'lucide-react';

export default function FloatingActions() {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleWhatsAppClick = () => {
    const msg = encodeURIComponent("Hello Bon Appetite Cafe & Restro, I would like to inquire about reservation/gourmet catering.");
    window.open(`https://wa.me/919876543210?text=${msg}`, '_blank');
  };

  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-40">
      {/* WhatsApp Action Button with Gold Glowing Halo */}
      <motion.button
        onClick={handleWhatsAppClick}
        className="w-12 h-12 bg-gradient-to-tr from-[#128C7E] to-[#25D366] text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-[#25D366]/40 transition-all duration-300 relative group interactive-hover"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <span className="absolute inset-0 rounded-full bg-[#25D366] opacity-35 blur-md group-hover:scale-125 transition-transform duration-300 pointer-events-none" />
        {/* We can use standard Lucide icon or customize */}
        <MessageSquare className="w-5 h-5 relative z-10" />
        
        {/* Tooltip */}
        <span className="absolute right-14 top-1/2 -translate-y-1/2 scale-0 group-hover:scale-100 bg-[#0D0805] text-[#FAF7F2] border border-[#D4AF37]/30 text-[10px] uppercase tracking-widest py-1.5 px-3.5 rounded-lg whitespace-nowrap transition-transform duration-300 origin-right">
          Chat With Concierge
        </span>
      </motion.button>

      {/* Scroll to Top */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            onClick={scrollToTop}
            className="w-12 h-12 glassmorphism hover:bg-gold/15 text-gold-accent rounded-full flex items-center justify-center shadow-lg transition-colors border border-gold/30 interactive-hover"
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.8 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowUp className="w-4 h-4" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
