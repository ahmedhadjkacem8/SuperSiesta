import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getImageUrl } from "@/utils/imageUtils";

interface HeroSlide {
  id: string;
  title: string | null;
  subtitle: string | null;
  cta_text: string | null;
  cta_link: string | null;
  image_url: string;
  mobile_image_url?: string | null;
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
  <section className="relative overflow-hidden h-[400px] sm:h-[500px] md:h-[600px] w-full">
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
        <picture>
          {slide.mobile_image_url && (
            <source
              media="(max-width: 767px)"
              srcSet={`${getImageUrl(slide.mobile_image_url)}${slide.mobile_image_url.includes('?') ? '&' : '?'}_=${Date.now()}`}
            />
          )}
          <img
            src={`${getImageUrl(slide.image_url)}${slide.image_url.includes('?') ? '&' : '?'}_=${Date.now()}`}
            alt={slide.title || ""}
            className="w-full h-full object-cover"
            loading="eager"
            {...({ fetchpriority: "high" } as any)}
          />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10 sm:bg-gradient-to-r sm:from-black/80 sm:via-black/40 sm:to-transparent md:from-black/70 md:via-black/30 md:to-transparent" />

        {/* Content */}
        <div className="absolute inset-0 z-10 flex items-end sm:items-center pb-24 sm:pb-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 w-full">
            <div className="max-w-xl md:max-w-3xl">

              {slide.title && (
                <motion.h1
                  custom={1}
                  variants={textVariants}
                  initial="hidden"
                  animate="visible"
                  className="text-2xl sm:text-4xl md:text-7xl font-black text-white leading-[1.15] sm:leading-[1.1] mb-3 sm:mb-6 drop-shadow-2xl"
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
                  className="text-white/80 mb-5 sm:mb-10 max-w-sm sm:max-w-lg text-sm sm:text-base md:text-xl leading-relaxed font-medium drop-shadow-lg line-clamp-3 sm:line-clamp-none"
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
                  className="group bg-white text-black font-black px-6 py-3.5 sm:px-10 sm:py-5 rounded-xl sm:rounded-2xl hover:bg-primary hover:text-primary-foreground transition-all duration-300 shadow-2xl flex items-center gap-2 sm:gap-3 text-xs sm:text-sm md:text-base w-fit"
                >
                  {slide.cta_text}
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform shrink-0" />
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>

    {/* Navigation Controls */}
    {slides.length > 1 && (
      <div className="absolute inset-x-0 bottom-4 sm:bottom-10 z-20 flex items-center justify-center sm:justify-between px-4 sm:px-6 md:px-12 max-w-7xl mx-auto">
        {/* Dots */}
        <div className="flex gap-2 sm:gap-3">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setDirection(i > current ? 1 : -1);
                setCurrent(i);
              }}
              aria-label={`Aller à la diapositive ${i + 1}`}
              className={`h-1.5 sm:h-2 rounded-full transition-all duration-500 shadow-lg ${
                i === current ? "bg-primary w-8 sm:w-12" : "bg-white/30 w-2 sm:w-3 hover:bg-white/50"
              }`}
            />
          ))}
        </div>

        {/* Arrows (desktop/tablette uniquement) */}
        <div className="hidden sm:flex gap-4">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={prev}
            aria-label="Diapositive précédente"
            className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3 md:p-4 hover:bg-white/20 transition-all text-white"
          >
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={next}
            aria-label="Diapositive suivante"
            className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3 md:p-4 hover:bg-white/20 transition-all text-white"
          >
            <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
          </motion.button>
        </div>
      </div>
    )}

    {/* Zones tactiles invisibles pour swipe/tap prev-next sur mobile */}
    {slides.length > 1 && (
      <div className="sm:hidden absolute inset-y-0 left-0 right-0 z-10 flex">
        <button onClick={prev} aria-label="Diapositive précédente" className="w-1/3 h-full" />
        <div className="w-1/3 h-full" />
        <button onClick={next} aria-label="Diapositive suivante" className="w-1/3 h-full" />
      </div>
    )}

    {/* Decorative Gradient Overlay at bottom */}
    <div className="absolute bottom-0 left-0 w-full h-20 sm:h-32 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none" />
  </section>
);
}
