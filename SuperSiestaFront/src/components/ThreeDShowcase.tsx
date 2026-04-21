import { motion } from "framer-motion";
import { Maximize2, Sparkles, ShieldCheck, Wind, Zap } from "lucide-react";


import LucideIcon from "@/components/common/LucideIcon";

// Déclarer l'élément personnalisé pour TypeScript
declare global {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": any;
    }
  }
}

interface FeatureBadge {
  icon: string | any;
  title: string;
  sub: string;
}

interface ThreeDShowcaseProps {
  modelPath?: string;
  poster?: string;
  features?: FeatureBadge[];
}

export default function ThreeDShowcase({ 
  modelPath = "/models/matelaTendresse.glb",
  poster = "/images/tendresse.jpg",
  features = []
}: ThreeDShowcaseProps) {
  const positions = [
    "top-[-5%] left-[10%]",
    "bottom-[10%] left-[-2%]",
    "top-[15%] right-[-5%]",
    "bottom-[-5%] right-[15%]"
  ];

  const showcaseFeatures = features.map((f, i) => ({
    icon: f.icon,
    text: f.title,
    pos: positions[i % 4],
    delay: 0.3 + (i * 0.2)
  }));

  return (
    <motion.section 
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      className="max-w-7xl mx-auto px-4 py-12 relative"
    >
      <div className="text-center mb-8">
        <motion.h2 
          initial={{ y: 10, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          className="text-2xl md:text-3xl font-black text-slate-900"
        >
          Expérience <span className="text-primary tracking-tighter">3D</span> Interactive
        </motion.h2>
      </div>

      <div className="relative max-w-4xl mx-auto">
        {/* Floating Feature Badges */}
        {showcaseFeatures.map((f, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", delay: f.delay }}
            whileHover={{ y: -5, scale: 1.05 }}
            className={`absolute z-20 ${f.pos} bg-white/90 backdrop-blur-md border border-slate-100 shadow-xl rounded-2xl px-4 py-3 flex items-center gap-3 hidden md:flex cursor-default hover:border-primary/30 transition-colors`}
          >
            <div className="p-1.5 bg-primary/10 rounded-lg">
              <LucideIcon name={f.icon} className="w-4 h-4 text-primary" />
            </div>
            <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{f.text}</span>
          </motion.div>
        ))}

        {/* Shadow effect */}
        <div className="absolute -inset-2 bg-gradient-to-tr from-primary/5 via-transparent to-secondary/5 rounded-[3rem] blur-2xl opacity-40 pointer-events-none" />
        
        <div className="relative bg-white border border-slate-100 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.08)] overflow-hidden h-[400px] md:h-[500px]">
          <model-viewer
            src={modelPath}
            poster={poster}
            alt="Modèle 3D d'un matelas Super Siesta"
            shadow-intensity="1.2"
            auto-rotate
            camera-controls
            touch-action="pan-y"
            enable-pan
            style={{ width: "100%", height: "100%", backgroundColor: "transparent" }}
            camera-orbit="45deg 75deg 105%"
            field-of-view="32deg"
            loading="eager"
            ar
            ar-modes="webxr scene-viewer quick-look"
            environment-image="neutral"
            exposure="1.2"
          >
            {/* AR Button */}
            <button 
              slot="ar-button" 
              className="absolute bottom-6 right-6 bg-primary text-primary-foreground px-5 py-2.5 rounded-2xl font-black text-xs flex items-center gap-2 shadow-2xl hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all z-10"
            >
              <Maximize2 className="w-4 h-4" /> Voir dans ma chambre
            </button>
            
            {/* Minimal interaction hint for mobile */}
            <div className="absolute bottom-6 left-6 block md:hidden pointer-events-none">
              <div className="bg-slate-900/10 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-2">
                 <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                 <span className="text-[10px] text-white font-bold">Touchez pour pivoter</span>
              </div>
            </div>
          </model-viewer>
        </div>
      </div>
      
      {/* Mobile-only features display */}
      <div className="grid grid-cols-2 gap-3 mt-6 md:hidden">
        {showcaseFeatures.map((f, i) => (
          <div key={i} className="bg-white border border-slate-100 p-3 rounded-2xl flex items-center gap-3">
             <div className="p-1.5 bg-primary/10 rounded-lg">
                <LucideIcon name={f.icon} className="w-3.5 h-3.5 text-primary" />
             </div>
             <span className="text-[10px] font-black text-slate-700 uppercase tracking-tighter leading-tight">{f.text}</span>
          </div>
        ))}
      </div>
    </motion.section>
  );
}
