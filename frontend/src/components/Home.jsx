import { motion } from 'framer-motion';
import { Shield, HeartPulse, Droplets, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

function FeatureCard({ title, description, icon: Icon, gradient, delay, onClick }) {
  // Use a clean white background for the inner padding-box instead of the dark #1A1A1C requested
  const cardBackground = `linear-gradient(#ffffff, #ffffff) padding-box, ${gradient} border-box`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut", delay }}
      className="relative flex flex-col justify-start items-start w-full max-w-[260px] md:max-w-[300px] group mx-auto cursor-pointer"
      onClick={onClick}
      whileHover={{ y: -5 }}
    >
      {/* Glow Background */}
      <div 
        className="absolute w-full h-[260px] md:h-[300px] opacity-40 group-hover:opacity-60 transition-opacity duration-300 rounded-[40px] pointer-events-none"
        style={{ background: gradient, filter: "blur(45px)" }}
      />
      
      {/* Foreground Card with Gradient Border */}
      <div 
        className="relative self-stretch h-[260px] md:h-[300px] rounded-[40px] z-10 overflow-hidden shadow-sm"
        style={{ 
          border: '8px solid transparent',
          background: cardBackground
        }}
      >
        <div className="w-full h-full p-7 flex flex-col justify-between">
          <div className="text-slate-700 bg-slate-50 w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner">
            <Icon size={32} strokeWidth={2.5} />
          </div>
          
          <div>
            <h3 className="text-slate-900 font-semibold text-xl mb-3 tracking-tight">{title}</h3>
            <p className="text-slate-500 text-[14px] leading-[1.6] font-normal selection:bg-rose-100">
              {description}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

const mockChartData = [
  { name: 'Donors', count: 7033, color: '#0ea5e9' }, // Blue
  { name: 'Bridges', count: 786, color: '#0d9488' }, // Teal
  { name: 'Emergencies', count: 4, color: '#e11d48' } // Crimson
];

export default function Home({ onSelectRole }) {
  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans overflow-x-hidden">
      
      {/* HackerRank-style Top Navbar */}
      <header className="w-full bg-white border-b border-slate-200 py-4 px-8 flex justify-between items-center z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-rose-600 text-white flex items-center justify-center font-bold">A</div>
          <span className="font-bold text-xl text-slate-800 tracking-tight">ARIA</span>
        </div>
        <nav className="hidden md:flex gap-6 text-sm font-semibold text-slate-500">
          <a href="#" className="hover:text-slate-900">How it Works</a>
          <a href="#" className="hover:text-slate-900">For Doctors</a>
          <a href="#" className="hover:text-slate-900">For Donors</a>
        </nav>
        <button className="text-sm font-bold text-slate-800 border border-slate-300 rounded px-4 py-2 hover:bg-slate-50">
          Sign Up
        </button>
      </header>

      {/* Hero Section (Replaces the old text block) */}
      <section className="w-full max-w-6xl mx-auto px-6 py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 leading-[1.1] mb-6 tracking-tight">
              Empowering Blood Warriors. <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-600 to-rose-400">
                Connecting Lifelines.
              </span>
            </h1>
            <p className="text-lg text-slate-600 mb-8 max-w-lg leading-relaxed">
              ARIA is the intelligent nervous system for blood donation. We automatically manage bridge teams, track cooldowns, and predict emergencies before they happen.
            </p>
            <div className="flex gap-4">
              <button className="bg-slate-900 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200">
                Get Started <ArrowRight size={18} />
              </button>
            </div>
          </motion.div>
        </div>

        {/* Data Visualization (Replaces text stats) */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          transition={{ duration: 0.8, delay: 0.2 }}
          className="bg-white rounded-[24px] border border-slate-200 shadow-xl shadow-slate-200/50 p-6 h-[350px] flex flex-col"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800">Live Network Capacity</h3>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-teal-600 bg-teal-50 px-2 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
              AI Active
            </span>
          </div>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={60}>
                  {mockChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </section>

      {/* Role Selection (Glowing Framer Motion Cards) */}
      <section className="w-full bg-white py-20 border-t border-slate-200 flex-1 flex flex-col items-center">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">Access Your Portal</h2>
          <p className="text-slate-500 max-w-xl mx-auto">
            Select your role to enter the dashboard. ARIA provides specialized tools for administrators, patients, and donors.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-3 lg:gap-8 w-full max-w-[1000px] px-6">
          <FeatureCard 
            title="Community Admin"
            description="Manage the donor fleet, oversee AI bridge assignments, and monitor critical shortage alerts."
            icon={Shield}
            delay={0.1}
            gradient="linear-gradient(137deg, #0d9488 0%, #5eead4 45%, #0ea5e9 100%)"
            onClick={() => onSelectRole('community')}
          />
          <FeatureCard 
            title="Patient Portal"
            description="Track your next transfusion dates, communicate with your bridge team, and manage records."
            icon={HeartPulse}
            delay={0.2}
            gradient="linear-gradient(137deg, #e11d48 0%, #fda4af 45%, #f43f5e 100%)"
            onClick={() => onSelectRole('patient')}
          />
          <FeatureCard 
            title="Donor Hub"
            description="Log donations, earn rewards, and pledge to become a lifeline bridge for patients in need."
            icon={Droplets}
            delay={0.3}
            gradient="linear-gradient(137deg, #f59e0b 0%, #fcd34d 45%, #fb923c 100%)"
            onClick={() => onSelectRole('donor')}
          />
        </div>
      </section>
    </div>
  );
}
