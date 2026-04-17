import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CachedImage from "@/components/CachedImage";

interface HeroSlide {
  id: string;
  title: string | null;
  subtitle: string | null;
  cta_text: string | null;
  cta_link: string | null;
  image_url: string;
}

interface HeroSliderProps {
  slides: HeroSlide[];
}

export default function HeroSlider({ slides }: HeroSliderProps) {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);

  const next = useCallback(() => {
    if (slides.length === 0) return;
    setDirection(1);
    setCurrent((c) => (c + 1) % slides.length);
  }, [slides.length]);

  const prev = useCallback(() => {
    if (slides.length === 0) return;
    setDirection(-1);
    setCurrent((c) => (c - 1 + slides.length) % slides.length);
  }, [slides.length]);

  // Autoplay functionality
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [next, slides.length]);

  if (!slides || slides.length === 0) return null;

  const slide = slides[current];

  const variants: any = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
      scale: 1.1
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        x: { type: "spring", stiffness: 300, damping: 30 },
        opacity: { duration: 0.8 },
        scale: { duration: 1.2 }
      }
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
      scale: 1.1,
      transition: {
        x: { type: "spring", stiffness: 300, damping: 30 },
        opacity: { duration: 0.8 }
      }
    })
  };

  const textVariants: any = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: 0.5 + i * 0.1,
        duration: 0.8,
        ease: "easeOut"
      }
    })
  };

  return (
    <section className="relative overflow-hidden h-[450px] md:h-[600px] w-full">
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={current}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          className="absolute inset-0 w-full h-full"
        >
          <CachedImage 
            src={slide.image_url} 
            alt={slide.title || ""} 
            className="w-full h-full object-cover" 
            loading="eager"
            fetchPriority="high"
            noCache
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent md:from-black/70 md:via-black/30 md:to-transparent" />
          
          {/* Content */}
          <div className="absolute inset-0 z-10 flex items-center">
            <div className="max-w-7xl mx-auto px-6 md:px-12 w-full mt-10">
              <div className="max-w-3xl">

                {slide.title && (
                  <motion.h1 
                    custom={1}
                    variants={textVariants}
                    initial="hidden"
                    animate="visible"
                    className="text-4xl md:text-7xl font-black text-white leading-[1.1] mb-6 drop-shadow-2xl"
                  >
                    {slide.title}
                  </motion.h1>
                )}
                
                {slide.subtitle && (
                  <motion.p 
                    custom={2}
                    variants={textVariants}
                    initial="hidden"
                    animate="visible"
                    className="text-white/80 mb-10 max-w-lg text-base md:text-xl leading-relaxed font-medium drop-shadow-lg"
                  >
                    {slide.subtitle}
                  </motion.p>
                )}
                
                {slide.cta_text && slide.cta_link && (
                  <motion.button
                    custom={3}
                    variants={textVariants}
                    initial="hidden"
                    animate="visible"
                    whileHover={{ scale: 1.05, x: 5 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate(slide.cta_link!)}
                    className="group bg-white text-black font-black px-10 py-5 rounded-2xl hover:bg-primary hover:text-primary-foreground transition-all duration-300 shadow-2xl flex items-center gap-3 text-sm md:text-base"
                  >
                    {slide.cta_text}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </motion.button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Controls */}
      {slides.length > 1 && (
        <div className="absolute inset-x-0 bottom-10 z-20 flex items-center justify-between px-6 md:px-12 max-w-7xl mx-auto">
          {/* Dots */}
          <div className="flex gap-3">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setDirection(i > current ? 1 : -1);
                  setCurrent(i);
                }}
                className={`h-2 rounded-full transition-all duration-500 shadow-lg ${
                  i === current ? "bg-primary w-12" : "bg-white/30 w-3 hover:bg-white/50"
                }`}
              />
            ))}
          </div>

          {/* Arrows */}
          <div className="flex gap-4">
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={prev} 
              className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 hover:bg-white/20 transition-all text-white"
            >
              <ChevronLeft className="w-6 h-6" />
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={next} 
              className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 hover:bg-white/20 transition-all text-white"
            >
              <ChevronRight className="w-6 h-6" />
            </motion.button>
          </div>
        </div>
      )}
      
      {/* Decorative Gradient Overlay at bottom */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none" />
    </section>
  );
}
