import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const GALLERY_ITEMS = [
  { src: '/gallery_interior.png', title: 'Candlelit Evening Seating', category: 'Interior' },
  { src: '/about_bg.png', title: 'Barista Latte Artistry', category: 'Coffee' },
  { src: '/special_pasta.png', title: 'Truffle Tagliolini Plating', category: 'Gastronomy' },
  { src: '/hero_bg.png', title: 'Cozy Salon & Lounge', category: 'Interior' },
  { src: '/gallery_plating.png', title: 'Signature Dessert Garnishing', category: 'Patisserie' },
  { src: '/special_beverage.png', title: 'The Saffron Smoke Mist', category: 'Mixology' },
];

export default function Gallery() {
  const { isDarkMode } = useTheme();
  const [selectedIndex, setSelectedIndex] = useState(null);

  const handlePrev = (e) => {
    e.stopPropagation();
    setSelectedIndex((prev) => (prev === 0 ? GALLERY_ITEMS.length - 1 : prev - 1));
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setSelectedIndex((prev) => (prev === GALLERY_ITEMS.length - 1 ? 0 : prev + 1));
  };

  return (
    <section
      id="gallery"
      className={`py-24 px-6 md:px-12 relative transition-colors duration-500 ${
        isDarkMode ? 'bg-[#0A0A0A]' : 'bg-[#FAF7F2]'
      }`}
    >
      {/* Visual top accent line */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-[1px] bg-gradient-to-r from-transparent via-gold/40 to-transparent" />

      <div className="max-w-7xl mx-auto space-y-16">
        {/* Title */}
        <div className="text-center space-y-3">
          <span className="text-[10px] tracking-[0.4em] uppercase text-gold-accent font-semibold block">
            Aesthetic Perspectives
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl text-gold-accent tracking-wide">
            The Gallery Experience
          </h2>
          <div className="h-[1px] w-28 bg-gold/40 mx-auto" />
        </div>

        {/* Gallery Grid (Aesthetic Grid) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {GALLERY_ITEMS.map((item, index) => (
            <motion.div
              key={index}
              className="relative overflow-hidden rounded-xl border border-gold/15 group aspect-[4/3] cursor-pointer box-gold-glow hover:border-gold/30 transition-all duration-300"
              onClick={() => setSelectedIndex(index)}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              {/* Thumbnail Image */}
              <img
                src={item.src}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center space-y-2 p-4">
                <ZoomIn className="w-6 h-6 text-gold-accent animate-pulse" />
                <span className="font-serif text-base text-gold-accent text-center tracking-wide">
                  {item.title}
                </span>
                <span className="text-[9px] uppercase tracking-[0.2em] opacity-60">
                  {item.category}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Lightbox Modal Popup */}
      <AnimatePresence>
        {selectedIndex !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/95 backdrop-blur-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedIndex(null)}
            />

            {/* Lightbox Container */}
            <motion.div
              className="relative max-w-4xl w-full max-h-[85vh] flex flex-col justify-center items-center z-10"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              {/* Large Image Frame */}
              <div className="relative rounded-2xl overflow-hidden border border-gold/30 box-gold-glow max-h-[70vh] flex items-center justify-center bg-black">
                <img
                  src={GALLERY_ITEMS[selectedIndex].src}
                  alt={GALLERY_ITEMS[selectedIndex].title}
                  className="w-full h-full object-contain max-h-[70vh]"
                />
              </div>

              {/* Caption details below image */}
              <div className="text-center mt-4 space-y-1">
                <p className="font-serif text-lg text-gold-accent tracking-wide">
                  {GALLERY_ITEMS[selectedIndex].title}
                </p>
                <p className="text-[10px] uppercase tracking-[0.2em] opacity-60">
                  Category: {GALLERY_ITEMS[selectedIndex].category}
                </p>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setSelectedIndex(null)}
                className="absolute -top-12 right-0 p-2 rounded-full hover:bg-white/10 text-gold-accent transition-colors interactive-hover"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Left Navigation Arrow */}
              <button
                onClick={handlePrev}
                className="absolute left-0 lg:-left-16 top-1/2 -translate-y-1/2 p-2.5 rounded-full hover:bg-white/10 text-gold-accent transition-colors border border-gold/20 bg-black/50 interactive-hover"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {/* Right Navigation Arrow */}
              <button
                onClick={handleNext}
                className="absolute right-0 lg:-right-16 top-1/2 -translate-y-1/2 p-2.5 rounded-full hover:bg-white/10 text-gold-accent transition-colors border border-gold/20 bg-black/50 interactive-hover"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
