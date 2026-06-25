import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function GoldenLoader({ isLoading, setIsLoading }) {
  useEffect(() => {
    // Disable scroll during loading
    if (isLoading) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isLoading]);

  // Set timeout to dismiss loader after 3.2 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3200);
    return () => clearTimeout(timer);
  }, [setIsLoading]);

  // SVG drawing animation config
  const logoPathVariants = {
    hidden: { strokeDashoffset: 400, opacity: 0 },
    visible: {
      strokeDashoffset: 0,
      opacity: 1,
      transition: {
        strokeDashoffset: { duration: 1.8, ease: 'easeInOut' },
        opacity: { duration: 0.5 },
      },
    },
  };

  const textVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { delay: 1.4, duration: 0.8, ease: 'easeOut' },
    },
  };

  const lineVariants = {
    hidden: { scaleX: 0 },
    visible: {
      scaleX: 1,
      transition: { delay: 1.6, duration: 1, ease: 'easeInOut' },
    },
  };

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          className="fixed inset-0 bg-[#0A0A0A] z-[999] flex flex-col items-center justify-center overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ 
            opacity: 0,
            transition: { duration: 0.8, ease: [0.43, 0.13, 0.23, 0.96] }
          }}
        >
          {/* Subtle glowing ambient backdrop */}
          <div className="absolute w-[40vw] h-[40vw] bg-gold/5 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="flex flex-col items-center max-w-md px-6 text-center">
            {/* SVG Luxury Cafe Logo Outline Drawing */}
            <svg
              width="120"
              height="120"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="mb-6 drop-shadow-[0_0_15px_rgba(212,175,55,0.3)]"
            >
              {/* Cup Outline */}
              <motion.path
                d="M 25 35 L 75 35 C 75 35, 75 70, 50 70 C 25 70, 25 35, 25 35 Z"
                stroke="#D4AF37"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="400"
                variants={logoPathVariants}
                initial="hidden"
                animate="visible"
              />
              {/* Cup Handle */}
              <motion.path
                d="M 75 42 C 85 42, 85 58, 75 58"
                stroke="#D4AF37"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="100"
                variants={logoPathVariants}
                initial="hidden"
                animate="visible"
              />
              {/* Cup Plate / Saucer */}
              <motion.path
                d="M 18 78 L 82 78 C 82 78, 78 85, 50 85 C 22 85, 18 78, 18 78 Z"
                stroke="#D4AF37"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="200"
                variants={logoPathVariants}
                initial="hidden"
                animate="visible"
              />
              {/* Monogram B inside Cup */}
              <motion.path
                d="M 45 45 L 45 59 C 45 59, 52 59, 52 55 C 52 52, 45 52, 45 52 C 45 52, 53 52, 53 48 C 53 45, 45 45, 45 45 Z"
                stroke="#C5A880"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="100"
                variants={logoPathVariants}
                initial="hidden"
                animate="visible"
              />
            </svg>

            {/* Typography Reveal */}
            <motion.h1
              className="font-serif text-3xl sm:text-4xl text-gold-accent tracking-[0.25em] font-light uppercase"
              variants={textVariants}
              initial="hidden"
              animate="visible"
            >
              Bon Appetite
            </motion.h1>
            
            <motion.div 
              className="h-[1px] w-28 bg-gold/40 my-3 origin-center"
              variants={lineVariants}
              initial="hidden"
              animate="visible"
            />
            
            <motion.p
              className="text-xs sm:text-sm text-gold/60 tracking-[0.4em] font-light uppercase"
              variants={textVariants}
              initial="hidden"
              animate="visible"
            >
              Cafe & Restro
            </motion.p>
          </div>

          {/* Loader status indicator */}
          <div className="absolute bottom-12 overflow-hidden w-40 h-[1px] bg-white/10">
            <motion.div
              className="h-full bg-gold"
              initial={{ left: '-100%', position: 'absolute', width: '100%' }}
              animate={{ left: '100%' }}
              transition={{ duration: 2.2, ease: 'easeInOut', repeat: Infinity }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
