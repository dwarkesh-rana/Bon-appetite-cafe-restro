import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { Coffee, Utensils, Cake, Wine, Plus } from 'lucide-react';

const MENU_DATA = {
  coffee: {
    icon: <Coffee className="w-4 h-4" />,
    label: '☕ Coffee',
    items: [
      { name: 'Grand Espresso Macchiato', price: 450, desc: 'Single-origin espresso with whipped cream, Madagascar vanilla bean, and organic 24k gold dust.' },
      { name: 'Champagne Truffle Latte', price: 650, desc: 'Steamed milk, house dark mocha syrup, infused with white truffle scent and gold shavings.' },
      { name: 'Rose Gold Affogato', price: 750, desc: 'Double espresso poured over salted caramel gelato, decorated with candied rose petals.' },
      { name: 'Cold Brew Reserve', price: 550, desc: 'Slow-drip single origin Colombian beans aged in oak barrels for a woody, smooth complexity.' }
    ]
  },
  mains: {
    icon: <Utensils className="w-4 h-4" />,
    label: '🍝 Main Course',
    items: [
      { name: 'Truffle Tagliolini', price: 1850, desc: 'Handcrafted bronze-die pasta, premium Parmigiano-Reggiano sauce, fresh black truffle shavings.' },
      { name: 'Wild Mushroom Risotto', price: 1450, desc: 'Arborio rice simmered in white wine broth, wild porcini, wood ear mushrooms, fresh mascarpone.' },
      { name: 'Wagyu Ribeye Steak (Mock Special)', price: 3850, desc: 'Aged Japanese A5 Wagyu tender beef, seared with garlic herb butter, served with roasted root vegetables.' },
      { name: 'Saffron Garlic Salmon', price: 2450, desc: 'Pan-seared Atlantic salmon, infused saffron cream sauce, roasted asparagus, lemon oil drizzle.' }
    ]
  },
  desserts: {
    icon: <Cake className="w-4 h-4" />,
    label: '🍰 Desserts',
    items: [
      { name: 'Golden Foil Cheesecake', price: 950, desc: 'Velvety New York style cheesecake with gourmet vanilla bean, topped with edible 24k gold leaf.' },
      { name: 'Pistachio Paris-Brest', price: 850, desc: 'Baked choux pastry ring filled with premium Sicilian pistachio praline cream.' },
      { name: 'Lava Chocolate Souffle', price: 890, desc: 'Molten center dark chocolate souffle served with house-made hazelnut cream gelato.' },
      { name: 'Madagascar Creme Brulee', price: 750, desc: 'Silky egg custard infused with real bourbon vanilla bean, finished with a crisp torched caramel crust.' }
    ]
  },
  beverages: {
    icon: <Wine className="w-4 h-4" />,
    label: '🥤 Beverages',
    items: [
      { name: 'Saffron Mango Mocktail', price: 650, desc: 'Fresh Alphonso mango nectar, organic saffron extract, elderflower syrup, sparkling water.' },
      { name: 'Lavender Honey Tonic', price: 590, desc: 'Infused lavender buds syrup, organic raw honey, tonic water, fresh pressed lime juice.' },
      { name: 'Smoked Wood Old Fashioned', price: 750, desc: 'Non-alcoholic bourbon blend, orange bitters, smoked cherry wood vapor dome presentation.' },
      { name: 'Rosewater Berry Fizz', price: 690, desc: 'Muddled fresh forest berries, premium Persian rosewater, carbonated coconut water, mint leaves.' }
    ]
  }
};

export default function Menu({ onOpenOrder }) {
  const { isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState('coffee');

  return (
    <section
      id="menu"
      className={`py-24 px-6 md:px-12 relative transition-colors duration-500 ${
        isDarkMode ? 'bg-[#0A0A0A]' : 'bg-[#FAF7F2]'
      }`}
    >
      {/* Visual Accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-[1px] bg-gradient-to-r from-transparent via-gold/40 to-transparent" />

      <div className="max-w-6xl mx-auto space-y-12">
        {/* Title */}
        <div className="text-center space-y-3">
          <span className="text-[10px] tracking-[0.4em] uppercase text-gold-accent font-semibold block italic">
            Fine Dining Selection
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl text-gold-accent tracking-wide">
            Signature Menu Card
          </h2>
          <div className="h-[1px] w-28 bg-gold/40 mx-auto" />
        </div>

        {/* Tab Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 max-w-2xl mx-auto">
          {Object.keys(MENU_DATA).map((key) => {
            const active = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-5 py-2.5 rounded-full border text-xs uppercase tracking-widest font-semibold flex items-center gap-2 transition-all duration-300 interactive-hover ${
                  active
                    ? 'bg-gradient-to-r from-gold-dark to-gold text-[#0A0A0A] border-gold shadow-md'
                    : isDarkMode
                    ? 'bg-espresso-light/35 border-gold/15 text-gold-accent hover:border-gold/40'
                    : 'bg-cream-dark/50 border-gold-accent/25 text-gold-accent hover:border-gold'
                }`}
              >
                {MENU_DATA[key].icon}
                {MENU_DATA[key].label}
              </button>
            );
          })}
        </div>

        {/* Menu Cards Grid */}
        <div className="relative min-h-[380px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4"
            >
              {MENU_DATA[activeTab].items.map((item, idx) => (
                <motion.div
                  key={item.name}
                  className={`p-6 rounded-xl border relative overflow-hidden group transition-all duration-500 hover:scale-[1.01] ${
                    isDarkMode
                      ? 'bg-espresso/25 border-gold/10 hover:border-gold/25 hover:bg-espresso/45'
                      : 'bg-white border-gold-accent/15 hover:border-gold-accent/35 hover:shadow-md'
                  }`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  {/* Decorative background glow on hover */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gold/5 rounded-full blur-2xl group-hover:bg-gold/10 transition-colors pointer-events-none" />

                  {/* Header Row */}
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <h3 className="font-serif text-lg sm:text-xl text-gold-accent tracking-wide group-hover:text-gold transition-colors text-left">
                        {item.name}
                      </h3>
                      <p className="text-xs opacity-60 leading-relaxed font-light font-sans max-w-md italic text-left">
                        {item.desc}
                      </p>
                    </div>

                    {/* Price and Add Button */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="font-serif text-lg text-gold font-semibold tracking-wide">
                        ₹{item.price}
                      </span>
                      <button
                        onClick={onOpenOrder}
                        className="p-1.5 rounded-full border border-gold/30 hover:border-gold text-gold-accent hover:bg-gold/5 transition-all group interactive-hover"
                        title="Order Online"
                      >
                        <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform duration-300" />
                      </button>
                    </div>
                  </div>

                  {/* Luxury Border Line */}
                  <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-gold/15 to-transparent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-700" />
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer Ordering CTA */}
        <div className="text-center pt-8">
          <p className="text-xs opacity-60 tracking-wider uppercase mb-4 italic">
            Craving something special not listed?
          </p>
          <button
            onClick={onOpenOrder}
            className="px-8 py-3.5 bg-transparent border border-gold/40 hover:border-gold text-gold-accent text-xs uppercase tracking-widest font-semibold rounded-full transition-all duration-300 hover:bg-gold/5 interactive-hover"
          >
            Open Order Menu
          </button>
        </div>
      </div>
    </section>
  );
}
