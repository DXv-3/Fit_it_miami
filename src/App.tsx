import React, { useState, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { 
  Wrench, Zap, ThermometerSnowflake, Hammer, HardHat, 
  CheckCircle, ArrowRight, ShieldCheck, Clock, Menu, X, Loader2
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import CommandPalette, { Command } from './components/CommandPalette';
import DiffModal from './components/DiffModal';

// --- Animation Tokens ---
const SPRINGS = {
  snappy: { type: "spring" as const, stiffness: 400, damping: 30 },
  fluid: { type: "spring" as const, stiffness: 100, damping: 20 },
};

export default function App() {
  const shouldReduceMotion = useReducedMotion();

  const STAGGER = {
    container: {
      hidden: { opacity: 0 },
      show: {
        opacity: 1,
        transition: { staggerChildren: 0.1, delayChildren: 0.2 }
      }
    },
    item: {
      hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 20 },
      show: { opacity: 1, y: 0, transition: SPRINGS.fluid }
    }
  };

  const elaborateCardVariants = {
    hidden: (idx: number) => ({
      opacity: 0,
      y: shouldReduceMotion ? 0 : 100,
      z: shouldReduceMotion ? 0 : -100,
      rotateX: shouldReduceMotion ? 0 : 45,
      rotateY: shouldReduceMotion ? 0 : (idx % 3 === 0 ? 20 : idx % 3 === 2 ? -20 : 0),
      scale: shouldReduceMotion ? 1 : 0.8,
      filter: shouldReduceMotion ? "none" : "blur(20px)"
    }),
    show: (idx: number) => ({
      opacity: 1,
      y: 0,
      z: 0,
      rotateX: 0,
      rotateY: 0,
      scale: 1,
      filter: "blur(0px)",
      transition: {
        type: "spring" as const,
        stiffness: 100,
        damping: 15,
        mass: 1.2,
        delay: idx * 0.15
      }
    })
  };

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    service: '', name: '', phone: '', email: '', description: ''
  });
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);

  // --- Dummy Commands for Command Palette ---
  const commands: Command[] = [
    {
      id: '1',
      title: 'Generate New Prompt with Gemini',
      category: 'AI Actions',
      shortcut: ['⌘', 'G'],
      onSelect: () => {
        const promise = new Promise((resolve) => setTimeout(resolve, 2000));
        toast.promise(promise, {
          loading: 'Generating prompt...',
          success: 'Prompt generated successfully!',
          error: 'Failed to generate prompt.',
        });
        return promise;
      }
    },
    {
      id: '2',
      title: 'Refactor Selected Code',
      category: 'AI Actions',
      shortcut: ['⌘', '⇧', 'R'],
      onSelect: () => {
        const promise = new Promise((resolve) => setTimeout(resolve, 1500));
        toast.promise(promise, {
          loading: 'Analyzing code...',
          success: 'Refactoring suggestions ready.',
          error: 'Failed to analyze code.',
        });
        promise.then(() => setIsDiffModalOpen(true));
        return promise;
      }
    },
    {
      id: '3',
      title: 'Deploy to Vercel',
      category: 'System',
      shortcut: ['⌘', 'D'],
      onSelect: () => {
        const promise = new Promise((resolve) => setTimeout(resolve, 4000));
        toast.promise(promise, {
          loading: 'Deploying to Vercel...',
          success: 'Deployed successfully!',
          error: 'Failed to deploy.',
        });
        return promise;
      }
    },
    {
      id: '4',
      title: 'Toggle Dark Mode',
      category: 'Preferences',
      shortcut: ['⌘', 'K', 'D'],
      onSelect: () => {
        toast.success('Dark mode toggled!');
      }
    }
  ];

  // --- Apple-Level Scroll Animation Hooks ---
  const heroContainerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroContainerRef,
    offset: ["start start", "end start"]
  });

  // Scrub values based on scroll progress
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.85]);
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const heroBlur = useTransform(scrollYProgress, [0, 1], ["blur(0px)", "blur(12px)"]);
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "15%"]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      setFormData({ service: '', name: '', phone: '', email: '', description: '' });
    }, 5000);
  };

  const services = [
    { icon: <Wrench className="w-6 h-6 text-cyan-400" />, title: 'Plumbing', desc: 'Leaks, clogs, water heaters, pipe repairs.' },
    { icon: <Zap className="w-6 h-6 text-cyan-400" />, title: 'Electrical', desc: 'Outlets, wiring, panel upgrades, lighting.' },
    { icon: <ThermometerSnowflake className="w-6 h-6 text-cyan-400" />, title: 'AC Repair', desc: 'Not cooling, strange noises, maintenance.' },
    { icon: <Hammer className="w-6 h-6 text-cyan-400" />, title: 'Handyman', desc: 'Drywall, painting, furniture assembly.' },
    { icon: <HardHat className="w-6 h-6 text-cyan-400" />, title: 'Contractors', desc: 'Kitchen & bath remodels, additions, roofing.' },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-white selection:bg-cyan-500/30 relative">
      <Toaster theme="dark" position="bottom-right" />
      <CommandPalette 
        isOpen={isCommandPaletteOpen} 
        setIsOpen={setIsCommandPaletteOpen} 
        commands={commands} 
      />
      <DiffModal 
        isOpen={isDiffModalOpen} 
        onClose={() => setIsDiffModalOpen(false)} 
        onAccept={() => {
          setIsDiffModalOpen(false);
          toast.success('Changes applied successfully.');
        }} 
      />
      {/* Global Noise Texture */}
      <div className="fixed inset-0 bg-noise z-50 pointer-events-none"></div>

      {/* Navigation */}
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={SPRINGS.fluid}
        className="fixed top-0 left-0 right-0 z-40 glass-panel border-b-0 border-white/5"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex items-center gap-3">
              <div className="bg-cyan-500/10 p-2 rounded-xl border border-cyan-500/20">
                <Wrench className="h-6 w-6 text-cyan-400" />
              </div>
              <span className="font-display font-bold text-2xl tracking-tight text-white">
                FixIt<span className="text-cyan-400">Miami</span>
              </span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#services" className="text-sm font-medium text-slate-400 hover:text-cyan-400 transition-colors">Services</a>
              <a href="#how-it-works" className="text-sm font-medium text-slate-400 hover:text-cyan-400 transition-colors">How it Works</a>
              <motion.a 
                whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(0,229,255,0.3)" }}
                whileTap={{ scale: 0.95 }}
                href="#quote" 
                className="bg-cyan-500/10 border border-cyan-500/50 text-cyan-400 px-6 py-2.5 rounded-full font-medium text-sm transition-colors hover:bg-cyan-500/20"
              >
                Get Free Quote
              </motion.a>
            </div>
            <div className="flex items-center md:hidden">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-slate-400 hover:text-white">
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section - Wrapped in a scroll-tracking container */}
      <div ref={heroContainerRef} className="relative h-[150vh]">
        <motion.section 
          style={{
            scale: shouldReduceMotion ? 1 : heroScale,
            opacity: heroOpacity,
            filter: shouldReduceMotion ? "none" : heroBlur,
            y: shouldReduceMotion ? 0 : heroY,
          }}
          className="sticky top-0 pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden min-h-screen flex items-center origin-top"
        >
          {/* Ambient Glows */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-500/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-magenta-glow/10 rounded-full blur-[150px] pointer-events-none mix-blend-screen"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="lg:grid lg:grid-cols-12 lg:gap-16 items-center">
            
            {/* Hero Copy */}
            <motion.div 
              variants={STAGGER}
              initial="hidden"
              animate="show"
              className="lg:col-span-6 text-center lg:text-left mb-16 lg:mb-0"
            >
              <motion.div variants={STAGGER.item} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-cyan-400 font-medium text-xs uppercase tracking-widest mb-8 backdrop-blur-md">
                <motion.div 
                  animate={{ opacity: [1, 0.4, 1], scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(0,229,255,0.8)]"
                ></motion.div>
                Live in Miami-Dade
              </motion.div>
              
              <motion.h1 variants={STAGGER.item} className="text-5xl sm:text-6xl lg:text-7xl font-display font-bold text-white tracking-tight leading-[1.05] mb-6">
                Civic Repair, <br/>
                <motion.span 
                  animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                  className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-400 bg-[length:200%_auto]"
                >
                  Reimagined.
                </motion.span>
              </motion.h1>
              
              <motion.p variants={STAGGER.item} className="text-lg sm:text-xl text-slate-400 mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-light">
                Report infrastructure issues instantly. We connect you with vetted city pros to fix plumbing, electrical, and structural hazards. Zero friction.
              </motion.p>
              
              <motion.div variants={STAGGER.item} className="flex flex-col sm:flex-row gap-6 justify-center lg:justify-start">
                <div className="flex items-center gap-3 text-slate-300">
                  <ShieldCheck className="w-5 h-5 text-cyan-400" />
                  <span className="font-medium text-sm tracking-wide">Vetted Experts</span>
                </div>
                <div className="flex items-center gap-3 text-slate-300">
                  <Clock className="w-5 h-5 text-magenta-glow" />
                  <span className="font-medium text-sm tracking-wide">Rapid Response</span>
                </div>
              </motion.div>
            </motion.div>

            {/* Hero Form (Glassmorphic) */}
            <motion.div 
              initial={{ opacity: 0, x: 40, rotateY: 10 }}
              animate={{ opacity: 1, x: 0, rotateY: 0 }}
              transition={{ ...SPRINGS.fluid, delay: 0.4 }}
              style={{ perspective: 1000 }}
              className="lg:col-span-6" id="quote"
            >
              <div className="glass-panel rounded-3xl p-8 relative overflow-hidden shadow-2xl shadow-cyan-900/20">
                <motion.div 
                  animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 via-magenta-glow to-cyan-400 bg-[length:200%_auto]"
                ></motion.div>
                
                <AnimatePresence mode="wait">
                  {isSubmitted ? (
                    <motion.div 
                      key="success"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="text-center py-16"
                    >
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={SPRINGS.snappy}
                        className="w-20 h-20 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-cyan-500/30"
                      >
                        <CheckCircle className="w-10 h-10 text-cyan-400" />
                      </motion.div>
                      <h3 className="text-3xl font-display font-bold text-white mb-3">Request Secured</h3>
                      <p className="text-slate-400">A vetted Miami pro is reviewing your issue and will contact you shortly.</p>
                    </motion.div>
                  ) : (
                    <motion.form 
                      key="form"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onSubmit={handleSubmit} 
                      className="space-y-5"
                    >
                      <div>
                        <h2 className="text-2xl font-display font-bold text-white mb-1">Initialize Request</h2>
                        <p className="text-slate-400 text-sm mb-6">Enter details below to dispatch a professional.</p>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="relative">
                          <select 
                            name="service" required value={formData.service} onChange={handleInputChange}
                            className="w-full glass-input rounded-xl px-4 py-3.5 text-sm appearance-none"
                          >
                            <option value="" disabled className="bg-[#121216]">Select Service Category</option>
                            <option value="plumbing" className="bg-[#121216]">Plumbing & Water</option>
                            <option value="electrical" className="bg-[#121216]">Electrical & Grid</option>
                            <option value="ac" className="bg-[#121216]">HVAC & Cooling</option>
                            <option value="contractor" className="bg-[#121216]">Structural & Concrete</option>
                          </select>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <input 
                            type="text" name="name" required value={formData.name} onChange={handleInputChange}
                            className="w-full glass-input rounded-xl px-4 py-3.5 text-sm placeholder:text-slate-500"
                            placeholder="Full Name"
                          />
                          <input 
                            type="tel" name="phone" required value={formData.phone} onChange={handleInputChange}
                            className="w-full glass-input rounded-xl px-4 py-3.5 text-sm placeholder:text-slate-500"
                            placeholder="Phone Number"
                          />
                        </div>

                        <textarea 
                          name="description" rows={3} required value={formData.description} onChange={handleInputChange}
                          className="w-full glass-input rounded-xl px-4 py-3.5 text-sm placeholder:text-slate-500 resize-none"
                          placeholder="Describe the issue (e.g., Pothole on Brickell Ave)..."
                        ></textarea>
                      </div>

                      <motion.button 
                        whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(0,229,255,0.4)" }}
                        whileTap={{ scale: 0.98 }}
                        type="submit" 
                        className="w-full bg-cyan-400 text-[#0A0A0C] font-bold py-4 px-4 rounded-xl transition-all flex items-center justify-center gap-2 mt-4"
                      >
                        <span>Dispatch Professional</span>
                        <ArrowRight className="w-5 h-5" />
                      </motion.button>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </div>
        </motion.section>
      </div>

      {/* Services Grid (Scroll Animations) */}
      <section id="services" className="py-24 relative z-20 border-t border-white/5 bg-[#0A0A0C] shadow-[0_-20px_50px_rgba(0,0,0,0.8)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={SPRINGS.fluid}
            className="mb-16"
          >
            <h2 className="text-cyan-400 font-medium tracking-widest uppercase text-xs mb-3 flex items-center gap-2">
              <div className="w-8 h-px bg-cyan-400"></div> Infrastructure Capabilities
            </h2>
            <h3 className="text-4xl sm:text-5xl font-display font-bold text-white">Comprehensive Coverage.</h3>
          </motion.div>

          <motion.div 
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            style={{ perspective: 1200 }}
          >
            {services.map((service, idx) => (
              <motion.div 
                key={idx} 
                custom={idx}
                variants={elaborateCardVariants}
                whileHover={{ 
                  y: shouldReduceMotion ? 0 : -10, 
                  scale: shouldReduceMotion ? 1 : 1.02,
                  rotateX: shouldReduceMotion ? 0 : 5,
                  rotateY: shouldReduceMotion ? 0 : -5,
                  borderColor: "rgba(0,229,255,0.4)", 
                  backgroundColor: "rgba(18,18,22,0.9)",
                  boxShadow: "0 20px 40px -10px rgba(0,229,255,0.15)"
                }}
                className="glass-panel rounded-2xl p-8 transition-all duration-300 group cursor-default relative overflow-hidden"
              >
                {/* Sweeping Glare Effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transform -translate-x-full group-hover:translate-x-full transition-all duration-1000 ease-in-out pointer-events-none"></div>
                
                <div className="bg-white/5 w-14 h-14 rounded-xl flex items-center justify-center mb-6 border border-white/10 group-hover:border-cyan-500/50 group-hover:shadow-[0_0_15px_rgba(0,229,255,0.3)] transition-all duration-300 relative z-10">
                  {service.icon}
                </div>
                <h4 className="text-xl font-display font-bold text-white mb-3 group-hover:text-cyan-300 transition-colors relative z-10">{service.title}</h4>
                <p className="text-slate-400 text-sm leading-relaxed group-hover:text-slate-300 transition-colors relative z-10">{service.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#0A0A0C] py-12 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-cyan-400" />
            <span className="font-display font-bold text-lg tracking-tight text-white">FixIt<span className="text-cyan-400">Miami</span></span>
          </div>
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} FixIt Miami. Civic Infrastructure Protocol.
          </p>
        </div>
      </footer>
    </div>
  );
}
