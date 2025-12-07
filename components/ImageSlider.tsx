
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Trophy, Target, TrendingUp } from 'lucide-react';

const SLIDES = [
  {
    id: 1,
    image: "https://images.unsplash.com/photo-1522778119026-d647f0565c71?auto=format&fit=crop&q=80&w=1200",
    title: "PREMIUM TIPS DAILY",
    subtitle: "Expert analysis for every major league match.",
    icon: Trophy,
    color: "from-brazil-green to-green-800"
  },
  {
    id: 2,
    image: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=1200",
    title: "MAXIMIZE YOUR WINS",
    subtitle: "Join the winning team with Jirvinho predictions.",
    icon: Target,
    color: "from-blue-600 to-blue-900"
  },
  {
    id: 3,
    image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=1200",
    title: "LIVE STATS & ANALYSIS",
    subtitle: "Real-time updates to keep you in the game.",
    icon: TrendingUp,
    color: "from-yellow-500 to-orange-600"
  }
];

export const ImageSlider: React.FC = () => {
  const [current, setCurrent] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  // Auto-play
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => {
    setCurrent((prev) => (prev + 1) % SLIDES.length);
  };

  const prevSlide = () => {
    setCurrent((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
  };

  // Touch handlers for manual swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) nextSlide();
    if (isRightSwipe) prevSlide();
    
    setTouchStart(0);
    setTouchEnd(0);
  };

  return (
    <div 
        className="relative h-48 md:h-64 rounded-2xl overflow-hidden shadow-2xl border border-slate-700 group mb-6"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
    >
      {SLIDES.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            index === current ? 'opacity-100 z-10' : 'opacity-0 z-0'
          }`}
        >
          {/* Background Image */}
          <div 
            className="absolute inset-0 bg-cover bg-center transition-transform duration-[5000ms] ease-linear scale-110"
            style={{ backgroundImage: `url(${slide.image})`, transform: index === current ? 'scale(110)' : 'scale(100)' }}
          />
          
          {/* Gradient Overlay */}
          <div className={`absolute inset-0 bg-gradient-to-r ${slide.color} opacity-80 mix-blend-multiply`} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

          {/* Content */}
          <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10">
            <div className={`transform transition-all duration-700 ${index === current ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                <div className="flex items-center gap-2 mb-2">
                    <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-md">
                        <slide.icon className="text-white" size={20} />
                    </div>
                    <span className="text-brazil-yellow font-black text-xs uppercase tracking-widest">Featured</span>
                </div>
                <h2 className="text-2xl md:text-4xl font-black text-white italic tracking-tighter mb-1 leading-none">
                    {slide.title}
                </h2>
                <p className="text-slate-200 text-sm md:text-base font-medium max-w-md">
                    {slide.subtitle}
                </p>
            </div>
          </div>
        </div>
      ))}

      {/* Navigation Dots */}
      <div className="absolute bottom-4 right-4 z-20 flex space-x-2">
        {SLIDES.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrent(idx)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              idx === current ? 'bg-brazil-yellow w-6' : 'bg-white/50 hover:bg-white'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
