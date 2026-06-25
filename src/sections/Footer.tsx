import React from 'react';
import { useTheme } from '../context/ThemeContext';

interface FooterProps {
  onOpenBooking: () => void;
  onOpenOrder: () => void;
  onOpenAdmin: () => void;
}

export default function Footer({ onOpenBooking, onOpenOrder, onOpenAdmin }: FooterProps) {
  const { isDarkMode } = useTheme();

  const handleLinkClick = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    const target = document.querySelector(href);
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
    <footer
      className={`py-16 px-6 md:px-12 border-t transition-colors duration-500 ${
        isDarkMode
          ? 'bg-[#0A0A0A] border-gold/10 text-cream'
          : 'bg-[#FAF7F2] border-gold-accent/15 text-espresso'
      }`}
    >
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Brand Columns */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
          {/* Brand Signature */}
          <div className="space-y-3">
            <a
              href="#home"
              onClick={(e) => handleLinkClick(e, '#home')}
              className="font-serif text-2xl tracking-[0.2em] font-medium text-gold-accent hover:text-gold transition-colors block interactive-hover"
            >
              BON APPETITE
            </a>
            <p className="text-[10px] uppercase tracking-[0.3em] opacity-60">
              Cafe & Restro
            </p>
          </div>

          {/* Quick Navigation Links */}
          <div className="flex flex-wrap justify-center gap-6 md:gap-8">
            <a
              href="#menu"
              onClick={(e) => handleLinkClick(e, '#menu')}
              className="text-xs uppercase tracking-[0.18em] transition-colors hover:text-gold-accent interactive-hover"
            >
              Menu
            </a>
            <a
              href="#reservation"
              onClick={(e) => handleLinkClick(e, '#reservation')}
              className="text-xs uppercase tracking-[0.18em] transition-colors hover:text-gold-accent interactive-hover"
            >
              Reservation
            </a>
            <a
              href="#contact"
              onClick={(e) => handleLinkClick(e, '#contact')}
              className="text-xs uppercase tracking-[0.18em] transition-colors hover:text-gold-accent interactive-hover"
            >
              Contact
            </a>
            <button
              onClick={onOpenOrder}
              className="text-xs uppercase tracking-[0.18em] text-gold-accent transition-colors hover:text-gold interactive-hover"
            >
              Order Online
            </button>
          </div>
        </div>

        {/* Divider line */}
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-gold/15 to-transparent" />

        {/* Bottom Credits */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs opacity-50 font-light">
          <p>
            &copy; {new Date().getFullYear()} Bon Appetite Cafe & Restro. All Rights Reserved.
          </p>
          <button
            onClick={onOpenAdmin}
            className="text-xs uppercase tracking-[0.18em] text-gold-accent hover:text-gold transition-colors font-semibold cursor-pointer"
          >
            Admin Portal
          </button>
          <p className="font-serif italic tracking-wider">
            Crafted with passion & elegance
          </p>
        </div>
      </div>
    </footer>
  );
}
