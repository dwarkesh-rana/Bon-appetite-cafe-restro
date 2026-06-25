import React from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, Calendar, ArrowRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Hero({ onOpenBooking }) {
  const { isDarkMode } = useTheme();

  // Floating particles container variants
  const particleContainerVariants = {
    animate: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const handleScrollToMenu = (e) => {
    e.preventDefault();
    const target = document.querySelector('#menu');
    if (target) {
      const offset = 80;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = target.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  return (
    <section
      id="home"
      className="relative h-screen w-full flex items-center justify-center overflow-hidden bg-black"
    >
      {/* Background Panning / Slow Zoom Image */}
      <div className="absolute inset-0 z-0">
        <motion.img
          src="/hero_bg.png"
          alt="Luxury Restaurant Background"
          className="w-full h-full object-cover"
          initial={{ scale: 1.05 }}
          animate={{ 
            scale: 1.12,
            x: [0, -5, 5, 0],
            y: [0, 5, -5, 0]
          }}
          transition={{
            scale: { duration: 30, repeat: Infinity, repeatType: 'reverse', ease: 'linear' },
            x: { duration: 45, repeat: Infinity, repeatType: 'reverse', ease: 'linear' },
            y: { duration: 45, repeat: Infinity, repeatType: 'reverse', ease: 'linear' },
          }}
        />
        {/* Cinematic dark overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/85 z-10" />
      </div>

      {/* Floating Gold Particles (Canvas-like CSS effect) */}
      <motion.div 
        className="absolute inset-0 pointer-events-none z-10"
        variants={particleContainerVariants}
        animate="animate"
      >
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-gold/30"
            style={{
              width: Math.random() * 4 + 2 + 'px',
              height: Math.random() * 4 + 2 + 'px',
              left: Math.random() * 100 + '%',
              top: Math.random() * 100 + '%',
            }}
            animate={{
              y: [0, -80, 0],
              x: [0, Math.random() * 30 - 15, 0],
              opacity: [0.1, 0.7, 0.1],
            }}
            transition={{
              duration: Math.random() * 10 + 12,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: Math.random() * 5,
            }}
          />
        ))}
      </motion.div>

      {/* Hero Content Panel */}
      <div className="relative z-20 text-center max-w-4xl px-6 space-y-6 mt-16">
        {/* Floating Accent Tag */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="inline-flex items-center gap-2 border border-gold/30 px-4 py-1.5 rounded-full bg-gold/5 backdrop-blur-sm"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-gold animate-ping" />
          <span className="text-[10px] uppercase tracking-[0.3em] font-medium text-gold-accent">
            A Five-Star Boutique Experience
          </span>
        </motion.div>

        {/* Brand Main Title Reveal */}
        <div className="overflow-hidden">
          <motion.h1
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            transition={{ duration: 1.2, ease: [0.215, 0.61, 0.355, 1], delay: 0.4 }}
            className="font-serif text-5xl sm:text-6xl md:text-8xl text-gold-accent tracking-wide leading-[1.1] font-light"
          >
            Bon Appetite
          </motion.h1>
        </div>

        {/* Subheading Reveal */}
        <div className="overflow-hidden">
          <motion.p
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            transition={{ duration: 1, ease: [0.215, 0.61, 0.355, 1], delay: 0.6 }}
            className="font-sans text-sm sm:text-base md:text-lg text-cream/70 tracking-[0.4em] uppercase font-light italic"
          >
            Where Taste Meets Elegance
          </motion.p>
        </div>

        {/* Decorative Divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.2, delay: 0.8 }}
          className="h-[1px] w-48 bg-gradient-to-r from-transparent via-gold/55 to-transparent mx-auto"
        />

        {/* Action CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
        >
          {/* Explore Menu Button */}
          <a
            href="#menu"
            onClick={handleScrollToMenu}
            className="w-full sm:w-auto px-8 py-3.5 border border-gold/40 hover:border-gold text-gold-accent hover:bg-gold/5 text-xs font-semibold uppercase tracking-widest rounded-full transition-all duration-300 flex items-center justify-center gap-2 group interactive-hover"
          >
            Explore Menu
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1.5 transition-transform" />
          </a>

          {/* Reserve Table Button */}
          <button
            onClick={onOpenBooking}
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-gold-dark via-gold to-gold-accent hover:from-gold hover:to-gold-light text-[#0A0A0A] font-bold text-xs uppercase tracking-widest rounded-full transition-all duration-300 shadow-lg hover:shadow-gold/15 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 interactive-hover"
          >
            <Calendar className="w-3.5 h-3.5" />
            Reserve Table
          </button>
        </motion.div>
      </div>

      {/* Down Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none z-20"
      >
        <span className="text-[9px] uppercase tracking-[0.3em] font-light text-gold-accent/50">
          Scroll Down
        </span>
        <ArrowDown className="w-3.5 h-3.5 text-gold-accent/40 animate-bounce" />
      </motion.div>
    </section>
  );
}
