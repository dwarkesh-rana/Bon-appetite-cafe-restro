import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';

export default function About() {
  const { isDarkMode } = useTheme();

  return (
    <section
      id="about"
      className={`py-24 px-6 md:px-12 relative overflow-hidden transition-colors duration-500 ${
        isDarkMode ? 'bg-[#0D0805]' : 'bg-[#FAF7F2]'
      }`}
    >
      {/* Decorative side lines */}
      <div className="absolute top-0 left-0 w-[1px] h-full bg-gradient-to-b from-gold/20 via-transparent to-gold/20" />
      <div className="absolute top-0 right-0 w-[1px] h-full bg-gradient-to-b from-gold/20 via-transparent to-gold/20" />

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* Left Side: Luxury Image with Floating Gold Border Frame */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="relative group"
        >
          {/* Main frame border */}
          <div className="absolute -inset-3 border border-gold/30 rounded-2xl pointer-events-none group-hover:scale-[1.01] transition-transform duration-500" />
          
          {/* Main Image */}
          <div className="relative rounded-xl overflow-hidden aspect-[4/5] sm:aspect-square lg:aspect-[4/5] box-gold-glow">
            <img
              src="/about_bg.png"
              alt="Handcrafted Coffee Art pouring"
              className="w-full h-full object-cover transform scale-102 group-hover:scale-108 transition-transform duration-1000"
            />
            {/* Soft gold/espresso photo overlay */}
            <div className="absolute inset-0 bg-[#0D0805]/10 mix-blend-overlay" />
          </div>

          {/* Decorative Gold Leaf Emblem overlay */}
          <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full bg-gold/10 backdrop-blur-md border border-gold/40 flex items-center justify-center pointer-events-none shadow-lg">
            <span className="font-serif text-gold text-lg tracking-widest">EST.</span>
          </div>
        </motion.div>

        {/* Right Side: Narrative Editorial Content */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
          className="space-y-8 lg:pl-6 text-left"
        >
          {/* Title tag */}
          <div className="space-y-2">
            <span className="text-[10px] tracking-[0.4em] uppercase text-gold-accent font-semibold block">
              Our Story
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl text-gold-accent tracking-wide leading-tight">
              An Architectural Fusion of Taste & Atmosphere
            </h2>
            <div className="h-[2px] w-20 bg-gold/50" />
          </div>

          {/* Main paragraphs */}
          <p className="font-serif text-xl sm:text-2xl italic leading-relaxed text-gold-accent/80 font-light">
            "Bon Appetite Cafe and Restro is a place where handcrafted flavors meet a luxurious atmosphere. Every dish, every cup, and every moment is designed to create unforgettable experiences."
          </p>

          <div className="space-y-4 font-sans text-xs sm:text-sm leading-relaxed opacity-75 font-light">
            <p>
              Born from a vision of high-end European hospitality, we merge the artisanal complexity of specialty third-wave espresso with the refined, sophisticated palate of contemporary Parisian culinary craftsmanship.
            </p>
            <p>
              Every ingredient is sourced from boutique organic estates, and every recipe is fine-tuned under the meticulous direction of our master chefs and baristas. From early morning roasts to romantic evening dining, we invite you to sit back and savor life's premium details.
            </p>
          </div>

          {/* Signature Emblem / Line art */}
          <div className="pt-4 flex items-center gap-4">
            <div className="text-left">
              <p className="font-serif text-base text-gold-accent italic leading-none">
                Jean-Luc BonAppetit
              </p>
              <p className="text-[9px] uppercase tracking-widest opacity-60 mt-1">
                Executive Chef & Founder
              </p>
            </div>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-gold/30 to-transparent" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
