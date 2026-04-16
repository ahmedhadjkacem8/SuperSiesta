import { useEffect, useState } from "react";
import { Shield, Award, Users, Factory, Heart, Star, Layout, Loader2 } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { api } from "@/lib/apiClient";
import { motion } from "framer-motion";

interface AboutSection {
  id: number;
  type: 'standard' | 'cards' | 'stats';
  title: string | null;
  subtitle: string | null;
  description: string | null;
  image_url: string | null;
  items: any[] | null;
  sort_order: number;
}

const IconLoader = ({ name, className }: { name: string, className?: string }) => {
  const Icon = (LucideIcons as any)[name] || LucideIcons.HelpCircle;
  return <Icon className={className} />;
};

import { useAboutSections } from "@/hooks/useAboutSections";

export default function APropos() {
  const { sections, isLoading } = useAboutSections(true);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary opacity-20" />
        <p className="text-sm font-black text-primary/40 uppercase tracking-widest animate-pulse">Chargement de l'univers Super Siesta...</p>
      </div>
    );
  }

  return (
    <main className="overflow-hidden">
      {sections.map((section, idx) => {
        if (section.type === 'standard') {
          const isHero = idx === 0;
          if (isHero) {
            return (
              <section key={section.id} className="relative py-24 md:py-32 bg-accent overflow-hidden">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-primary/5 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2" />
                <div className="max-w-7xl mx-auto px-4 relative z-10">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div className="text-center lg:text-left">
                      <motion.span 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs font-bold text-primary uppercase tracking-[0.3em] bg-primary/10 px-4 py-1.5 rounded-full"
                      >
                        {section.subtitle || "À Propos"}
                      </motion.span>
                      <motion.h1 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-5xl md:text-7xl font-black mt-6 mb-8 tracking-tighter"
                      >
                        {section.title}
                      </motion.h1>
                      <motion.p 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-xl text-muted-foreground max-w-2xl mx-auto lg:mx-0 leading-relaxed"
                      >
                        {section.description}
                      </motion.p>
                    </div>
                    {section.image_url && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="relative"
                      >
                        <div className="absolute -inset-4 bg-primary/10 rounded-[3rem] blur-2xl" />
                        <img 
                          src={section.image_url} 
                          alt={section.title || ""} 
                          className="relative w-full aspect-square object-cover rounded-[3rem] shadow-2xl border-4 border-white"
                        />
                      </motion.div>
                    )}
                  </div>
                </div>
              </section>
            );
          }

          return (
            <section key={section.id} className="max-w-7xl mx-auto px-4 py-20 md:py-32">
              <div className={`grid grid-cols-1 md:grid-cols-2 gap-16 items-center ${idx % 2 === 0 ? '' : 'md:flex-row-reverse'}`}>
                <motion.div 
                   initial={{ opacity: 0, x: idx % 2 === 0 ? -30 : 30 }}
                   whileInView={{ opacity: 1, x: 0 }}
                   viewport={{ once: true }}
                   className={idx % 2 === 0 ? '' : 'md:order-2'}
                >
                  <span className="text-xs font-bold text-primary uppercase tracking-widest px-3 py-1 bg-primary/5 rounded-lg border border-primary/10">
                    {section.subtitle}
                  </span>
                  <h2 className="text-4xl md:text-5xl font-black mt-6 mb-8 tracking-tight">{section.title}</h2>
                  <div className="space-y-6 text-muted-foreground text-lg leading-relaxed whitespace-pre-line">
                    {section.description}
                  </div>
                </motion.div>
                <motion.div 
                   initial={{ opacity: 0, scale: 0.9 }}
                   whileInView={{ opacity: 1, scale: 1 }}
                   viewport={{ once: true }}
                   className={`relative ${idx % 2 === 0 ? 'md:order-2' : ''}`}
                >
                  <div className="absolute -inset-4 bg-primary/5 rounded-[3rem] blur-2xl rotate-3" />
                  <div className="relative bg-muted rounded-[3rem] overflow-hidden aspect-[4/3] shadow-2xl border-8 border-white">
                    <img src={section.image_url || "/images/tendresse.jpg"} alt={section.title || ""} className="w-full h-full object-cover" />
                  </div>
                </motion.div>
              </div>
            </section>
          );
        }

        if (section.type === 'cards') {
          return (
            <section key={section.id} className="bg-muted/30 py-24 md:py-32 border-y border-border/50">
              <div className="max-w-7xl mx-auto px-4">
                <div className="text-center mb-20">
                  <span className="text-xs font-bold text-primary uppercase tracking-[0.2em]">{section.subtitle}</span>
                  <h2 className="text-4xl md:text-5xl font-black mt-4 tracking-tight">{section.title}</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {section.items?.map((item: any, i: number) => (
                    <motion.div 
                      key={i} 
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      viewport={{ once: true }}
                      className="bg-card border border-border rounded-[2.5rem] p-10 text-center hover:shadow-2xl hover:-translate-y-2 transition-all group"
                    >
                      <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-8 group-hover:bg-primary group-hover:rotate-6 transition-all duration-500">
                        <IconLoader name={item.icon} className="w-8 h-8 text-primary group-hover:text-white transition-colors" />
                      </div>
                      <h3 className="text-xl font-black mb-4">{item.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>
          );
        }

        if (section.type === 'stats') {
          return (
            <section key={section.id} className="max-w-5xl mx-auto px-4 py-24 md:py-32 text-center">
              <div className="mb-16">
                <span className="text-xs font-bold text-primary uppercase tracking-[0.2em]">{section.subtitle}</span>
                <h2 className="text-4xl md:text-5xl font-black mt-4 tracking-tight">{section.title}</h2>
                {section.description && (
                  <p className="text-xl text-muted-foreground max-w-2xl mx-auto mt-6 leading-relaxed">
                    {section.description}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                {section.items?.map((item: any, i: number) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, scale: 0.5 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1, type: "spring" }}
                    viewport={{ once: true }}
                    className="bg-accent rounded-[2.5rem] p-12 hover:bg-primary hover:text-white transition-colors group cursor-default"
                  >
                    <p className="text-6xl font-black text-primary group-hover:text-white transition-colors mb-2 tracking-tighter">{item.num}</p>
                    <p className="text-sm font-black text-muted-foreground uppercase tracking-widest group-hover:text-white/80 transition-colors">{item.label}</p>
                  </motion.div>
                ))}
              </div>
            </section>
          );
        }

        return null;
      })}
    </main>
  );
}
