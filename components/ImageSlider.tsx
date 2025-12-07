
import React, { useState, useEffect } from 'react';
import { Trophy, Target, TrendingUp, ImageIcon } from 'lucide-react';
import { Slide } from '../types';

interface ImageSliderProps {
    slides: Slide[];
}

export const ImageSlider: React.FC<ImageSliderProps> = ({ slides }) => {
  const [current, setCurrent] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  // Auto-play
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const nextSlide = () => {
    if (slides.length <= 1) return;
    setCurrent((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    if (slides.length <= 1) return;
    setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
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

  if (slides.length === 0) {
      return (
          <div className="h-48 md:h-64 rounded-2xl bg-slate-900 border border-slate-700 flex flex-col items-center justify-center text-slate-500 mb-6">
              <ImageIcon size={48} className="mb-2 opacity-20"/>
              <p className="text-sm font-bold">No active slides</p>
          </div>
      )
  }

  return (
    <div 
        className="relative h-48 md:h-64 rounded-2xl overflow-hidden shadow-2xl border border-slate-700 group mb-6"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
    >
      {slides.map((slide, index) => (
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
          <div className={`absolute inset-0 bg-gradient-to-r from-slate-900 to-transparent opacity-80 mix-blend-multiply`} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

          {/* Content */}
          <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10">
            <div className={`transform transition-all duration-700 ${index === current ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                <div className="flex items-center gap-2 mb-2">
                    <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-md">
                        <Trophy className="text-white" size={20} />
                    </div>
                    <span className="text-brazil-yellow font-black text-xs uppercase tracking-widest">Featured</span>
                </div>
                <h2 className="text-2xl md:text-4xl font-black text-white italic tracking-tighter mb-1 leading-none shadow-black drop-shadow-lg">
                    {slide.title}
                </h2>
                <p className="text-slate-200 text-sm md:text-base font-medium max-w-md drop-shadow-md">
                    {slide.subtitle}
                </p>
            </div>
          </div>
        </div>
      ))}

      {/* Navigation Dots */}
      {slides.length > 1 && (
        <div className="absolute bottom-4 right-4 z-20 flex space-x-2">
            {slides.map((_, idx) => (
            <button
                key={idx}
                onClick={() => setCurrent(idx)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                idx === current ? 'bg-brazil-yellow w-6' : 'bg-white/50 hover:bg-white'
                }`}
            />
            ))}
        </div>
      )}
    </div>
  );
};
