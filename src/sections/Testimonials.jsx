import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const REVIEWS_DATA = [
  {
    id: 1,
    name: 'Aria Montgomery',
    role: 'Gastronomy Columnist',
    rating: 5,
    initials: 'AM',
    comment: 'An amazing atmosphere with unforgettable flavors. The Champagne Truffle Latte is an absolute work of art, and the service feels like a 5-star hotel concierge.',
  },
  {
    id: 2,
    name: 'Alexander Sterling',
    role: 'Food & Lifestyle Critic',
    rating: 5,
    initials: 'AS',
    comment: 'The Truffle Tagliolini was prepared flawlessly. There is a precise attention to culinary craftsmanship here that elevates Bon Appetite from a cafe to a true luxury brand.',
  },
  {
    id: 3,
    name: 'Sophia Laurent',
    role: 'Coffee Enthusiast',
    rating: 5,
    initials: 'SL',
    comment: 'A gorgeous, romantic setting perfect for professionals or couples. The golden loader reveal and details throughout the space create an Instagrammable, premium mood.',
  },
];

export default function Testimonials() {
  const { isDarkMode } = useTheme();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev === REVIEWS_DATA.length - 1 ? 0 : prev + 1));
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const handlePrev = () => {
    setIndex((prev) => (prev === 0 ? REVIEWS_DATA.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setIndex((prev) => (prev === REVIEWS_DATA.length - 1 ? 0 : prev + 1));
  };

  return (
    <section
      id="reviews"
      className={`py-24 px-6 md:px-12 relative overflow-hidden transition-colors duration-500 ${
        isDarkMode ? 'bg-[#0A0A0A]' : 'bg-[#FAF7F2]'
      }`}
    >
      {/* Visual Accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-[1px] bg-gradient-to-r from-transparent via-gold/40 to-transparent" />

      <div className="max-w-4xl mx-auto space-y-12 relative">
        {/* Quote watermark */}
        <Quote className="absolute top-0 left-4 w-28 h-28 text-gold/5 pointer-events-none -translate-y-8" />

        {/* Title */}
        <div className="text-center space-y-3">
          <span className="text-[10px] tracking-[0.4em] uppercase text-gold-accent font-semibold block">
            Guest Reflections
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl text-gold-accent tracking-wide">
            Customer Reviews
          </h2>
          <div className="h-[1px] w-28 bg-gold/40 mx-auto" />
        </div>

        {/* Carousel Window */}
        <div className="relative min-h-[220px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, x: 25 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -25 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
              className="text-center space-y-6 px-8 max-w-2xl"
            >
              {/* Rating stars */}
              <div className="flex justify-center gap-1">
                {[...Array(REVIEWS_DATA[index].rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-gold stroke-none text-gold" />
                ))}
              </div>

              {/* Review Comment */}
              <p className="font-serif text-lg sm:text-xl md:text-2xl leading-relaxed text-gold-accent/90 italic font-light">
                "{REVIEWS_DATA[index].comment}"
              </p>

              {/* Reviewer Details */}
              <div className="flex items-center justify-center gap-3">
                {/* stylized circle avatar */}
                <div className="w-10 h-10 rounded-full border border-gold/40 flex items-center justify-center text-xs font-bold text-gold bg-gold/5 font-sans">
                  {REVIEWS_DATA[index].initials}
                </div>
                <div className="text-left leading-tight">
                  <h4 className="font-serif text-sm text-gold-accent font-semibold">
                    {REVIEWS_DATA[index].name}
                  </h4>
                  <p className="text-[10px] uppercase tracking-widest opacity-60 mt-0.5">
                    {REVIEWS_DATA[index].role}
                  </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation Arrows */}
        <div className="flex items-center justify-center gap-6 pt-4">
          <button
            onClick={handlePrev}
            className="p-2 rounded-full border border-gold/30 hover:border-gold hover:text-gold text-gold-accent transition-colors interactive-hover"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          {/* Index Dots */}
          <div className="flex gap-2">
            {REVIEWS_DATA.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  index === i ? 'w-4 bg-gold' : 'bg-gold/25'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="p-2 rounded-full border border-gold/30 hover:border-gold hover:text-gold text-gold-accent transition-colors interactive-hover"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
