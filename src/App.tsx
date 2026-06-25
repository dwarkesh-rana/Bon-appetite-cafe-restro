import React, { useState, useEffect } from 'react';
import { useTheme } from './context/ThemeContext';

// Components & Overlays
import CustomCursor from './components/CustomCursor';
import GoldenLoader from './components/GoldenLoader';
import TableBooking from './components/TableBooking';
import QuickOrder from './components/QuickOrder';
import FloatingActions from './components/FloatingActions';
import AdminDashboard from './components/AdminDashboard';

// Sections
import Navbar from './sections/Navbar';
import Hero from './sections/Hero';
import About from './sections/About';
import Menu from './sections/Menu';
import ChefSpecial from './sections/ChefSpecial';
import Gallery from './sections/Gallery';
import Reservation from './sections/Reservation';
import Testimonials from './sections/Testimonials';
import Contact from './sections/Contact';
import Footer from './sections/Footer';

export default function App() {
  const { isDarkMode } = useTheme();
  
  // Loader & Interactive State Controls
  const [isLoading, setIsLoading] = useState(true);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isOrderOpen, setIsOrderOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // Automatic Table QR Parameter detection on startup
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const table = params.get('table');
    const token = params.get('token');
    
    if (table && token) {
      localStorage.setItem('bon_table_qr', JSON.stringify({ table, token }));
      
      // Delay opening the order drawer slightly so loader doesn't clash
      setTimeout(() => {
        setIsOrderOpen(true);
      }, 1000);

      // Clean up the URL query params in browser search bar
      const newUrl = window.location.protocol + '//' + window.location.host + window.location.pathname;
      window.history.replaceState({ path: newUrl }, '', newUrl);
    }
  }, []);

  const openBooking = () => setIsBookingOpen(true);
  const closeBooking = () => setIsBookingOpen(false);

  const openOrder = () => setIsOrderOpen(true);
  const closeOrder = () => setIsOrderOpen(false);

  const openAdmin = () => setIsAdminOpen(true);
  const closeAdmin = () => setIsAdminOpen(false);

  return (
    <div className={`relative min-h-screen ${isDarkMode ? 'dark bg-matte-black text-cream' : 'light bg-cream text-espresso'}`}>
      
      {/* Premium Luxury Golden Logo Loader */}
      <GoldenLoader isLoading={isLoading} setIsLoading={setIsLoading} />

      {!isLoading && (
        <div className="relative animate-[fadeIn_0.8s_ease-out]">
          
          {/* Subtle Ambient Grain Overlay (Gives a high-end editorial paper feel) */}
          <div className="fixed inset-0 bg-grain z-30 pointer-events-none" />

          {/* Sticky Luxury Navbar */}
          <Navbar onOpenBooking={openBooking} onOpenOrder={openOrder} onOpenAdmin={openAdmin} />

          {/* Main Content Layout Sections */}
          <main>
            {/* Cinematic Hero Header */}
            <Hero onOpenBooking={openBooking} />

            {/* Split Storytelling Narrative */}
            <About />

            {/* Tabbed Gourmet Menu Card */}
            <Menu onOpenOrder={openOrder} />

            {/* Glassmorphic Chef Specials Showcase */}
            <ChefSpecial onOpenOrder={openOrder} />

            {/* Masonry Lightbox Gallery */}
            <Gallery />

            {/* Hotel-Style Reservation Booking Form */}
            <Reservation />

            {/* Premium Client Review Slider */}
            <Testimonials />

            {/* Contact details & Mock Coordinates Canvas */}
            <Contact />
          </main>

          {/* Fine Vintage Signature Footer */}
          <Footer onOpenBooking={openBooking} onOpenOrder={openOrder} onOpenAdmin={openAdmin} />

          {/* WhatsApp Float & Top Scroll Actions */}
          <FloatingActions />
          
        </div>
      )}

      {/* Table Booking Modal popup overlay */}
      {!isLoading && <TableBooking isOpen={isBookingOpen} onClose={closeBooking} />}

      {/* Slide-over Online Order Checkout Drawer */}
      {!isLoading && <QuickOrder isOpen={isOrderOpen} onClose={closeOrder} />}

      {/* Concierge Admin Panel Overlay */}
      {!isLoading && <AdminDashboard isOpen={isAdminOpen} onClose={closeAdmin} />}

      {/* Interactive Custom Cursor (Mounted at the root viewport stacking context) */}
      {!isLoading && <CustomCursor />}
    </div>
  );
}
