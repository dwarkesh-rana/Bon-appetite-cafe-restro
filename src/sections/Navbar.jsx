import React, { useState, useEffect } from 'react';
import { Menu, X, Sun, Moon, ShoppingBag, Calendar, Shield } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Navbar({ onOpenBooking, onOpenOrder, onOpenAdmin }) {
  const { isDarkMode, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', href: '#home' },
    { name: 'About', href: '#about' },
    { name: 'Menu', href: '#menu' },
    { name: 'Chef Specials', href: '#chef-specials' },
    { name: 'Gallery', href: '#gallery' },
    { name: 'Reservation', href: '#reservation' },
    { name: 'Reviews', href: '#reviews' },
    { name: 'Contact', href: '#contact' },
  ];

  const handleLinkClick = (e, href) => {
    e.preventDefault();
    setIsOpen(false);
    const target = document.querySelector(href);
    if (target) {
      const offset = 80; // height of navbar
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
    <nav
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-500 ${
        scrolled
          ? isDarkMode
            ? 'bg-[#0D0805]/85 backdrop-blur-md shadow-lg border-b border-gold/15 py-3'
            : 'bg-[#FAF7F2]/85 backdrop-blur-md shadow-lg border-b border-gold-accent/20 py-3'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Brand Logo */}
        <a
          href="#home"
          onClick={(e) => handleLinkClick(e, '#home')}
          className="flex items-center gap-2 group interactive-hover"
        >
          {/* Small Luxury Coffee Cup SVG Icon */}
          <svg
            width="32"
            height="32"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-gold-accent group-hover:scale-105 transition-transform duration-300"
          >
            <path
              d="M 28 38 L 72 38 C 72 38, 72 68, 50 68 C 28 68, 28 38, 28 38 Z"
              stroke="currentColor"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M 72 44 C 80 44, 80 56, 72 56"
              stroke="currentColor"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M 20 78 L 80 78"
              stroke="currentColor"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </svg>
          <div className="text-left">
            <span className="font-serif text-lg tracking-[0.18em] font-medium block leading-none text-gold-accent group-hover:text-gold transition-colors">
              BON APPETITE
            </span>
            <span className="text-[8px] font-sans tracking-[0.3em] font-light uppercase block mt-1 opacity-70">
              Cafe & Restro
            </span>
          </div>
        </a>

        {/* Desktop Navigation Links */}
        <div className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              onClick={(e) => handleLinkClick(e, link.href)}
              className="text-xs uppercase tracking-[0.2em] font-medium transition-colors hover:text-gold-accent interactive-hover"
            >
              {link.name}
            </a>
          ))}
        </div>

        {/* Action Controls */}
        <div className="hidden lg:flex items-center gap-4">
          {/* Theme Mode Switcher */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-gold/10 text-gold-accent transition-colors interactive-hover"
            title={isDarkMode ? 'Luxury Light Mode' : 'Matte Espresso Dark'}
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Admin Concierge Dashboard */}
          <button
            onClick={onOpenAdmin}
            className="p-2 rounded-full hover:bg-gold/10 text-gold-accent transition-colors interactive-hover"
            title="Concierge Admin Portal"
          >
            <Shield className="w-4 h-4" />
          </button>

          {/* Quick Order Button */}
          <button
            onClick={onOpenOrder}
            className="flex items-center gap-2 px-4 py-2 border border-gold/40 hover:border-gold hover:bg-gold/5 text-gold-accent text-xs uppercase tracking-widest font-medium rounded-full transition-all interactive-hover"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            Order Online
          </button>

          {/* Reserve Table Button */}
          <button
            onClick={onOpenBooking}
            className="px-5 py-2.5 bg-gradient-to-r from-gold-dark to-gold-accent hover:from-gold hover:to-gold-light text-[#0A0A0A] font-semibold text-xs uppercase tracking-widest rounded-full transition-all duration-300 shadow-md hover:shadow-gold/10 interactive-hover"
          >
            Reserve Table
          </button>
        </div>

        {/* Mobile controls & hamburger button */}
        <div className="flex lg:hidden items-center gap-3">
          {/* Mobile Theme Switcher */}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-full hover:bg-gold/10 text-gold-accent transition-colors"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Mobile Cart Trigger */}
          <button
            onClick={onOpenOrder}
            className="p-1.5 rounded-full hover:bg-gold/10 text-gold-accent transition-colors"
          >
            <ShoppingBag className="w-4 h-4" />
          </button>

          {/* Hamburger Menu Toggle */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 rounded-full text-gold-accent hover:bg-gold/10 transition-colors"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {isOpen && (
        <div
          className={`lg:hidden border-t mt-3 p-6 flex flex-col gap-5 ${
            isDarkMode
              ? 'bg-[#0D0805] border-gold/15 text-cream'
              : 'bg-[#FAF7F2] border-gold-accent/20 text-espresso'
          }`}
        >
          <div className="flex flex-col gap-4 text-center">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => handleLinkClick(e, link.href)}
                className="text-xs uppercase tracking-[0.2em] font-semibold py-2 hover:text-gold-accent border-b border-gold/5"
              >
                {link.name}
              </a>
            ))}
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenOrder();
              }}
              className="w-full py-3 border border-gold/45 text-gold-accent text-xs uppercase tracking-widest font-semibold rounded-full flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-4 h-4" />
              Order Online
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenBooking();
              }}
              className="w-full py-3 bg-gradient-to-r from-gold-dark to-gold text-[#0A0A0A] font-bold text-xs uppercase tracking-widest rounded-full"
            >
              Reserve Table
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenAdmin();
              }}
              className="w-full py-3 bg-transparent border border-gold/20 hover:border-gold text-gold-accent text-xs uppercase tracking-widest font-semibold rounded-full flex items-center justify-center gap-2"
            >
              <Shield className="w-4 h-4" />
              Admin Portal
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
