import React from 'react';
import { motion } from 'framer-motion';
import { Star, ShieldAlert } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const SPECIALS_DATA = [
  {
    id: 1,
    name: 'Grand Truffle Tagliolini',
    price: 1850,
    rating: 5,
    category: '🍝 Main Course',
    desc: 'Bronze-die tagliolini tossed in emulsified Parmigiano broth, adorned with fresh Umbrian black truffle shavings.',
    image: '/special_pasta.png',
  },
  {
    id: 2,
    name: '24k Gold Melting Sphere',
    price: 950,
    rating: 5,
    category: '🍰 Dessert',
    desc: 'A delicate dark chocolate sphere melted tableside with hot espresso caramel to reveal gold leaf cream.',
    image: '/special_dessert.png',
  },
  {
    id: 3,
    name: 'Royal Saffron Mist',
    price: 750,
    rating: 4.9,
    category: '🥤 Signature Drink',
    desc: 'Amber Kashmiri saffron nectar, organic ginger essence, carbonated gold flakes, served in a smoking cherrywood vapor dome.',
    image: '/special_beverage.png',
  },
];

export default function ChefSpecial({ onOpenOrder }) {
  const { isDarkMode } = useTheme();

  return (
    <section
      id="chef-specials"
      className={`py-24 px-6 md:px-12 relative overflow-hidden transition-colors duration-500 ${
        isDarkMode ? 'bg-[#0D0805]' : 'bg-[#FAF7F2]'
      }`}
    >
      {/* Decorative side lines */}
      <div className="absolute top-0 left-0 w-[1px] h-full bg-gradient-to-b from-gold/20 via-transparent to-gold/20" />
      <div className="absolute top-0 right-0 w-[1px] h-full bg-gradient-to-b from-gold/20 via-transparent to-gold/20" />

      <div className="max-w-6xl mx-auto space-y-16">
        {/* Section Header */}
        <div className="text-center space-y-3">
          <span className="text-[10px] tracking-[0.4em] uppercase text-gold-accent font-semibold block italic">
            House Masterpieces
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl text-gold-accent tracking-wide">
            Chef's Signature Creations
          </h2>
          <div className="h-[1px] w-28 bg-gold/40 mx-auto" />
        </div>

        {/* Highlight Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {SPECIALS_DATA.map((dish, index) => (
            <motion.div
              key={dish.id}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.8, delay: index * 0.2, ease: 'easeOut' }}
              className={`rounded-2xl border overflow-hidden relative group hover:scale-[1.02] transition-all duration-500 flex flex-col justify-between ${
                isDarkMode
                  ? 'bg-[#150D0A]/70 border-gold/15 hover:border-gold/30 box-gold-glow'
                  : 'bg-white border-gold-accent/20 hover:border-gold-accent/40 shadow-lg'
              }`}
            >
              {/* Card Image Header */}
              <div className="relative overflow-hidden aspect-[4/3] w-full shrink-0">
                <img
                  src={dish.image}
                  alt={dish.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                {/* Category Floating Tag */}
                <span className="absolute top-4 left-4 z-10 text-[9px] uppercase tracking-widest font-semibold px-3 py-1 rounded-full bg-black/75 border border-gold/30 text-gold-accent">
                  {dish.category}
                </span>
                {/* Visual shade gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
              </div>

              {/* Card Body */}
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2 text-left">
                  {/* Rating Stars */}
                  <div className="flex items-center gap-1 text-left justify-start">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 fill-gold stroke-none ${
                          i < Math.floor(dish.rating) ? 'text-gold' : 'opacity-25'
                        }`}
                      />
                    ))}
                    <span className="text-[10px] text-gold-accent/70 font-semibold ml-1">
                      {dish.rating.toFixed(1)}
                    </span>
                  </div>

                  {/* Title & Price */}
                  <div className="flex justify-between items-baseline gap-2">
                    <h3 className="font-serif text-xl text-gold-accent group-hover:text-gold transition-colors font-medium">
                      {dish.name}
                    </h3>
                    <span className="font-serif text-lg font-semibold text-gold shrink-0">
                      ₹{dish.price}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-xs opacity-75 font-light leading-relaxed font-sans italic">
                    {dish.desc}
                  </p>
                </div>

                {/* Add to order CTA */}
                <button
                  onClick={onOpenOrder}
                  className="w-full py-2.5 bg-transparent border border-gold/30 hover:border-gold hover:text-gold hover:bg-gold/5 text-gold-accent font-semibold text-xs uppercase tracking-widest rounded-lg transition-colors interactive-hover"
                >
                  Order Tableside
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
